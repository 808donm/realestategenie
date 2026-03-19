import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  RentcastClient,
  mapAttomParamsToRentcast, mapRentcastToAttomShape,
} from "@/lib/integrations/rentcast-client";
import {
  mapAttomParamsToRealie, mapRealieToAttomShape,
} from "@/lib/integrations/realie-client";
import {
  getConfiguredRentcastClient,
  getConfiguredRealieClient,
} from "@/lib/integrations/property-data-service";
import {
  buildPropertyCacheKey, propertyCacheGet, propertyCacheSet,
  propertyDbRead, propertyDbWrite,
} from "@/lib/integrations/property-data-cache";
import { getNeighborhoodProfile } from "@/lib/integrations/free-data/neighborhood-profile-service";
import { getSalesTrends } from "@/lib/integrations/free-data/fred-trends-client";
import { searchSchoolsByLocation, searchSchoolsByZip } from "@/lib/integrations/free-data/nces-schools-client";
import { getHazardRiskProfile } from "@/lib/integrations/free-data/usgs-hazards-client";
import { searchPOI } from "@/lib/integrations/free-data/osm-poi-client";
import { getCrimeIndicesByState, getCrimeIndicesByFips } from "@/lib/integrations/free-data/fbi-crime-client";
import { getCountyByZip } from "@/lib/hawaii-zip-county";
import { NON_DISCLOSURE_STATES, isNonDisclosureState } from "@/lib/constants/non-disclosure-states";
import { analyzeComparables, CompProperty } from "@/lib/ai/comp-genie";

// Hawaii county name → FIPS code mapping
const HAWAII_COUNTY_FIPS: Record<string, string> = {
  HONOLULU: "15003",
  HAWAII: "15001",
  MAUI: "15009",
  KAUAI: "15007",
};

// Resolve county FIPS from zip code when not provided directly.
// For Hawaii zips, uses our local mapping. For mainland, derives state from zip prefix.
function resolveCountyFipsFromZip(postalCode: string | undefined): { fips?: string; state?: string } {
  if (!postalCode) return {};
  const zip = postalCode.trim().slice(0, 5);

  // Hawaii zips: precise county-level resolution
  const hiCounty = getCountyByZip(zip);
  if (hiCounty) {
    return { fips: HAWAII_COUNTY_FIPS[hiCounty], state: "HI" };
  }

  // Mainland: derive state from zip prefix for state-level fallback
  // ZIP code prefix ranges → state abbreviation (covers all US states)
  const prefix = parseInt(zip.slice(0, 3));
  const stateFromZip = resolveStateFromZipPrefix(prefix);
  return stateFromZip ? { state: stateFromZip } : {};
}

function resolveStateFromZipPrefix(prefix: number): string | null {
  if (prefix >= 995 && prefix <= 999) return "AK";
  if (prefix >= 967 && prefix <= 968) return "HI";
  if (prefix >= 970 && prefix <= 979) return "OR";
  if (prefix >= 980 && prefix <= 994) return "WA";
  if (prefix >= 900 && prefix <= 966) return "CA";
  if (prefix >= 889 && prefix <= 898) return "NV";
  if (prefix >= 840 && prefix <= 847) return "UT";
  if (prefix >= 832 && prefix <= 838) return "ID";
  if (prefix >= 820 && prefix <= 831) return "WY";
  if (prefix >= 800 && prefix <= 816) return "CO";
  if (prefix >= 870 && prefix <= 884) return "NM";
  if (prefix >= 850 && prefix <= 865) return "AZ";
  if (prefix >= 590 && prefix <= 599) return "MT";
  if (prefix >= 570 && prefix <= 577) return "SD";
  if (prefix >= 580 && prefix <= 588) return "ND";
  if (prefix >= 680 && prefix <= 693) return "NE";
  if (prefix >= 660 && prefix <= 679) return "KS";
  if (prefix >= 730 && prefix <= 749) return "OK";
  if (prefix >= 750 && prefix <= 799) return "TX";
  if (prefix >= 700 && prefix <= 714) return "LA";
  if (prefix >= 716 && prefix <= 729) return "LA";
  if (prefix === 715) return "LA";
  if (prefix >= 386 && prefix <= 397) return "MS";
  if (prefix >= 350 && prefix <= 369) return "AL";
  if (prefix >= 370 && prefix <= 385) return "TN";
  if (prefix >= 400 && prefix <= 427) return "KY";
  if (prefix >= 430 && prefix <= 459) return "OH";
  if (prefix >= 460 && prefix <= 479) return "IN";
  if (prefix >= 480 && prefix <= 499) return "MI";
  if (prefix >= 500 && prefix <= 528) return "IA";
  if (prefix >= 530 && prefix <= 549) return "WI";
  if (prefix >= 550 && prefix <= 567) return "MN";
  if (prefix >= 600 && prefix <= 629) return "IL";
  if (prefix >= 630 && prefix <= 658) return "MO";
  if (prefix >= 716 && prefix <= 729) return "AR";
  if (prefix >= 300 && prefix <= 319) return "GA";
  if (prefix >= 320 && prefix <= 349) return "FL";
  if (prefix >= 247 && prefix <= 268) return "WV";
  if (prefix >= 220 && prefix <= 246) return "VA";
  if (prefix >= 270 && prefix <= 289) return "NC";
  if (prefix >= 290 && prefix <= 299) return "SC";
  if (prefix >= 200 && prefix <= 205) return "DC";
  if (prefix >= 206 && prefix <= 219) return "MD";
  if (prefix >= 197 && prefix <= 199) return "DE";
  if (prefix >= 150 && prefix <= 196) return "PA";
  if (prefix >= 70 && prefix <= 89) return "NJ";
  if (prefix >= 100 && prefix <= 149) return "NY";
  if (prefix >= 60 && prefix <= 69) return "CT";
  if (prefix >= 28 && prefix <= 29) return "RI";
  if (prefix >= 10 && prefix <= 27) return "MA";
  if (prefix >= 30 && prefix <= 38) return "NH";
  if (prefix >= 39 && prefix <= 49) return "ME";
  if (prefix >= 50 && prefix <= 59) return "VT";
  if (prefix >= 6 && prefix <= 9) return "PR";
  return null;
}

// ── Free data endpoints (served by free public APIs) ─────────────────────
const FREE_DATA_ENDPOINTS = new Set([
  "neighborhood", "community", "poi", "poicategories",
  "schools", "schooldistrict", "schoolprofile",
  "hazardrisk", "climaterisk", "riskprofile",
  "salestrend", "transactionsalestrend", "marketanalytics",
]);

// ── RentCast-capable endpoints (property data from RentCast) ────────────
const RENTCAST_CAPABLE_ENDPOINTS = new Set([
  "expanded", "detail", "detailowner", "detailmortgage",
  "detailmortgageowner", "detailwithschools", "profile", "snapshot", "id",
  "assessment", "assessmentsnapshot", "assessmenthistory",
  "sale", "salesnapshot",
  "avm", "attomavm", "avmhistory",
  "parcelboundary",
  "comparables",
  // Rental AVM: uses HUD Fair Market Rents (via federal-data endpoint)
  "rentalavm",
  // Home equity: computed from RentCast AVM data
  "homeequity",
  // Pre-foreclosure
  "preforeclosure",
]);

// Client helpers are imported from the shared property-data-service
// (getConfiguredRentcastClient, getConfiguredRealieClient)
// so that all routes use the same client initialization logic.

/**
 * Fetch property data from Realie, mapped to ATTOM-compatible shape.
 */
async function fetchFromRealie(
  endpoint: string,
  params: Record<string, any>
): Promise<any | null> {
  const realieParams = mapAttomParamsToRealie(endpoint, params);
  if (!realieParams) {
    return null;
  }

  const client = await getConfiguredRealieClient();
  if (!client) {
    return null;
  }

  try {
    let response;

    if (endpoint === "comparables" && realieParams.latitude && realieParams.longitude) {
      response = await client.getComparables({
        latitude: realieParams.latitude,
        longitude: realieParams.longitude,
        radius: realieParams.radius,
        timeFrame: realieParams.timeFrame,
        maxResults: realieParams.maxResults,
      });
    } else if (realieParams.address || (realieParams.state && realieParams.address)) {
      response = await client.searchByAddress({
        address: realieParams.address,
        state: realieParams.state,
        city: realieParams.city,
        zip: realieParams.zipCode || realieParams.zip,
        limit: realieParams.limit,
        page: realieParams.page,
      });
    } else if (realieParams.latitude && realieParams.longitude) {
      response = await client.searchByRadius({
        latitude: realieParams.latitude,
        longitude: realieParams.longitude,
        radius: realieParams.radius || 2,
        limit: realieParams.limit,
        page: realieParams.page,
        property_type: realieParams.property_type,
        residential: realieParams.residential,
      });
    } else if (realieParams.zipCode || realieParams.zip) {
      response = await client.searchByZip(realieParams);
    } else {
      return null;
    }

    if (!response?.properties?.length) {
      console.log(`[Realie] No results for ${endpoint}`);
      return null;
    }

    const properties = response.properties.map(mapRealieToAttomShape);
    console.log(`[Realie] Got ${properties.length} properties for ${endpoint}`);

    return {
      status: {
        version: "realie-v1",
        code: 0,
        msg: "Success",
        total: properties.length,
      },
      property: properties,
    };
  } catch (error: any) {
    console.warn(`[Realie] Error fetching ${endpoint}: ${error?.message || error}`);
    return null;
  }
}

/**
 * Deep-merge Realie supplementary data into RentCast property records.
 * Realie fills gaps that RentCast doesn't provide: AVM estimates, equity/LTV,
 * mortgage/liens, foreclosure status, parcel boundaries, and owner portfolio data.
 *
 * Matching strategy: normalize addresses to find corresponding records.
 */
function mergePropertyData(
  rentcastProps: any[],
  realieProps: any[]
): any[] {
  if (!realieProps?.length) return rentcastProps;
  if (!rentcastProps?.length) return realieProps;

  // Build a lookup index from Realie properties by normalized address
  const normalizeAddr = (addr: string) =>
    addr?.toLowerCase()
      .replace(/\b(apt|unit|ste|suite|#)\s*\S*/gi, "")
      .replace(/[^a-z0-9]/g, "")
      .trim() || "";

  const realieByAddr = new Map<string, any>();
  for (const rp of realieProps) {
    const addr = rp.address?.oneLine || rp.address?.line1;
    if (addr) {
      realieByAddr.set(normalizeAddr(addr), rp);
    }
  }

  return rentcastProps.map((rcProp) => {
    const addr = rcProp.address?.oneLine || rcProp.address?.line1;
    const key = addr ? normalizeAddr(addr) : "";
    const realieProp = key ? realieByAddr.get(key) : undefined;

    if (!realieProp) return rcProp;

    // Deep-merge: Realie fills gaps in RentCast data
    const merged = { ...rcProp };

    // AVM — pick the most reasonable estimate by comparing to assessed value.
    // Assessed value is set by the county and is a reliable anchor. Whichever
    // AVM is closer to assessed value is likely more accurate. When MLS data
    // is available it will supersede both.
    const rcAvm = merged.avm?.amount?.value;
    const realieAvm = realieProp.avm?.amount?.value;
    if (realieAvm || rcAvm) {
      const rcHasRange = merged.avm?.amount?.high && merged.avm?.amount?.low;
      const realieHasRange = realieProp.avm?.amount?.high && realieProp.avm?.amount?.low;

      // Get the best assessed/market value as our anchor
      const assessedValue =
        merged.assessment?.assessed?.assdTtlValue ||
        realieProp.assessment?.assessed?.assdTtlValue ||
        merged.assessment?.market?.mktTtlValue ||
        realieProp.assessment?.market?.mktTtlValue;

      if (!rcAvm && realieAvm) {
        // Only Realie has an AVM
        merged.avm = realieProp.avm;
      } else if (rcAvm && !realieAvm) {
        // Only RentCast has an AVM — keep it (already set)
      } else if (!rcHasRange && realieHasRange) {
        // RentCast AVM is just lastSalePrice (no range) — prefer Realie's model
        merged.avm = realieProp.avm;
      } else if (rcAvm && realieAvm && rcHasRange && realieHasRange && assessedValue) {
        // Both have real AVMs with ranges — use assessed value as sanity check.
        // Pick whichever AVM is closer to the assessed value (ratio closer to 1.0).
        const rcRatio = rcAvm / assessedValue;
        const realieRatio = realieAvm / assessedValue;
        // Deviation from 1.0 — lower is better (AVM closer to assessed)
        const rcDev = Math.abs(Math.log(rcRatio));
        const realieDev = Math.abs(Math.log(realieRatio));

        const chosenSource = realieDev <= rcDev ? "realie" : "rentcast";
        const chosen = chosenSource === "realie" ? realieProp.avm : merged.avm;
        merged.avm = {
          ...chosen,
          _avmSources: {
            chosen: chosenSource,
            assessedValue,
            rentcast: { value: rcAvm, low: merged.avm.amount.low, high: merged.avm.amount.high },
            realie: { value: realieAvm, low: realieProp.avm.amount.low, high: realieProp.avm.amount.high },
          },
        };
        console.log(
          `[Merge] AVM: chose ${chosenSource} ($${chosen.amount.value.toLocaleString()}) ` +
          `over ${chosenSource === "realie" ? "rentcast" : "realie"} — ` +
          `assessed: $${assessedValue.toLocaleString()}, ` +
          `RC ratio: ${rcRatio.toFixed(2)}, Realie ratio: ${realieRatio.toFixed(2)}`
        );
      } else if (rcAvm && realieAvm && rcHasRange && realieHasRange) {
        // Both have ranges but no assessed value — average them
        merged.avm = {
          amount: {
            value: Math.round((rcAvm + realieAvm) / 2),
            low: Math.round((merged.avm.amount.low + realieProp.avm.amount.low) / 2),
            high: Math.round((merged.avm.amount.high + realieProp.avm.amount.high) / 2),
          },
          _avmSources: {
            chosen: "average",
            rentcast: { value: rcAvm, low: merged.avm.amount.low, high: merged.avm.amount.high },
            realie: { value: realieAvm, low: realieProp.avm.amount.low, high: realieProp.avm.amount.high },
          },
        };
      }
      // else: RentCast has range but Realie doesn't — keep RentCast (already set)
    }

    // Home Equity — ALWAYS prefer Realie's equity data. RentCast computes equity
    // as AVM - lastSalePrice which is meaningless (e.g. $100K - $100K = $0).
    // Realie provides actual equity estimates based on current AVM vs liens.
    if (realieProp.homeEquity) {
      merged.homeEquity = realieProp.homeEquity;
    }

    // Mortgage / Liens — RentCast has none, Realie provides lien data
    if (!merged.mortgage?.amount && realieProp.mortgage) {
      merged.mortgage = { ...merged.mortgage, ...realieProp.mortgage };
    }

    // Foreclosure — RentCast has none, Realie provides foreclosure status
    if (!merged.foreclosure && realieProp.foreclosure) {
      merged.foreclosure = realieProp.foreclosure;
    }

    // Parcel boundary — RentCast has none, Realie provides geometry
    if (!merged.parcelBoundary && realieProp.parcelBoundary) {
      merged.parcelBoundary = realieProp.parcelBoundary;
    }

    // Owner portfolio counts — RentCast lacks these investor signals
    if (realieProp.owner) {
      merged.owner = merged.owner || {};
      if (merged.owner.ownerParcelCount == null && realieProp.owner.ownerParcelCount != null) {
        merged.owner.ownerParcelCount = realieProp.owner.ownerParcelCount;
      }
      if (merged.owner.ownerResCount == null && realieProp.owner.ownerResCount != null) {
        merged.owner.ownerResCount = realieProp.owner.ownerResCount;
      }
      if (merged.owner.ownerComCount == null && realieProp.owner.ownerComCount != null) {
        merged.owner.ownerComCount = realieProp.owner.ownerComCount;
      }
    }

    // Assessment — Realie provides building/land breakdown that RentCast lacks
    if (merged.assessment?.assessed && realieProp.assessment?.assessed) {
      if (!merged.assessment.assessed.assdImprValue && realieProp.assessment.assessed.assdImprValue) {
        merged.assessment.assessed.assdImprValue = realieProp.assessment.assessed.assdImprValue;
      }
      if (!merged.assessment.assessed.assdLandValue && realieProp.assessment.assessed.assdLandValue) {
        merged.assessment.assessed.assdLandValue = realieProp.assessment.assessed.assdLandValue;
      }
    }
    // Market values — ALWAYS prefer Realie's market values when available.
    // RentCast sets mktTtlValue to lastSalePrice (stale), Realie uses actual
    // county-assessed market values which are far more accurate.
    if (realieProp.assessment?.market) {
      merged.assessment = merged.assessment || {};
      merged.assessment.market = {
        ...merged.assessment.market,
        ...realieProp.assessment.market,
      };
    }

    // Assessment history — prefer Realie's richer history if RentCast has none
    if (!merged.assessmenthistory?.length && realieProp.assessmenthistory?.length) {
      merged.assessmenthistory = realieProp.assessmenthistory;
    }

    // Mark as merged source
    merged._source = "merged";
    merged._sources = ["rentcast", "realie"];

    return merged;
  });
}

/**
 * Fetch property data from RentCast, mapped to ATTOM-compatible shape.
 */
async function fetchFromRentcast(
  endpoint: string,
  params: Record<string, any>
): Promise<any | null> {
  const rentcastParams = mapAttomParamsToRentcast(endpoint, params);
  if (!rentcastParams) {
    console.log(`[Rentcast] Endpoint "${endpoint}" not mappable — skipping`);
    return null;
  }

  const client = await getConfiguredRentcastClient();
  if (!client) {
    console.warn(`[Rentcast] No RentCast client available (API key not configured?)`);
    return null;
  }

  try {
    let properties: any[] = [];

    if (endpoint === "comparables" && rentcastParams.latitude && rentcastParams.longitude) {
      // Use AVM endpoint which returns comparables
      const result = await client.getValueEstimate({
        latitude: rentcastParams.latitude,
        longitude: rentcastParams.longitude,
        compCount: 15,
      });
      // Map comparables to ATTOM shape
      if (result.comparables) {
        properties = result.comparables.map((comp) => ({
          identifier: { obPropId: comp.id, attomId: hashStringToNumberUtil(comp.id) },
          address: {
            oneLine: comp.formattedAddress,
            line1: comp.addressLine1,
            locality: comp.city,
            countrySubd: comp.state,
            postal1: comp.zipCode,
          },
          location: { latitude: String(comp.latitude), longitude: String(comp.longitude) },
          building: {
            size: { livingSize: comp.squareFootage, universalSize: comp.squareFootage },
            rooms: { beds: comp.bedrooms, bathsTotal: comp.bathrooms },
            summary: { yearBuilt: comp.yearBuilt },
          },
          lot: { lotSize1: comp.lotSize },
          summary: { propType: comp.propertyType, yearBuilt: comp.yearBuilt },
          sale: {
            amount: { saleAmt: comp.price, saleTransDate: comp.listedDate },
          },
          avm: { amount: { value: comp.price } },
          _compDistance: comp.distance,
          _compCorrelation: comp.correlation,
          _compDaysOnMarket: comp.daysOnMarket,
          _source: "rentcast",
        }));
      }
    } else if (endpoint === "salesnapshot" && rentcastParams.saleDateRange) {
      // Sale snapshot — search for recent sales using sale listings endpoint
      const results = await client.getSaleListings({
        zipCode: rentcastParams.zipCode,
        latitude: rentcastParams.latitude,
        longitude: rentcastParams.longitude,
        radius: rentcastParams.radius,
        propertyType: rentcastParams.propertyType,
        status: "Inactive",
        limit: rentcastParams.limit || 50,
        offset: rentcastParams.offset,
      });
      properties = results.map((listing) => ({
        identifier: { obPropId: listing.id, attomId: hashStringToNumberUtil(listing.id) },
        address: {
          oneLine: listing.formattedAddress,
          line1: listing.addressLine1,
          locality: listing.city,
          countrySubd: listing.state,
          postal1: listing.zipCode,
        },
        location: { latitude: String(listing.latitude), longitude: String(listing.longitude) },
        building: {
          size: { livingSize: listing.squareFootage, universalSize: listing.squareFootage },
          rooms: { beds: listing.bedrooms, bathsTotal: listing.bathrooms },
          summary: { yearBuilt: listing.yearBuilt },
        },
        lot: { lotSize1: listing.lotSize },
        summary: { propType: listing.propertyType, yearBuilt: listing.yearBuilt },
        sale: {
          amount: {
            saleAmt: listing.price,
            saleTransDate: listing.removedDate || listing.listedDate,
            saleRecDate: listing.removedDate || listing.listedDate,
          },
        },
        avm: { amount: { value: listing.price } },
        _source: "rentcast",
      }));
    } else {
      // Standard property search
      const results = await client.searchProperties(rentcastParams);
      properties = results.map(mapRentcastToAttomShape);

      // For single-address lookups (1-3 results), enrich with real AVM from
      // RentCast's /avm/value endpoint. The searchProperties endpoint only
      // returns lastSalePrice as a proxy, which can be decades stale.
      const isSingleAddressLookup = properties.length <= 3 && rentcastParams.address;
      if (isSingleAddressLookup) {
        try {
          const avmResult = await client.getValueEstimate({
            address: rentcastParams.address,
            latitude: rentcastParams.latitude,
            longitude: rentcastParams.longitude,
            compCount: 5,
          });
          if (avmResult?.price) {
            // Apply the real AVM to the first (best-match) property
            properties[0] = {
              ...properties[0],
              avm: {
                amount: {
                  value: avmResult.price,
                  low: avmResult.priceRangeLow,
                  high: avmResult.priceRangeHigh,
                },
              },
            };
            console.log(`[Rentcast] Enriched AVM: $${avmResult.price.toLocaleString()} (${avmResult.priceRangeLow?.toLocaleString()} - ${avmResult.priceRangeHigh?.toLocaleString()})`);
          }
        } catch (avmErr: any) {
          console.warn(`[Rentcast] AVM enrichment failed (non-fatal): ${avmErr?.message}`);
        }
      }
    }

    if (properties.length === 0) {
      console.log(`[Rentcast] No results for ${endpoint}`);
      return null;
    }

    console.log(`[Rentcast] Got ${properties.length} properties for ${endpoint}`);

    return {
      status: {
        version: "rentcast-v1",
        code: 0,
        msg: "Success",
        total: properties.length,
        page: rentcastParams.offset ? Math.floor(rentcastParams.offset / (rentcastParams.limit || 25)) + 1 : 1,
        pagesize: rentcastParams.limit || properties.length,
      },
      property: properties,
    };
  } catch (error) {
    console.error(`[Rentcast] Error fetching ${endpoint}:`, error);
    return null;
  }
}

/** Utility: generate a stable numeric hash from a string ID */
function hashStringToNumberUtil(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Handle free data endpoints (neighborhood, schools, hazards, trends, etc.)
 * These use free public APIs instead of ATTOM.
 */
async function fetchFromFreeData(
  endpoint: string,
  params: Record<string, any>
): Promise<any> {
  const lat = params.latitude;
  const lng = params.longitude;
  const postalCode = params.postalcode || params.postalCode;
  const state = params.address2?.match(/\b([A-Z]{2})\b/)?.[1]
    || params.address?.match(/,\s*([A-Z]{2})\s*\d{0,5}\s*$/)?.[1];
  const fips = params.fips;

  switch (endpoint) {
    case "neighborhood": {
      const profile = await getNeighborhoodProfile({
        latitude: lat,
        longitude: lng,
        postalCode,
        state,
        fips,
        address1: params.address1,
        address2: params.address2,
      });
      return profile;
    }

    case "community": {
      const crime = fips
        ? await getCrimeIndicesByFips(fips)
        : state ? await getCrimeIndicesByState(state) : null;

      return {
        community: {
          geography: { geographyName: postalCode ? `ZIP ${postalCode}` : state || "" },
          ...(crime ? {
            crime: {
              crime_Index: crime.crimeIndex,
              burglary_Index: crime.burglaryIndex,
              larceny_Index: crime.larcenyIndex,
              motor_Vehicle_Theft_Index: crime.motorVehicleTheftIndex,
              aggravated_Assault_Index: crime.aggravatedAssaultIndex,
              forcible_Robbery_Index: crime.robberyIndex,
            },
          } : {}),
        },
      };
    }

    case "schools": {
      const result = lat && lng
        ? await searchSchoolsByLocation(lat, lng, 5, 20)
        : postalCode
          ? await searchSchoolsByZip(postalCode, 20)
          : { schools: [], totalCount: 0 };

      return {
        school: result.schools.map(s => ({
          InstitutionName: s.schoolName,
          schoolName: s.schoolName,
          schoolType: s.schoolType,
          gradeRange: s.gradeRange,
          enrollment: s.enrollment,
          distanceMiles: s.distanceMiles,
          latitude: s.latitude,
          longitude: s.longitude,
          city: s.city,
          state: s.state,
          districtName: s.districtName,
        })),
      };
    }

    case "schooldistrict":
    case "schoolprofile": {
      // Use same school search — individual profile not available from NCES free API
      const result = lat && lng
        ? await searchSchoolsByLocation(lat, lng, 5, 20)
        : postalCode
          ? await searchSchoolsByZip(postalCode, 20)
          : { schools: [], totalCount: 0 };
      return {
        school: result.schools.map(s => ({
          InstitutionName: s.schoolName,
          schoolName: s.schoolName,
          schoolType: s.schoolType,
          gradeRange: s.gradeRange,
          enrollment: s.enrollment,
          districtName: s.districtName,
        })),
      };
    }

    case "hazardrisk":
    case "climaterisk":
    case "riskprofile": {
      if (!lat || !lng) {
        return { hazardRisk: null, message: "Latitude and longitude required for hazard risk" };
      }
      const hazards = await getHazardRiskProfile(lat, lng, state, fips);
      return { hazardRisk: hazards };
    }

    case "poi": {
      if (!lat || !lng) {
        return { poi: [], message: "Latitude and longitude required for POI search" };
      }
      const result = await searchPOI(lat, lng, 3000, 30);
      return {
        poi: result.pois.map(p => ({
          BusinessName: p.name,
          name: p.name,
          CategoryName: p.category,
          category: p.category,
          Distance: p.distanceMiles,
          distanceMiles: p.distanceMiles,
          latitude: p.latitude,
          longitude: p.longitude,
        })),
        categories: result.categories,
      };
    }

    case "poicategories": {
      return {
        categories: [
          "Restaurant", "Fast Food", "Cafe", "Bar", "Hospital", "Medical",
          "Pharmacy", "Bank", "Post Office", "Police", "Fire Station",
          "Library", "School", "College", "University", "Place of Worship",
          "Gas Station", "Grocery", "Convenience Store", "Shopping Mall",
          "Park", "Playground", "Fitness Center", "Sports Center", "Hotel", "Museum",
        ],
      };
    }

    case "salestrend":
    case "transactionsalestrend":
    case "marketanalytics": {
      // Resolve county FIPS from zip code when not provided directly
      let resolvedFips = fips;
      let resolvedState = state;
      if (!resolvedFips && postalCode) {
        const zipLookup = resolveCountyFipsFromZip(postalCode);
        resolvedFips = zipLookup.fips;
        if (!resolvedState) resolvedState = zipLookup.state;
      }

      const trends = await getSalesTrends({
        countyFips: resolvedFips,
        stateAbbrev: resolvedState,
        startYear: params.startyear || new Date().getFullYear() - 3,
        endYear: params.endyear || new Date().getFullYear(),
      });

      return {
        salesTrends: trends.trends.map(t => ({
          dateRange: { start: t.period, interval: params.interval || "quarterly" },
          location: { geographyName: trends.areaName },
          salesTrend: {
            medSalePrice: t.medianSalePrice,
            avgSalePrice: t.avgSalePrice,
            homeSaleCount: t.homeSaleCount,
          },
          vintage: { pubDate: new Date().toISOString().split("T")[0] },
        })),
        source: trends.source,
      };
    }

    default:
      return { error: `Endpoint "${endpoint}" is not available`, property: [] };
  }
}

/**
 * Handle rental AVM — uses HUD Fair Market Rents from federal-data endpoint
 * Returns estimated monthly rent based on bedroom count.
 */
function computeRentalAvm(property: any): any {
  // Extract bedroom count from property data
  const beds = property?.building?.rooms?.beds || 2;
  // HUD FMR is fetched separately via federal-data endpoint.
  // For now, return the property's existing data (Realie may include rent estimates).
  return {
    property: [property],
    message: "Rental estimates available via Area Intel tab (HUD Fair Market Rents)",
  };
}

/**
 * Handle home equity — computed from Realie's AVM and mortgage data
 */
function computeHomeEquity(property: any): any {
  const avmValue = property?.avm?.amount?.value;
  const lienBalance = property?.mortgage?.amount;
  const equity = avmValue && lienBalance ? avmValue - lienBalance : null;
  const ltv = avmValue && lienBalance ? (lienBalance / avmValue) * 100 : null;

  return {
    property: [{
      homeEquity: {
        equity,
        estimatedValue: avmValue,
        outstandingBalance: lienBalance,
        ltv,
        lastSalePrice: property?.sale?.amount?.saleAmt,
        lastSaleDate: property?.sale?.amount?.saleRecDate || property?.sale?.amount?.saleTransDate,
      },
    }],
  };
}

/**
 * GET - Search properties / get property detail
 *
 * Strategy: RentCast for all property data, free public APIs for
 * neighborhood/school/hazard/trend data. No ATTOM or Realie dependency.
 *
 * All results cached for 7 days regardless of source.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get("endpoint") || "expanded";
    const noCache = searchParams.get("nocache") === "1";

    // Build params from query string
    const params: Record<string, any> = {};
    const stringKeys = [
      "address1", "address2", "address",
      "postalcode", "postalCode",
      "apn", "APN", "fips",
      "propertytype", "propertyType",
      "absenteeowner",
      "geoID", "geoIDV4", "geoidv4", "geoIdV4",
      "orderby",
      "startSaleSearchDate", "endSaleSearchDate",
      "startSaleTransDate", "endSaleTransDate",
      "startCalendarDate", "endCalendarDate",
      "startAddedDate", "endAddedDate",
      "interval", "startmonth", "endmonth",
      "transactiontype",
    ];

    for (const key of stringKeys) {
      const val = searchParams.get(key);
      if (val) params[key] = val;
    }

    const numericKeys = [
      "attomId", "attomid", "ID",
      "latitude", "longitude", "radius",
      "propertyIndicator",
      "minBeds", "maxBeds",
      "minBathsTotal", "maxBathsTotal",
      "minUniversalSize", "maxUniversalSize",
      "minLotSize1", "maxLotSize1",
      "minLotSize2", "maxLotSize2",
      "minYearBuilt", "maxYearBuilt",
      "minApprImprValue", "maxApprImprValue",
      "minApprLandValue", "maxApprLandValue",
      "minApprTtlValue", "maxApprTtlValue",
      "minAssdImprValue", "maxAssdImprValue",
      "minAssdLandValue", "maxAssdLandValue",
      "minAssdTtlValue", "maxAssdTtlValue",
      "minMktImprValue", "maxMktImprValue",
      "minMktLandValue", "maxMktLandValue",
      "minMktTtlValue", "maxMktTtlValue",
      "minTaxAmt", "maxTaxAmt",
      "minAVMValue", "maxAVMValue",
      "minavmvalue", "maxavmvalue",
      "minSaleAmt", "maxSaleAmt",
      "startyear", "endyear",
      "startQuarter", "endQuarter",
      "timeFrame", "maxResults",
      "page", "pagesize",
    ];

    for (const key of numericKeys) {
      const val = searchParams.get(key);
      if (val) params[key] = Number(val);
    }

    if (!params.pagesize) params.pagesize = 25;
    if (!params.page) params.page = 1;

    const noPaginationEndpoints = ["rentalavm", "homeequity", "comparables", "compgenie"];
    if (noPaginationEndpoints.includes(endpoint)) {
      delete params.pagesize;
      delete params.page;
    }

    // ── Unified 7-Day Cache ───────────────────────────────────────────────
    const cacheKey = buildPropertyCacheKey("unified", endpoint, params);

    const PROPERTY_DATA_ENDPOINTS = new Set([
      "expanded", "detail", "detailowner", "detailmortgage",
      "detailmortgageowner", "profile", "snapshot",
    ]);
    const isCachedDataUsable = (cached: any): boolean => {
      const props = cached?.property || cached?.data?.property;
      if (!props || !Array.isArray(props) || props.length === 0) return true;
      if (!PROPERTY_DATA_ENDPOINTS.has(endpoint)) return true;

      const sample = props.slice(0, Math.min(50, props.length));
      const withOwner = sample.filter((p: any) => p.owner?.owner1?.fullName).length;
      const withValue = sample.filter((p: any) =>
        p.avm?.amount?.value || p.assessment?.market?.mktTtlValue || p.assessment?.assessed?.assdTtlValue
      ).length;
      const ownerPct = (withOwner / sample.length) * 100;
      const valuePct = (withValue / sample.length) * 100;
      if (ownerPct < 10 || valuePct < 10) {
        console.log(`[PropertyCache] STALE DATA detected — refetching`);
        return false;
      }
      return true;
    };

    // Layer 1: in-memory cache
    const memoryCached = !noCache ? propertyCacheGet(cacheKey) : null;
    if (memoryCached && isCachedDataUsable(memoryCached.data)) {
      return NextResponse.json({ ...memoryCached.data, dataSource: memoryCached.source, cacheHit: "memory" }, {
        headers: { "X-Property-Cache": "MEMORY", "X-Property-Source": memoryCached.source },
      });
    }

    // Layer 2: Supabase DB cache
    const dbCached = !noCache ? await propertyDbRead(cacheKey, "unified") : null;
    if (dbCached && isCachedDataUsable(dbCached.data)) {
      const payload = { success: true, endpoint, dataSource: dbCached.source, cacheHit: "db", ...dbCached.data };
      propertyCacheSet(cacheKey, payload, dbCached.source as any);
      return NextResponse.json(payload, {
        headers: { "X-Property-Cache": "DB", "X-Property-Source": dbCached.source },
      });
    }

    // ── Layer 3: API calls ──────────────────────────────────────────────
    let result: any = null;
    let dataSource: "rentcast" | "realie" | "merged" | "free-data" | "computed" = "rentcast";

    if (FREE_DATA_ENDPOINTS.has(endpoint)) {
      // ── Free data endpoints (neighborhood, schools, hazards, trends, etc.)
      result = await fetchFromFreeData(endpoint, params);
      dataSource = "free-data";

    } else if (endpoint === "rentalavm") {
      // ── Rental AVM: use RentCast's rent estimate endpoint
      const client = await getConfiguredRentcastClient();
      if (client) {
        try {
          const address = params.address1
            ? `${params.address1}${params.address2 ? ", " + params.address2 : ""}`
            : params.address;
          const rentResult = await client.getRentEstimate({
            address,
            latitude: params.latitude ? Number(params.latitude) : undefined,
            longitude: params.longitude ? Number(params.longitude) : undefined,
          });
          result = {
            property: [{
              rentalAvm: {
                estimatedRentalValue: rentResult.rent,
                estimatedMinRentalValue: rentResult.rentRangeLow,
                estimatedMaxRentalValue: rentResult.rentRangeHigh,
                amount: { value: rentResult.rent, low: rentResult.rentRangeLow, high: rentResult.rentRangeHigh },
              },
              address: {
                oneLine: rentResult.subjectProperty?.formattedAddress,
                line1: rentResult.subjectProperty?.addressLine1,
                locality: rentResult.subjectProperty?.city,
                countrySubd: rentResult.subjectProperty?.state,
                postal1: rentResult.subjectProperty?.zipCode,
              },
            }],
          };
        } catch (err: any) {
          console.warn(`[Rentcast] Rent estimate failed: ${err.message}`);
          result = { property: [], message: "Rental estimate unavailable" };
        }
      } else {
        result = { property: [], message: "RentCast client not configured" };
      }
      dataSource = "computed";

    } else if (endpoint === "homeequity") {
      // ── Home equity: computed from RentCast AVM value estimate
      const client = await getConfiguredRentcastClient();
      if (client) {
        try {
          const address = params.address1
            ? `${params.address1}${params.address2 ? ", " + params.address2 : ""}`
            : params.address;
          const avmResult = await client.getValueEstimate({
            address,
            latitude: params.latitude ? Number(params.latitude) : undefined,
            longitude: params.longitude ? Number(params.longitude) : undefined,
            compCount: 5,
          });
          const avmValue = avmResult.price;
          const lastSalePrice = avmResult.subjectProperty?.lastSalePrice;
          // Without mortgage data from RentCast, estimate equity from AVM - lastSalePrice
          const estimatedEquity = avmValue && lastSalePrice ? avmValue - lastSalePrice : undefined;
          const ltv = avmValue && lastSalePrice ? (lastSalePrice / avmValue) * 100 : undefined;
          result = {
            property: [{
              homeEquity: {
                equity: estimatedEquity,
                estimatedValue: avmValue,
                outstandingBalance: lastSalePrice,
                ltv,
                lastSalePrice: avmResult.subjectProperty?.lastSalePrice,
                lastSaleDate: avmResult.subjectProperty?.lastSaleDate,
              },
              avm: { amount: { value: avmValue, low: avmResult.priceRangeLow, high: avmResult.priceRangeHigh } },
            }],
          };
        } catch (err: any) {
          console.warn(`[Rentcast] AVM/equity failed: ${err.message}`);
          result = { property: [], message: "Equity estimate unavailable" };
        }
      } else {
        result = { property: [], message: "RentCast client not configured" };
      }
      dataSource = "computed";

    } else if (endpoint === "compgenie") {
      // ── Comp Genie: AI-powered comparable analysis for non-disclosure states
      const lat = params.latitude;
      const lng = params.longitude;
      const address = params.address1 || params.address || "";
      const postalCode = params.postalcode || params.postalCode;
      const stateHint =
        params.address2?.match(/\b([A-Z]{2})\b/)?.[1] ||
        params.address?.match(/,\s*([A-Z]{2})\s*\d{0,5}\s*$/)?.[1] ||
        (postalCode ? resolveCountyFipsFromZip(postalCode).state : undefined);

      if (!stateHint || !isNonDisclosureState(stateHint)) {
        return NextResponse.json(
          { success: false, error: `Comp Genie is only available for non-disclosure states. ${stateHint || "Unknown"} is not a non-disclosure state.` },
          { status: 400 },
        );
      }

      // Fetch subject property
      const subjectResult = await fetchFromRentcast("expanded", params);
      const subjectProp = subjectResult?.property?.[0];
      if (!subjectProp) {
        return NextResponse.json(
          { success: true, endpoint, property: [], message: "Subject property not found" },
          { status: 200 },
        );
      }

      // Fetch nearby properties for comparison
      const searchLat = lat || subjectProp.location?.latitude;
      const searchLng = lng || subjectProp.location?.longitude;
      let neighborProps: any[] = [];
      if (searchLat && searchLng) {
        const neighborResult = await fetchFromRentcast("expanded", {
          latitude: searchLat,
          longitude: searchLng,
          radius: 2,
          pagesize: 25,
        });
        neighborProps = neighborResult?.property || [];
      }

      // Convert to CompProperty format
      const toCompProp = (p: any): CompProperty => ({
        address: p.address?.oneLine || p.address?.line1 || "",
        avmValue: p.avm?.amount?.value,
        avmLow: p.avm?.amount?.low,
        avmHigh: p.avm?.amount?.high,
        assessedValue: p.assessment?.assessed?.assdTtlValue || p.assessment?.market?.mktTtlValue,
        transferPrice: p.sale?.amount?.saleAmt,
        transferDate: p.sale?.amount?.saleRecDate || p.sale?.amount?.saleTransDate,
        beds: p.building?.rooms?.beds,
        baths: p.building?.rooms?.bathsTotal,
        sqft: p.building?.size?.universalSize || p.building?.size?.livingSize,
        lotSize: p.lot?.lotSize1,
        yearBuilt: p.summary?.yearBuilt,
        propertyType: p.summary?.propType || p.summary?.propSubType,
        pricePerSqft: p.avm?.amount?.value && (p.building?.size?.universalSize || p.building?.size?.livingSize)
          ? Math.round(p.avm.amount.value / (p.building.size.universalSize || p.building.size.livingSize))
          : undefined,
        latitude: p.location?.latitude,
        longitude: p.location?.longitude,
      });

      const subjectComp = toCompProp(subjectProp);
      const neighborComps = neighborProps.map(toCompProp);

      try {
        const genieResult = await analyzeComparables(subjectComp, neighborComps, stateHint);
        result = { compGenie: genieResult };
        dataSource = "computed";
      } catch (err: any) {
        console.error("[CompGenie] AI analysis error:", err.message);
        return NextResponse.json(
          { success: false, error: "Comp Genie analysis failed: " + (err.message || "Unknown error") },
          { status: 500 },
        );
      }

    } else if (RENTCAST_CAPABLE_ENDPOINTS.has(endpoint)) {
      // ── Property data: RentCast (primary) + Realie (supplementary)
      console.log(`[PropertyData] Fetching "${endpoint}" from RentCast + Realie`);

      // Fetch from both sources in parallel
      const [rcResult, realieResult] = await Promise.all([
        fetchFromRentcast(endpoint, params),
        fetchFromRealie(endpoint, params).catch((err) => {
          console.warn(`[Realie] Supplementary fetch failed: ${err?.message || err}`);
          return null;
        }),
      ]);

      if (rcResult?.property?.length > 0) {
        // RentCast has data — merge Realie supplementary data if available
        if (realieResult?.property?.length > 0) {
          result = {
            ...rcResult,
            property: mergePropertyData(rcResult.property, realieResult.property),
          };
          dataSource = "merged";
          console.log(
            `[PropertyData] Merged: ${rcResult.property.length} RentCast + ${realieResult.property.length} Realie props`
          );
        } else {
          result = rcResult;
          dataSource = "rentcast";
        }

        // Log quality stats
        const props = result.property as any[];
        const total = props.length;
        const withOwner = props.filter((p: any) => p.owner?.owner1?.fullName).length;
        const withValue = props.filter((p: any) =>
          p.avm?.amount?.value || p.assessment?.assessed?.assdTtlValue || p.assessment?.market?.mktTtlValue
        ).length;
        const withEquity = props.filter((p: any) => p.homeEquity?.equity != null).length;
        console.log(
          `[PropertyData] ${total} props, ${withOwner} owners, ${withValue} with values, ${withEquity} with equity`
        );
      } else if (realieResult?.property?.length > 0) {
        // RentCast returned no data — use Realie as fallback
        console.log(`[PropertyData] RentCast empty, using Realie as primary (${realieResult.property.length} props)`);
        result = realieResult;
        dataSource = "realie";
      } else {
        // Neither source returned data
        console.log(`[PropertyData] No data from RentCast or Realie for ${endpoint}`);
        return NextResponse.json(
          { success: true, endpoint, dataSource: "none", property: [], message: "No property data provider returned results" },
          { status: 200, headers: { "X-Property-Cache": "API", "X-Property-Source": "none" } },
        );
      }

    } else {
      // ── Unsupported endpoint (formerly ATTOM-only, now deprecated)
      const deprecated = [
        "saleshistory", "saleshistorybasic", "saleshistoryexpanded", "saleshistorysnapshot",
        "ibuyer", "allevents", "recorder", "buildingpermits",
        "schoolboundary", "neighborhoodboundary",
      ];
      if (deprecated.includes(endpoint)) {
        return NextResponse.json(
          { success: false, endpoint, error: `Endpoint "${endpoint}" has been deprecated. Use RentCast property data or free data sources instead.`, property: [] },
          { status: 200 },
        );
      }

      // Unknown endpoint — try RentCast as fallback
      const rcResult = await fetchFromRentcast("expanded", params);
      if (rcResult?.property?.length > 0) {
        result = rcResult;
        dataSource = "rentcast";
      } else {
        return NextResponse.json(
          { error: "No property data provider configured" },
          { status: 503 }
        );
      }
    }

    // ── Handle empty results ───────────────────────────────────────────
    const NON_PROPERTY_ARRAY_ENDPOINTS = new Set([
      "neighborhood", "community", "salestrend", "transactionsalestrend",
      "marketanalytics", "poicategories",
    ]);
    const hasResults = NON_PROPERTY_ARRAY_ENDPOINTS.has(endpoint) || result?.property?.length > 0;
    if (!hasResults && !result?.community && !result?.schools && !result?.poi && !result?.salesTrends && !result?.hazardRisk) {
      const stateHint =
        params.address2?.match(/\b([A-Z]{2})\b/)?.[1] ||
        params.address?.match(/,\s*([A-Z]{2})\s*\d{0,5}\s*$/)?.[1];

      const isNonDisclosure = stateHint && NON_DISCLOSURE_STATES.has(stateHint);

      let message = "No properties found matching your search criteria.";
      if (endpoint === "comparables") {
        message = isNonDisclosure
          ? `${stateHint} is a non-disclosure state — sale prices are not publicly recorded.`
          : "No comparable properties found. Try increasing the search radius or time frame.";
      }

      return NextResponse.json(
        { success: true, endpoint, property: [], message, nonDisclosureState: isNonDisclosure || false },
        { headers: { "X-Property-Cache": "API", "X-Property-Source": dataSource } },
      );
    }

    // Store in cache
    const responsePayload = { success: true, endpoint, dataSource, ...result };
    propertyCacheSet(cacheKey, responsePayload, dataSource);
    propertyDbWrite(cacheKey, "unified", result, dataSource).catch((err) =>
      console.error("[PropertyCache] Background DB write failed:", err)
    );

    return NextResponse.json(responsePayload, {
      headers: { "X-Property-Cache": "API", "X-Property-Source": dataSource },
    });
  } catch (error) {
    console.error("Error fetching property data:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch property data" },
      { status: 500 }
    );
  }
}
