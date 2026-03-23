"use client";

import { useState, useEffect, useCallback } from "react";
import type { FederalPropertySupplement } from "@/lib/integrations/federal-data-client";
import { buildQPublicUrl } from "@/lib/hawaii-zip-county";
import type { PropertyReportData } from "@/lib/documents/property-intelligence-report";

interface AttomProperty {
  identifier?: { Id?: number; fips?: string; apn?: string; attomId?: number };
  address?: { oneLine?: string; line1?: string; line2?: string; locality?: string; countrySubd?: string; postal1?: string };
  location?: { latitude?: string; longitude?: string; geoid?: string; geoIdV4?: string };
  area?: {
    munName?: string; countrySecSubd?: string; geoid?: string;
    blockGeoIdV4?: string; blockGroupGeoIdV4?: string; tractGeoIdV4?: string;
    countyGeoIdV4?: string; placeGeoIdV4?: string; cbsaGeoIdV4?: string;
    schoolDistrictGeoIdV4?: string; neighborhoodGeoIdV4?: string;
  };
  summary?: { propType?: string; propertyType?: string; propSubType?: string; yearBuilt?: number; propLandUse?: string; absenteeInd?: string; legal1?: string; propIndicator?: string };
  building?: {
    size?: { bldgSize?: number; livingSize?: number; universalSize?: number; grossSize?: number; groundFloorSize?: number };
    rooms?: { beds?: number; bathsFull?: number; bathsHalf?: number; bathsTotal?: number; roomsTotal?: number };
    summary?: { yearBuilt?: number; yearBuiltEffective?: number; levels?: number; bldgType?: string; archStyle?: string; quality?: string; storyDesc?: string; unitsCount?: string; view?: string };
    construction?: { condition?: string; constructionType?: string; foundationType?: string; frameType?: string; roofCover?: string; roofShape?: string; wallType?: string };
    interior?: { bsmtSize?: number; bsmtType?: string; fplcCount?: number; fplcType?: string };
    parking?: { garageType?: string; prkgSize?: number; prkgSpaces?: string; prkgType?: string };
  };
  lot?: { lotSize1?: number; lotSize2?: number; lotNum?: string; poolInd?: string; poolType?: string; siteZoningIdent?: string };
  owner?: {
    owner1?: { fullName?: string; lastName?: string; firstNameAndMi?: string; trustIndicator?: string };
    owner2?: { fullName?: string; lastName?: string; firstNameAndMi?: string; trustIndicator?: string };
    owner3?: { fullName?: string; lastName?: string; firstNameAndMi?: string };
    owner4?: { fullName?: string; lastName?: string; firstNameAndMi?: string };
    corporateIndicator?: string; type?: string; absenteeOwnerStatus?: string; mailingAddressOneLine?: string; ownerOccupied?: string;
    ownerRelationshipType?: string; ownerRelationshipRights?: string;
  };
  assessment?: {
    appraised?: { apprTtlValue?: number; apprImprValue?: number; apprLandValue?: number };
    assessed?: { assdTtlValue?: number; assdImprValue?: number; assdLandValue?: number };
    market?: { mktTtlValue?: number; mktImprValue?: number; mktLandValue?: number };
    tax?: { taxAmt?: number; taxPerSizeUnit?: number; taxYear?: number };
    // expandedprofile nests owner here (promoted to top-level by API normalization)
    owner?: AttomProperty["owner"];
  };
  sale?: { amount?: { saleAmt?: number; saleTransDate?: string; saleRecDate?: string; saleDocType?: string; salePrice?: number; saleCode?: string; pricePerBed?: number; pricePerSizeUnit?: number } };
  avm?: { amount?: { value?: number; high?: number; low?: number; scr?: number; valueRange?: number }; eventDate?: string; _avmSources?: { chosen?: string } };
  saleHistory?: Array<{ date?: string; amount?: number; buyerName?: string; sellerName?: string; deedType?: string; _source?: string }>;
  mortgage?: { amount?: number; lender?: { fullName?: string }; term?: string; date?: string; dueDate?: string; loanType?: string; interestRateType?: string; lienCount?: number; financingHistoryCount?: number; ltv?: number; ltvPurchase?: number };
  foreclosure?: { actionType?: string; filingDate?: string; recordingDate?: string; auctionDate?: string; auctionLocation?: string; defaultAmount?: number; startingBid?: number; originalLoanAmount?: number; trusteeFullName?: string; caseNumber?: string };
  hoa?: { fee?: number };
  utilities?: { coolingType?: string; heatingType?: string; heatingFuel?: string; energyType?: string; sewerType?: string; waterType?: string };
}

const fmt = (n?: number) => {
  if (n == null) return null;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
};
const fmtNum = (n?: number) => (n != null ? n.toLocaleString() : null);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
        {title}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px 20px" }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 14, color: "#111827", fontWeight: 500 }}>{value}</div>
    </div>
  );
}

/**
 * Deep-search a property object for any geoIdV4 value.
 * Property responses may embed geoIdV4 in various locations
 * (area, identifier, location, etc.).
 */
function findGeoIdV4(obj: any, depth = 0): string | null {
  if (!obj || typeof obj !== "object" || depth > 6) return null;
  // Check common field name variants at current level
  for (const key of ["geoIdV4", "geoidv4", "geoIDV4", "GeoIdV4", "geo_id_v4"]) {
    if (obj[key] && typeof obj[key] === "string") return obj[key];
  }
  // Recurse into nested objects (skip arrays of primitives)
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = findGeoIdV4(value, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

type SectionId = "overview" | "building" | "financial" | "ownership" | "neighborhood" | "market" | "federal" | "nearby" | "comps";

export default function PropertyDetailModal({
  property: p,
  searchContext,
  onClose,
  embedded,
  tabs: visibleTabs,
  farmingContext,
}: {
  property: AttomProperty;
  searchContext?: { absenteeowner?: string };
  onClose: () => void;
  /** When true, renders just tabs + content inline (no overlay, no header). Used by MLS detail card. */
  embedded?: boolean;
  /** Optional subset of tabs to show (e.g. ["building","financial","ownership","neighborhood"]). Shows all by default. */
  tabs?: SectionId[];
  /** When provided, enables the "Nearby Homes" tab for Just Sold Farming. */
  farmingContext?: { radiusMiles: string; propertyType?: string };
}) {
  const [activeSection, setActiveSection] = useState<SectionId>(visibleTabs?.[0] || "overview");
  const [federalData, setFederalData] = useState<FederalPropertySupplement | null>(null);
  const [federalLoading, setFederalLoading] = useState(false);
  const [hawaiiData, setHawaiiData] = useState<any>(null);
  const [hawaiiLoading, setHawaiiLoading] = useState(false);
  const [neighborhoodData, setNeighborhoodData] = useState<any>(null);
  const [neighborhoodLoading, setNeighborhoodLoading] = useState(false);
  const [hazardData, setHazardData] = useState<any>(null);
  const [hazardLoading, setHazardLoading] = useState(false);
  const [avmData, setAvmData] = useState<any>(null);
  const [avmLoading, setAvmLoading] = useState(false);
  const [enrichedFinancial, setEnrichedFinancial] = useState<any>(null);
  const [enrichedFinancialLoading, setEnrichedFinancialLoading] = useState(false);
  const [enrichedOwner, setEnrichedOwner] = useState<any>(null);
  const [enrichedOwnerLoading, setEnrichedOwnerLoading] = useState(false);
  const [nearbyHomes, setNearbyHomes] = useState<AttomProperty[] | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  // RentCast comps — fetched on demand when user clicks the Comps tab
  const [rentcastComps, setRentcastComps] = useState<any[] | null>(null);
  const [rentcastCompsLoading, setRentcastCompsLoading] = useState(false);
  const [rentcastCompsError, setRentcastCompsError] = useState<string | null>(null);
  const [rentcastAvmPrice, setRentcastAvmPrice] = useState<number | null>(null);
  // RentCast market stats — fetched on demand when Neighborhood tab is selected
  const [marketStats, setMarketStats] = useState<any>(null);
  const [marketStatsLoading, setMarketStatsLoading] = useState(false);

  const addr = p.address?.oneLine || [p.address?.line1, p.address?.line2].filter(Boolean).join(", ") || "Property Detail";
  const sqft = p.building?.size?.livingSize || p.building?.size?.universalSize || p.building?.size?.bldgSize;
  const beds = p.building?.rooms?.beds;
  const baths = p.building?.rooms?.bathsFull ?? p.building?.rooms?.bathsTotal;
  const yearBuilt = p.building?.summary?.yearBuilt || p.summary?.yearBuilt;
  const avmVal = p.avm?.amount?.value;
  // Best estimated value: AVM → market assessment → appraised assessment
  const bestValue = avmVal || p.assessment?.market?.mktTtlValue || p.assessment?.appraised?.apprTtlValue;
  const lastSaleAmt = p.sale?.amount?.saleAmt || p.sale?.amount?.salePrice;
  // Use Realie's pre-calculated equity (AVM - outstanding mortgage balance) if available,
  // otherwise fall back to best value - last sale price as a rough estimate
  const realieEquity = (p as any).homeEquity?.equity;
  const mortgageAmt = p.mortgage?.amount != null ? Number(p.mortgage.amount) : null;
  const equity = realieEquity
    ?? (bestValue && mortgageAmt ? bestValue - mortgageAmt : null)
    ?? (bestValue && lastSaleAmt ? bestValue - lastSaleAmt : null);
  const realieLtv = (p as any).homeEquity?.ltv;
  const ltv = realieLtv ?? (bestValue && mortgageAmt ? (mortgageAmt / bestValue) * 100 : null);

  // Fetch Hawaii hazard/environmental zone data on mount (for HI properties with lat/lng)
  useEffect(() => {
    if (hazardData || hazardLoading) return;
    let state = p.address?.countrySubd?.toUpperCase();
    // Derive state from oneLine if countrySubd missing (salesnapshot results)
    if (!state && p.address?.oneLine) {
      const parts = p.address.oneLine.split(",").map(s => s.trim());
      if (parts.length >= 2) {
        const stateZip = parts[parts.length - 1].split(/\s+/);
        if (stateZip.length >= 1) state = stateZip[0].toUpperCase();
      }
    }
    const isHawaii = state === "HI" || state === "HAWAII";
    const lat = p.location?.latitude;
    const lng = p.location?.longitude;
    if (!isHawaii || !lat || !lng) return;

    setHazardLoading(true);
    fetch(`/api/integrations/hawaii-hazards?endpoint=profile&lat=${lat}&lng=${lng}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setHazardData(data);
        }
      })
      .catch(() => {})
      .finally(() => setHazardLoading(false));
  }, [hazardData, hazardLoading, p]);

  // Fetch AVM data when the Financial tab is selected and property doesn't already have AVM
  useEffect(() => {
    if (activeSection !== "financial" || avmData || avmLoading) return;
    if (p.avm?.amount?.value) return; // Already have AVM from search results

    const attomId = p.identifier?.attomId;
    let addr1 = p.address?.line1;
    if (!addr1 && p.address?.oneLine) {
      const parts = p.address.oneLine.split(",");
      if (parts.length >= 2) addr1 = parts[0].trim();
    }
    const addr2 = p.address?.locality && p.address?.countrySubd
      ? `${p.address.locality}, ${p.address.countrySubd}`
      : (p.address?.oneLine ? p.address.oneLine.split(",").slice(1).join(",").trim() : undefined);

    if (!attomId && !addr1) return;

    setAvmLoading(true);

    const params = new URLSearchParams({ endpoint: "expanded" });
    if (attomId) {
      params.set("attomid", String(attomId));
    } else {
      if (addr1) params.set("address1", addr1);
      if (addr2) params.set("address2", addr2);
    }

    fetch(`/api/integrations/attom/property?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          // Extract AVM from the response property data
          const prop = data.property?.[0] || data;
          if (prop.avm || prop.assessment) {
            setAvmData(prop);
          }
        }
      })
      .catch(() => {})
      .finally(() => setAvmLoading(false));
  }, [activeSection, avmData, avmLoading, p]);

  // Fetch federal data when the Federal tab is selected
  // Tries cached data first, falls back to live API
  useEffect(() => {
    if (activeSection !== "federal" || federalData || federalLoading) return;
    const zipCode = p.address?.postal1;
    if (!zipCode) return;

    setFederalLoading(true);

    const fetchLive = () => {
      const params = new URLSearchParams({
        endpoint: "supplement",
        zipCode,
        ...(p.address?.countrySubd ? { state: p.address.countrySubd } : {}),
        ...(p.identifier?.fips ? { stateFips: p.identifier.fips.substring(0, 2), countyFips: p.identifier.fips.substring(2, 5) } : {}),
        ...(p.address?.line1 ? { address: p.address.line1 } : {}),
        ...(p.address?.locality ? { city: p.address.locality } : {}),
      });

      return fetch(`/api/integrations/federal-data/query?${params}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success !== false) setFederalData(data);
        });
    };

    fetch(`/api/area-cache?zipCode=${encodeURIComponent(zipCode)}&dataType=federal`)
      .then((r) => r.json())
      .then((cache) => {
        if (cache.cached && cache.data) {
          console.log("[Federal] Using cached data from", cache.fetchedAt);
          setFederalData(cache.data);
        } else {
          return fetchLive();
        }
      })
      .catch(() => fetchLive())
      .finally(() => setFederalLoading(false));
  }, [activeSection, federalData, federalLoading, p]);

  // Fetch Hawaii statewide parcel + owner data when Ownership or Financial tab is selected
  // Combines State ArcGIS (all counties) with Honolulu OWNALL (deed owners)
  useEffect(() => {
    if ((activeSection !== "ownership" && activeSection !== "financial") || hawaiiData || hawaiiLoading) return;

    let hiState = p.address?.countrySubd?.toUpperCase();
    if (!hiState && p.address?.oneLine) {
      const parts = p.address.oneLine.split(",").map(s => s.trim());
      if (parts.length >= 2) {
        const stateZip = parts[parts.length - 1].split(/\s+/);
        if (stateZip.length >= 1) hiState = stateZip[0].toUpperCase();
      }
    }
    const isHawaii = hiState === "HI" || hiState === "HAWAII";
    const tmk = p.identifier?.apn;

    if (!isHawaii || !tmk) return;

    setHawaiiLoading(true);

    const params = new URLSearchParams({ endpoint: "enriched", tmk });
    fetch(`/api/integrations/hawaii-parcels?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setHawaiiData(data);
        }
      })
      .catch(() => {})
      .finally(() => setHawaiiLoading(false));
  }, [activeSection, hawaiiData, hawaiiLoading, p]);

  // Fetch neighborhood profile (community data, schools) when Neighborhood tab is selected
  // Tries cached data first, falls back to live API
  useEffect(() => {
    if (activeSection !== "neighborhood" || neighborhoodData || neighborhoodLoading) return;

    // Parse address — salesnapshot results may only have oneLine without line1
    let addr1 = p.address?.line1;
    if (!addr1 && p.address?.oneLine) {
      const parts = p.address.oneLine.split(",");
      if (parts.length >= 2) addr1 = parts[0].trim();
    }
    let city = p.address?.locality;
    let state = p.address?.countrySubd;
    const zip = p.address?.postal1;
    // Parse city/state from oneLine if missing (e.g. "123 Main St, Kailua, HI 96734")
    if ((!city || !state) && p.address?.oneLine) {
      const parts = p.address.oneLine.split(",").map(s => s.trim());
      if (parts.length >= 3) {
        if (!city) city = parts[parts.length - 2];
        if (!state) {
          const stateZip = parts[parts.length - 1].split(/\s+/);
          if (stateZip.length >= 1) state = stateZip[0];
        }
      }
    }
    if (!addr1 && !zip && !p.location?.latitude) return;

    setNeighborhoodLoading(true);

    const fetchLive = () => {
      const params = new URLSearchParams({ endpoint: "neighborhood" });
      if (addr1) params.set("address1", addr1);
      if (city && state) params.set("address2", `${city}, ${state}`);
      else if (city) params.set("address2", city);
      if (zip) params.set("postalcode", zip);
      if (p.location?.latitude) params.set("latitude", p.location.latitude);
      if (p.location?.longitude) params.set("longitude", p.location.longitude);
      const geoId = findGeoIdV4(p);
      if (geoId) params.set("geoidv4", geoId);

      return fetch(`/api/integrations/attom/property?${params}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && !data.error) setNeighborhoodData(data);
        });
    };

    // Try cache first, fall back to live API
    if (zip) {
      fetch(`/api/area-cache?zipCode=${encodeURIComponent(zip)}&dataType=neighborhood`)
        .then((r) => r.json())
        .then((cache) => {
          if (cache.cached && cache.data) {
            console.log("[Neighborhood] Using cached data from", cache.fetchedAt);
            setNeighborhoodData(cache.data);
          } else {
            return fetchLive();
          }
        })
        .catch(() => fetchLive())
        .finally(() => setNeighborhoodLoading(false));
    } else {
      fetchLive()
        .catch((err) => console.warn("[Neighborhood] fetch failed:", err))
        .finally(() => setNeighborhoodLoading(false));
    }
  }, [activeSection, neighborhoodData, neighborhoodLoading, p]);

  // Fetch RentCast market stats when Market Stats tab is selected
  // Tries cached data first, falls back to live API
  useEffect(() => {
    if (activeSection !== "market" || marketStats || marketStatsLoading) return;
    const zip = p.address?.postal1;
    if (!zip) return;

    setMarketStatsLoading(true);

    const fetchLive = () =>
      fetch(`/api/rentcast/market-stats?zipCode=${encodeURIComponent(zip)}&historyRange=12`)
        .then((r) => r.json())
        .then((data) => {
          if (data && !data.error) setMarketStats(data);
        });

    fetch(`/api/area-cache?zipCode=${encodeURIComponent(zip)}&dataType=market_stats`)
      .then((r) => r.json())
      .then((cache) => {
        if (cache.cached && cache.data) {
          console.log("[MarketStats] Using cached data from", cache.fetchedAt);
          setMarketStats(cache.data);
        } else {
          return fetchLive();
        }
      })
      .catch(() => fetchLive())
      .finally(() => setMarketStatsLoading(false));
  }, [activeSection, marketStats, marketStatsLoading, p]);

  // Fetch nearby homes when "nearby" tab is selected (Just Sold Farming).
  // Realie provides owner, assessment, AVM, and mortgage data on the primary
  // detailmortgageowner response — no expanded supplement needed.
  useEffect(() => {
    if (activeSection !== "nearby" || nearbyHomes || nearbyLoading || !farmingContext) return;
    const lat = p.location?.latitude;
    const lng = p.location?.longitude;
    if (!lat || !lng) return;

    setNearbyLoading(true);

    const params = new URLSearchParams({
      latitude: lat,
      longitude: lng,
      radius: farmingContext.radiusMiles || "0.5",
      propertytype: farmingContext.propertyType || "SFR",
      page: "1",
      pagesize: "50",
      endpoint: "detailmortgageowner",
    });

    fetch(`/api/integrations/attom/property?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setNearbyHomes(data.property || []))
      .catch(() => setNearbyHomes([]))
      .finally(() => setNearbyLoading(false));
  }, [activeSection, nearbyHomes, nearbyLoading, farmingContext, p]);

  // Fetch comps when user clicks the Comps tab (MLS first, RentCast fallback)
  useEffect(() => {
    if (activeSection !== "comps") return;
    if (rentcastComps || rentcastCompsLoading) return;

    const address = p.address?.oneLine || [p.address?.line1, p.address?.line2, p.address?.locality, p.address?.countrySubd, p.address?.postal1].filter(Boolean).join(", ");
    if (!address) {
      setRentcastCompsError("No address available for comp search.");
      return;
    }

    setRentcastCompsLoading(true);
    setRentcastCompsError(null);

    const params = new URLSearchParams({ address, compCount: "10" });
    const zip = p.address?.postal1;
    const bedsVal = p.building?.rooms?.beds;
    const bathsVal = p.building?.rooms?.bathsFull ?? p.building?.rooms?.bathsTotal;
    const sqftVal = p.building?.size?.livingSize || p.building?.size?.universalSize || p.building?.size?.bldgSize;
    const propType = p.summary?.propType;
    if (zip) params.set("zipCode", zip);
    if (bedsVal != null) params.set("beds", String(bedsVal));
    if (bathsVal != null) params.set("baths", String(bathsVal));
    if (sqftVal) params.set("sqft", String(sqftVal));
    if (propType) params.set("propertyType", propType);

    fetch(`/api/comps?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setRentcastCompsError(data.error);
        } else {
          setRentcastComps(data.comparables || []);
          setRentcastAvmPrice(data.avm?.price || null);
        }
      })
      .catch((e) => setRentcastCompsError(e.message || "Failed to fetch comparables."))
      .finally(() => setRentcastCompsLoading(false));
  }, [activeSection, rentcastComps, rentcastCompsLoading, p]);

  // Fetch enriched financial data when Financial tab is selected.
  // Realie provides mortgage and equity on the primary response.
  // Rental AVM uses HUD Fair Market Rents, sales trends use FRED data.
  useEffect(() => {
    if (activeSection !== "financial" || enrichedFinancial || enrichedFinancialLoading) return;

    const attomId = p.identifier?.attomId;
    let addr1 = p.address?.line1;
    if (!addr1 && p.address?.oneLine) {
      const parts = p.address.oneLine.split(",");
      if (parts.length >= 2) addr1 = parts[0].trim();
    }
    const postal = p.address?.postal1;
    const addr2 = p.address?.locality && p.address?.countrySubd
      ? `${p.address.locality}, ${p.address.countrySubd}${postal ? ` ${postal}` : ""}`
      : (p.address?.oneLine ? p.address.oneLine.split(",").slice(1).join(",").trim() : undefined);
    if (!attomId && !addr1) return;

    setEnrichedFinancialLoading(true);

    // Build address params for rental AVM lookup
    const buildAddrParams = (endpoint: string) => {
      const params = new URLSearchParams({ endpoint });
      if (addr1) {
        params.set("address1", addr1);
        if (addr2) params.set("address2", addr2);
      } else if (attomId) {
        params.set("attomid", String(attomId));
      }
      return params;
    };

    const geoId = findGeoIdV4(p);
    const salesTrendParams = new URLSearchParams({ endpoint: "salestrend" });
    if (geoId) salesTrendParams.set("geoIdV4", geoId);
    else if (p.address?.postal1) salesTrendParams.set("postalcode", p.address.postal1);
    if (p.identifier?.fips) salesTrendParams.set("fips", p.identifier.fips);
    if (addr2) salesTrendParams.set("address2", addr2);
    const currentYear = new Date().getFullYear();
    salesTrendParams.set("interval", "quarterly");
    salesTrendParams.set("startyear", String(currentYear - 3));
    salesTrendParams.set("endyear", String(currentYear));
    salesTrendParams.set("propertytype", "SINGLE FAMILY RESIDENCE");

    const cachedRentalAvm = (p as any).rentalAvm;

    // Realie already provides mortgage (lenderName, totalLienBalance, totalLienCount)
    // and equity (equityCurrentEstBal, LTVCurrentEstCombined) on the primary response.
    // Fetch supplemental data: rentalavm (rental estimates via HUD) and salestrend (area trends via FRED).
    const fetches: Promise<PromiseSettledResult<any>>[] = [
      cachedRentalAvm
        ? Promise.resolve({ status: "fulfilled" as const, value: { property: [{ rentalAvm: cachedRentalAvm }] } })
        : fetch(`/api/integrations/attom/property?${buildAddrParams("rentalavm")}`).then(r => r.json()).then(v => ({ status: "fulfilled" as const, value: v })).catch(e => ({ status: "rejected" as const, reason: e })),
      fetch(`/api/integrations/attom/property?${salesTrendParams}`).then(r => r.json()).then(v => ({ status: "fulfilled" as const, value: v })).catch(e => ({ status: "rejected" as const, reason: e })),
    ];

    Promise.all(fetches).then(([rentalAvm, salesTrends]) => {
      // Build homeEquity from Realie's pre-calculated data, or fall back to
      // computing it from AVM / assessment values (same cascade the search cards use).
      let homeEquityData = (p as any).homeEquity || null;
      if (!homeEquityData) {
        // Cascade: AVM → market assessment → appraised assessment
        const avmVal = p.avm?.amount?.value
          || p.assessment?.market?.mktTtlValue
          || p.assessment?.appraised?.apprTtlValue;
        const saleAmt = p.sale?.amount?.saleAmt;
        const lienBal = (p as any).mortgage?.amount?.total ?? (p as any).mortgage?.amount?.first ?? (p.mortgage?.amount != null ? Number(p.mortgage.amount) : null);
        const estimatedEquity = avmVal && lienBal ? avmVal - lienBal : (avmVal && saleAmt ? avmVal - saleAmt : null);
        if (estimatedEquity != null || avmVal != null) {
          homeEquityData = {
            equity: estimatedEquity ?? (avmVal && !lienBal && !saleAmt ? avmVal : undefined),
            estimatedValue: avmVal ?? undefined,
            outstandingBalance: lienBal ?? undefined,
            ltv: avmVal && lienBal ? (lienBal / avmVal) * 100 : (avmVal && !lienBal ? 0 : undefined),
            lastSalePrice: saleAmt ?? undefined,
            lastSaleDate: p.sale?.amount?.saleRecDate ?? p.sale?.amount?.saleTransDate ?? undefined,
          };
        }
      }

      // Enrich homeEquity with loan count and estimated monthly payment
      // derived from mortgage data when not already present
      if (homeEquityData) {
        const mortgage = p.mortgage;
        const balance = homeEquityData.outstandingBalance ?? homeEquityData.loanBalance
          ?? homeEquityData.mortgageBalance ?? homeEquityData.estimatedBalance;

        // Active loan count: use mortgage.lienCount or financingHistoryCount,
        // or infer from whether a loan balance exists
        if (homeEquityData.loanCount == null && homeEquityData.numberOfLoans == null) {
          const liens = mortgage?.lienCount ?? mortgage?.financingHistoryCount;
          if (liens != null && liens > 0) {
            homeEquityData.loanCount = liens;
          } else if (balance != null && balance > 0) {
            homeEquityData.loanCount = 1; // At least 1 active loan if there's a balance
          }
        }

        // Estimated monthly payment: calculate from balance using standard 30yr rate
        if (homeEquityData.estimatedPayment == null && homeEquityData.monthlyPayment == null) {
          if (balance != null && balance > 0) {
            // Estimate using typical 30yr fixed rate (6.5%) for P&I
            const annualRate = 0.065;
            const monthlyRate = annualRate / 12;
            const n = 360; // 30 years
            const monthlyPI = balance * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
            homeEquityData.estimatedPayment = Math.round(monthlyPI);
          }
        }
      }

      setEnrichedFinancial({
        avmHistory: null,
        rentalAvm: rentalAvm.status === "fulfilled" ? rentalAvm.value : null,
        salesHistory: null,
        mortgageDetail: null, // Realie provides mortgage data on primary response
        homeEquity: homeEquityData ? { property: [{ homeEquity: homeEquityData }] } : null,
        salesTrends: salesTrends.status === "fulfilled" && !salesTrends.value?.error ? salesTrends.value : null,
      });
    }).finally(() => setEnrichedFinancialLoading(false));
  }, [activeSection, enrichedFinancial, enrichedFinancialLoading, p]);

  // Ownership tab: Realie already provides owner data (ownerName, ownerAddress,
  // ownerResCount, ownerComCount, lenderName, etc.) on the primary search response.
  // No additional calls needed — the property object already contains
  // owner info mapped by the API route.
  // enrichedOwner is left null; the Ownership tab renders from the base property data.

  // ── Report generation ──
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportShareUrl, setReportShareUrl] = useState<string | null>(null);
  const [reportCopied, setReportCopied] = useState(false);

  const collectReportData = useCallback((): PropertyReportData => {
    const he = enrichedFinancial?.homeEquity?.property?.[0]?.homeEquity;
    const rentalResp = enrichedFinancial?.rentalAvm;
    const rentalProp = rentalResp?.property?.[0] || rentalResp;
    const rental = rentalProp?.rentalAvm || rentalProp?.rentalAVM || rentalProp?.rentalavm;
    const rentVal = rental?.estimatedRentalValue ?? rental?.rentalAmount?.value ?? rental?.amount?.value
      ?? (p as any).rentalAvm?.estimatedRentalValue ?? (p as any).rentalAvm?.rentalAmount?.value;

    // Build hazard entries
    const hazards: PropertyReportData["hazards"] = [];
    if (hazardData) {
      if (hazardData.tsunami?.found) hazards.push({ label: "Tsunami Evac Zone", value: String(hazardData.tsunami.attributes?.evaczone || hazardData.tsunami.attributes?.zone || "Yes") });
      if (hazardData.seaLevelRise?.found) hazards.push({ label: "Sea Level Rise", value: "In 3.2ft SLR coastal flood zone" });
      if (hazardData.lavaFlow?.found) hazards.push({ label: "Lava Flow Zone", value: `Zone ${hazardData.lavaFlow.attributes?.hazard || hazardData.lavaFlow.attributes?.zone || "?"}` });
      if (hazardData.cesspoolPriority?.found) hazards.push({ label: "Cesspool Priority", value: hazardData.cesspoolPriority.attributes?.priorityscore ? `Score: ${hazardData.cesspoolPriority.attributes.priorityscore}` : "In priority area" });
      if (hazardData.dhhl?.found) hazards.push({ label: "Hawaiian Home Lands", value: "On DHHL land" });
      if (hazardData.sma?.found) hazards.push({ label: "Special Mgmt Area", value: "Coastal zone — SMA permits may apply" });
    }

    // Build federal context
    let federal: PropertyReportData["federalData"];
    if (federalData) {
      const fd = federalData as any;
      const census = fd.census || fd.demographics || {};
      const fred = fd.fred || fd.economic || {};
      const fema = fd.fema || fd.flood || {};
      federal = {
        medianIncome: census.medianHouseholdIncome ?? census.medianIncome,
        populationDensity: census.populationDensity,
        unemploymentRate: census.unemploymentRate ?? fred.unemploymentRate,
        medianHomeValue: census.medianHomeValue,
        povertyRate: census.povertyRate,
        medianAge: census.medianAge,
        ownerOccupiedPct: census.ownerOccupiedPct,
        renterOccupiedPct: census.renterOccupiedPct,
        mortgageRate30yr: fred.mortgageRate30yr ?? fred.mortgage30yr,
        floodZone: fema.floodZone ?? fema.zone,
        floodRisk: fema.riskRating ?? fema.risk,
      };
    }

    return {
      address: addr,
      city: p.address?.locality,
      state: p.address?.countrySubd,
      zip: p.address?.postal1,
      county: p.area?.munName || p.area?.countrySecSubd,
      apn: p.identifier?.apn,
      propertyType: p.summary?.propertyType || p.summary?.propType,
      yearBuilt,
      beds,
      baths,
      sqft,
      lotSizeSqft: p.lot?.lotSize1,
      lotSizeAcres: p.lot?.lotSize2,
      stories: p.building?.summary?.levels,
      garageSpaces: p.building?.parking?.prkgSpaces,
      pool: p.lot?.poolInd === "Y" ? true : p.lot?.poolInd === "N" ? false : undefined,
      avmValue: avmVal || bestValue,
      avmLow: p.avm?.amount?.low,
      avmHigh: p.avm?.amount?.high,
      avmConfidence: p.avm?.amount?.scr,
      avmDate: p.avm?.eventDate,
      assessedTotal: p.assessment?.assessed?.assdTtlValue,
      assessedLand: p.assessment?.assessed?.assdLandValue,
      assessedImpr: p.assessment?.assessed?.assdImprValue,
      marketTotal: p.assessment?.market?.mktTtlValue,
      taxAmount: p.assessment?.tax?.taxAmt,
      taxYear: p.assessment?.tax?.taxYear,
      lastSalePrice: lastSaleAmt,
      lastSaleDate: p.sale?.amount?.saleTransDate,
      estimatedEquity: equity ?? he?.equity,
      loanBalance: he?.outstandingBalance ?? he?.loanBalance,
      ltv: ltv ?? he?.ltv ?? he?.loanToValue,
      loanCount: he?.loanCount ?? p.mortgage?.lienCount,
      lender: p.mortgage?.lender?.fullName,
      loanAmount: p.mortgage?.amount,
      loanType: p.mortgage?.loanType,
      rentalEstimate: rentVal != null ? Number(rentVal) : undefined,
      rentalLow: rental?.estimatedMinRentalValue ?? rental?.rentalAmount?.low,
      rentalHigh: rental?.estimatedMaxRentalValue ?? rental?.rentalAmount?.high,
      grossYield: rentVal && avmVal ? ((Number(rentVal) * 12 / avmVal) * 100) : undefined,
      owner1: p.owner?.owner1?.fullName,
      owner2: p.owner?.owner2?.fullName,
      ownerOccupied: p.owner?.ownerOccupied,
      absenteeOwner: p.owner?.absenteeOwnerStatus,
      mailingAddress: p.owner?.mailingAddressOneLine,
      corporateOwner: p.owner?.corporateIndicator,
      hazards: hazards.length > 0 ? hazards : undefined,
      federalData: federal,
      generatedAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    };
  }, [p, addr, avmVal, bestValue, lastSaleAmt, equity, ltv, yearBuilt, beds, baths, sqft, hazardData, federalData, enrichedFinancial]);

  const handleGenerateReport = useCallback(async () => {
    setReportGenerating(true);
    try {
      const reportData = collectReportData();
      const res = await fetch("/api/property-intelligence/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property: reportData }),
      });
      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Property_Intelligence_${addr.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_").substring(0, 40)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[PropertyReport] Generation failed:", err);
      alert("Failed to generate report. Please try again.");
    } finally {
      setReportGenerating(false);
    }
  }, [collectReportData, addr]);

  const handleShareReport = useCallback(async () => {
    setReportGenerating(true);
    try {
      const reportData = collectReportData();

      // Try the primary save endpoint first
      let shareUrl: string | null = null;
      const res = await fetch("/api/property-intelligence/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property: reportData }),
      });

      if (res.ok) {
        const data = await res.json();
        shareUrl = data.shareUrl;
      } else {
        // Primary endpoint failed — try fallback share endpoint
        console.warn("[PropertyReport] Primary save failed, trying fallback share endpoint");
        const fallbackRes = await fetch("/api/reports/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ report: reportData }),
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          shareUrl = fallbackData.shareUrl;
        }
      }

      if (!shareUrl) throw new Error("Could not generate share link");

      setReportShareUrl(shareUrl);
      await navigator.clipboard.writeText(shareUrl);
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 3000);
    } catch (err) {
      console.error("[PropertyReport] Share failed:", err);
      alert("Failed to create shareable link. Please try again.");
    } finally {
      setReportGenerating(false);
    }
  }, [collectReportData]);

  const allSections: { id: SectionId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "building", label: "Building" },
    { id: "financial", label: "Financial" },
    { id: "comps" as SectionId, label: "Comps" },
    { id: "ownership", label: "Ownership" },
    { id: "market", label: "Market Stats" },
    { id: "neighborhood", label: "Neighborhood" },
    { id: "federal", label: "Area Intel" },
    ...(farmingContext ? [{ id: "nearby" as SectionId, label: "Nearby Homes" }] : []),
  ];
  const sections = visibleTabs
    ? allSections.filter((s) => visibleTabs.includes(s.id))
    : allSections;

  // ── Shared Tabs Bar ──
  const tabsBar = (
    <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e5e7eb", overflowX: "auto" }}>
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => setActiveSection(s.id)}
          style={{
            padding: "8px 16px", fontSize: 13, fontWeight: 600, border: "none", background: "transparent", cursor: "pointer",
            color: activeSection === s.id ? "#3b82f6" : "#6b7280",
            borderBottom: activeSection === s.id ? "2px solid #3b82f6" : "2px solid transparent",
            whiteSpace: "nowrap",
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  // ── Shared Value Summary Cards ──
  const valueSummaryCards = (
    <div style={{ display: "flex", gap: 12, marginBottom: embedded ? 16 : 0, marginTop: embedded ? 0 : 16, flexWrap: "wrap" }}>
      {(() => {
        const displayVal = avmVal || p.assessment?.market?.mktTtlValue || p.assessment?.appraised?.apprTtlValue;
        if (displayVal == null) return null;
        const label = avmVal ? "AVM Value" : (p.assessment?.market?.mktTtlValue ? "Market Value" : "Appraised Value");
        return (
          <div style={{ flex: 1, minWidth: 130, padding: "10px 14px", background: "#ecfdf5", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "#059669", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#059669" }}>{fmt(displayVal)}</div>
            {p.avm?.amount?.low != null && p.avm?.amount?.high != null && (
              <div style={{ fontSize: 11, color: "#6b7280" }}>Range: {fmt(p.avm.amount.low)} – {fmt(p.avm.amount.high)}</div>
            )}
          </div>
        );
      })()}
      {lastSaleAmt != null && (
        <div style={{ flex: 1, minWidth: 130, padding: "10px 14px", background: "#eff6ff", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Last Sale</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#3b82f6" }}>{fmt(lastSaleAmt)}</div>
          {p.sale?.amount?.saleTransDate && (
            <div style={{ fontSize: 11, color: "#6b7280" }}>{p.sale.amount.saleTransDate}</div>
          )}
        </div>
      )}
      {equity != null && (
        <div style={{ flex: 1, minWidth: 130, padding: "10px 14px", background: equity > 0 ? "#fefce8" : "#fef2f2", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: equity > 0 ? "#a16207" : "#dc2626", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Est. Equity
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: equity > 0 ? "#a16207" : "#dc2626" }}>
            {equity > 0 ? "+" : ""}{fmt(equity)}
          </div>
        </div>
      )}
      {ltv != null && (
        <div style={{ flex: 1, minWidth: 130, padding: "10px 14px", background: ltv >= 80 ? "#fef2f2" : "#f0fdf4", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: ltv >= 80 ? "#dc2626" : "#059669", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            LTV
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: ltv >= 80 ? "#dc2626" : "#059669" }}>
            {ltv.toFixed(1)}%
          </div>
        </div>
      )}
      {/* Rental AVM from search supplement data */}
      {(() => {
        const ra = (p as any).rentalAvm;
        const rentVal = ra?.estimatedRentalValue ?? ra?.rentalAmount?.value ?? ra?.amount?.value;
        if (rentVal == null) return null;
        const grossYield = bestValue ? ((rentVal * 12 / bestValue) * 100) : null;
        return (
          <div style={{ flex: 1, minWidth: 130, padding: "10px 14px", background: "#f5f3ff", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Rent Est.</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#7c3aed" }}>${Number(rentVal).toLocaleString()}/mo</div>
            {grossYield != null && (
              <div style={{ fontSize: 11, color: "#0891b2", fontWeight: 600 }}>{grossYield.toFixed(1)}% gross yield</div>
            )}
          </div>
        );
      })()}
    </div>
  );

  // ── Tab content (shared between embedded and modal mode) ──
  const tabContent = (
    <div style={{ padding: embedded ? "16px 0" : "20px 24px", overflowY: embedded ? undefined : "auto", flex: embedded ? undefined : 1 }}>
      {activeSection === "overview" && (
            <>
              <Section title="Property Summary">
                <Field label="Property Type" value={p.summary?.propertyType || p.summary?.propType} />
                <Field label="Sub Type" value={p.summary?.propSubType} />
                <Field label="Land Use" value={p.summary?.propLandUse} />
                <Field label="Year Built" value={yearBuilt} />
                <Field label="APN" value={p.identifier?.apn} />
                <Field label="FIPS" value={p.identifier?.fips} />
                <Field label="Record ID" value={p.identifier?.attomId} />
                <Field label="Zoning" value={p.lot?.siteZoningIdent} />
                <Field label="Legal" value={p.summary?.legal1} />
              </Section>

              <Section title="Location">
                <Field label="Address" value={p.address?.oneLine} />
                <Field label="City" value={p.address?.locality} />
                <Field label="State" value={p.address?.countrySubd} />
                <Field label="Zip" value={p.address?.postal1} />
                <Field label="County" value={p.area?.munName || p.area?.countrySecSubd} />
                <Field label="Latitude" value={p.location?.latitude} />
                <Field label="Longitude" value={p.location?.longitude} />
              </Section>

              {/* GeoCode Identifiers — used to query community, school, POI, and sales trend data */}
              {(() => {
                const geoId = findGeoIdV4(p);
                // Also look for area-level geocodes embedded in property responses
                const blockGeoId = p.area?.blockGeoIdV4;
                const blockGroupGeoId = p.area?.blockGroupGeoIdV4;
                const tractGeoId = p.area?.tractGeoIdV4;
                const countyGeoId = p.area?.countyGeoIdV4;
                const placeGeoId = p.area?.placeGeoIdV4;
                const cbsaGeoId = p.area?.cbsaGeoIdV4;
                // Additional geocodes from identifier or nested objects
                const schoolDistGeoId = p.area?.schoolDistrictGeoIdV4;
                const neighborhoodGeoId = p.area?.neighborhoodGeoIdV4;

                const hasAnyGeo = geoId || blockGeoId || tractGeoId || countyGeoId;
                if (!hasAnyGeo) return null;

                return (
                  <Section title="GeoCodes">
                    <Field label="GeoID v4" value={geoId} />
                    <Field label="Census Block" value={blockGeoId} />
                    <Field label="Block Group" value={blockGroupGeoId} />
                    <Field label="Census Tract" value={tractGeoId} />
                    <Field label="County" value={countyGeoId} />
                    <Field label="Place" value={placeGeoId} />
                    <Field label="CBSA" value={cbsaGeoId} />
                    <Field label="School District" value={schoolDistGeoId} />
                    <Field label="Neighborhood" value={neighborhoodGeoId} />
                  </Section>
                );
              })()}

              <Section title="Utilities">
                <Field label="Heating" value={p.utilities?.heatingType} />
                <Field label="Cooling" value={p.utilities?.coolingType} />
                <Field label="Sewer" value={p.utilities?.sewerType} />
                <Field label="Water" value={p.utilities?.waterType} />
                <Field label="Energy" value={p.utilities?.energyType} />
                <Field label="Heating Fuel" value={p.utilities?.heatingFuel} />
              </Section>

              {/* Hawaii Hazard & Environmental Zones */}
              {hazardLoading && (
                <div style={{ textAlign: "center", padding: 16, color: "#6b7280", fontSize: 13 }}>
                  Loading Hawaii environmental data...
                </div>
              )}

              {hazardData && (() => {
                const zones: Array<{ label: string; value: string; color: string; bg: string }> = [];

                if (hazardData.tsunami?.found) {
                  const a = hazardData.tsunami.attributes;
                  const zone = a.evaczone || a.zone || a.type || "Yes";
                  zones.push({ label: "Tsunami Evacuation Zone", value: String(zone), color: "#dc2626", bg: "#fef2f2" });
                }
                if (hazardData.seaLevelRise?.found) {
                  zones.push({ label: "Sea Level Rise Exposure", value: "In 3.2ft SLR coastal flood zone", color: "#0369a1", bg: "#e0f2fe" });
                }
                if (hazardData.lavaFlow?.found) {
                  const a = hazardData.lavaFlow.attributes;
                  const zone = a.hazard || a.zone || a.lavazone || "Yes";
                  zones.push({ label: "Lava Flow Hazard Zone", value: `Zone ${zone}`, color: "#ea580c", bg: "#fff7ed" });
                }
                if (hazardData.cesspoolPriority?.found) {
                  const a = hazardData.cesspoolPriority.attributes;
                  const score = a.priorityscore || a.priority || a.score;
                  zones.push({ label: "Cesspool Priority Area", value: score ? `Priority Score: ${score}` : "In cesspool priority area", color: "#92400e", bg: "#fef3c7" });
                }
                if (hazardData.dhhl?.found) {
                  zones.push({ label: "Hawaiian Home Lands (DHHL)", value: "Property is on DHHL land", color: "#7c3aed", bg: "#f5f3ff" });
                }
                if (hazardData.sma?.found) {
                  zones.push({ label: "Special Management Area (SMA)", value: "Coastal zone — SMA permits may be required", color: "#0891b2", bg: "#ecfeff" });
                }
                if (hazardData.stateLandUse?.found) {
                  const a = hazardData.stateLandUse.attributes;
                  const district = a.district || a.landuse || a.type || a.slu;
                  if (district) {
                    zones.push({ label: "State Land Use District", value: String(district), color: "#374151", bg: "#f3f4f6" });
                  }
                }

                if (zones.length === 0) return null;

                return (
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                      Hawaii Environmental & Hazard Zones
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {zones.map((z, i) => (
                        <div key={i} style={{ padding: "8px 12px", background: z.bg, borderRadius: 8, borderLeft: `4px solid ${z.color}` }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: z.color, textTransform: "uppercase", letterSpacing: 0.5 }}>{z.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginTop: 2 }}>{z.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                      Source: State of Hawaii Statewide GIS Program. Data updated periodically. Verify with county for official determinations.
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {activeSection === "building" && (
            <>
              <Section title="Rooms &amp; Size">
                <Field label="Bedrooms" value={beds} />
                <Field label="Full Baths" value={p.building?.rooms?.bathsFull} />
                <Field label="Half Baths" value={p.building?.rooms?.bathsHalf} />
                <Field label="Total Rooms" value={p.building?.rooms?.roomsTotal} />
                <Field label="Living Area" value={sqft ? `${fmtNum(sqft)} sqft` : undefined} />
                <Field label="Gross Size" value={p.building?.size?.grossSize ? `${fmtNum(p.building.size.grossSize)} sqft` : undefined} />
                <Field label="Ground Floor" value={p.building?.size?.groundFloorSize ? `${fmtNum(p.building.size.groundFloorSize)} sqft` : undefined} />
                <Field label="Stories" value={p.building?.summary?.storyDesc || p.building?.summary?.levels} />
                <Field label="Units" value={p.building?.summary?.unitsCount} />
              </Section>

              <Section title="Construction">
                <Field label="Construction Type" value={p.building?.construction?.constructionType} />
                <Field label="Condition" value={p.building?.construction?.condition} />
                <Field label="Foundation" value={p.building?.construction?.foundationType} />
                <Field label="Frame" value={p.building?.construction?.frameType} />
                <Field label="Roof Cover" value={p.building?.construction?.roofCover} />
                <Field label="Roof Shape" value={p.building?.construction?.roofShape} />
                <Field label="Wall Type" value={p.building?.construction?.wallType} />
                <Field label="Quality" value={p.building?.summary?.quality} />
                <Field label="Arch Style" value={p.building?.summary?.archStyle} />
                <Field label="Building Type" value={p.building?.summary?.bldgType} />
              </Section>

              <Section title="Interior &amp; Extras">
                <Field label="Fireplace Count" value={p.building?.interior?.fplcCount} />
                <Field label="Fireplace Type" value={p.building?.interior?.fplcType} />
                <Field label="Basement Size" value={p.building?.interior?.bsmtSize ? `${fmtNum(p.building.interior.bsmtSize)} sqft` : undefined} />
                <Field label="Basement Type" value={p.building?.interior?.bsmtType} />
                <Field label="Garage Type" value={p.building?.parking?.garageType} />
                <Field label="Parking Size" value={p.building?.parking?.prkgSize ? `${fmtNum(p.building.parking.prkgSize)} sqft` : undefined} />
                <Field label="Parking Spaces" value={p.building?.parking?.prkgSpaces} />
                <Field label="View" value={p.building?.summary?.view} />
              </Section>

              <Section title="Lot">
                <Field label="Lot Size (sqft)" value={p.lot?.lotSize1 ? fmtNum(p.lot.lotSize1) : undefined} />
                <Field label="Lot Size (acres)" value={p.lot?.lotSize2 ? `${p.lot.lotSize2.toFixed(2)} acres` : undefined} />
                <Field label="Lot Number" value={p.lot?.lotNum} />
                <Field label="Pool" value={p.lot?.poolInd === "Y" ? (p.lot.poolType || "Yes") : p.lot?.poolInd === "N" ? "No" : undefined} />
              </Section>
            </>
          )}

          {activeSection === "financial" && (() => {
            // Use inline AVM data, or fall back to separately fetched AVM data
            const avm = p.avm || avmData?.avm;
            // Fallback estimated value: assessment market value → appraised → RentCast AVM
            const fallbackValue = p.assessment?.market?.mktTtlValue
              || p.assessment?.appraised?.apprTtlValue
              || rentcastAvmPrice;
            const hasFallbackValue = !avm?.amount?.value && fallbackValue != null;
            return (
            <>
              {avmLoading && !avm && !hasFallbackValue && (
                <div style={{ textAlign: "center", padding: 20, color: "#6b7280", fontSize: 13 }}>
                  Loading AVM valuation data...
                </div>
              )}

              {avm && (
                <Section title="Automated Valuation (AVM)">
                  <Field label="Estimated Value" value={fmt(avm.amount?.value)} />
                  <Field label="Confidence Range" value={avm.amount?.low != null && avm.amount?.high != null ? `${fmt(avm.amount.low)} – ${fmt(avm.amount.high)}` : fmt(avm.amount?.valueRange)} />
                  {avm.amount?.low != null && avm.amount?.high != null && avm.amount?.value != null && (
                    <Field label="Range Width" value={`±${Math.round(((avm.amount.high - avm.amount.low) / 2 / avm.amount.value) * 100)}%`} />
                  )}
                  <Field label="Source" value={avm._avmSources?.chosen === "rentcast" ? "RentCast" : "Realie (County Records)"} />
                </Section>
              )}

              {/* When no AVM exists, show fallback estimated value from assessment or RentCast */}
              {!avm && hasFallbackValue && (
                <Section title="Estimated Value">
                  <Field label="Estimated Value" value={fmt(fallbackValue)} />
                  <Field label="Source" value={
                    p.assessment?.market?.mktTtlValue ? "Market Assessment"
                      : p.assessment?.appraised?.apprTtlValue ? "Appraised Value"
                        : "Comparable Sales Analysis"
                  } />
                </Section>
              )}

              {!avmLoading && !avm && !hasFallbackValue && (
                <div style={{ padding: "12px 16px", background: "#f9fafb", borderRadius: 8, fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
                  AVM data not available for this property.
                </div>
              )}

              {/* Rental AVM — from /valuation/rentalavm, placed after AVM and before Tax Assessment */}
              {enrichedFinancial && !enrichedFinancialLoading && (() => {
                const resp = enrichedFinancial.rentalAvm;
                if (!resp || resp.error) return null;
                const prop = resp?.property?.[0] || resp;
                const rental = prop?.rentalAvm || prop?.rentalAVM || prop?.rentalavm || prop?.rental_avm;
                const rentValue = rental?.estimatedRentalValue ?? rental?.rentalAmount?.value ?? rental?.amount?.value ?? rental?.value
                  ?? prop?.estimatedRentalValue;
                const rentLow = rental?.estimatedMinRentalValue ?? rental?.rentalAmount?.low ?? rental?.amount?.low ?? rental?.low
                  ?? prop?.estimatedMinRentalValue;
                const rentHigh = rental?.estimatedMaxRentalValue ?? rental?.rentalAmount?.high ?? rental?.amount?.high ?? rental?.high
                  ?? prop?.estimatedMaxRentalValue;
                const rentScr = rental?.confidenceScore ?? rental?.scr ?? rental?.rentalAmount?.scr ?? rental?.amount?.scr;
                const eventDate = rental?.valuationDate ?? rental?.eventDate ?? rental?.calculatedDate
                  ?? prop?.valuationDate;
                const hasData = rentValue != null || rentLow != null || rentHigh != null;
                if (!hasData) return null;
                const avmVal = p.avm?.amount?.value;
                const annualRent = rentValue != null ? rentValue * 12 : null;
                const grossYield = annualRent != null && avmVal ? ((annualRent / avmVal) * 100) : null;
                return (
                  <Section title="Estimated Rental Value (Rental AVM)">
                    <Field label="Est. Monthly Rent" value={rentValue != null ? `$${Number(rentValue).toLocaleString()}/mo` : undefined} />
                    <Field label="Est. Annual Rent" value={annualRent != null ? `${fmt(annualRent)}/yr` : undefined} />
                    <Field label="Low Estimate" value={rentLow != null ? `$${Number(rentLow).toLocaleString()}/mo` : undefined} />
                    <Field label="High Estimate" value={rentHigh != null ? `$${Number(rentHigh).toLocaleString()}/mo` : undefined} />
                    <Field label="Gross Yield" value={grossYield != null ? `${grossYield.toFixed(2)}%` : undefined} />
                    <Field label="Confidence Score" value={rentScr} />
                    <Field label="Valuation Date" value={eventDate} />
                  </Section>
                );
              })()}

              {p.assessment && (() => {
                const tmkKey = p.identifier?.apn;
                const assessQpubLink = tmkKey ? buildQPublicUrl(
                  String(tmkKey),
                  undefined,
                  p.address?.postal1,
                ) : null;
                return (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", margin: 0 }}>Tax Assessment</h3>
                      {assessQpubLink && (
                        <a
                          href={assessQpubLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "5px 12px", background: "#1e40af", color: "#fff",
                            borderRadius: 6, fontSize: 12, fontWeight: 600,
                            textDecoration: "none", whiteSpace: "nowrap",
                          }}
                        >
                          View TMK Records
                          <span style={{ fontSize: 10 }}>&#8599;</span>
                        </a>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px 20px" }}>
                      <Field label="Assessed Total" value={fmt(p.assessment.assessed?.assdTtlValue)} />
                      <Field label="Assessed Land" value={fmt(p.assessment.assessed?.assdLandValue)} />
                      <Field label="Assessed Improvements" value={fmt(p.assessment.assessed?.assdImprValue)} />
                      <Field label="Appraised Total" value={fmt(p.assessment.appraised?.apprTtlValue)} />
                      <Field label="Market Total" value={fmt(p.assessment.market?.mktTtlValue)} />
                      <Field label="Annual Tax" value={fmt(p.assessment.tax?.taxAmt)} />
                      <Field label="Tax Year" value={p.assessment.tax?.taxYear} />
                      <Field label="Tax / Sqft" value={p.assessment.tax?.taxPerSizeUnit ? `$${p.assessment.tax.taxPerSizeUnit.toFixed(2)}` : undefined} />
                    </div>
                  </div>
                );
              })()}


              {p.hoa?.fee && (
                <Section title="HOA">
                  <Field label="Monthly Fee" value={fmt(p.hoa.fee)} />
                  <Field label="Annual Fee" value={fmt(p.hoa.fee * 12)} />
                </Section>
              )}

              {p.mortgage && (
                <Section title="Mortgage">
                  <Field label="Loan Amount" value={fmt(p.mortgage.amount)} />
                  <Field label="Lender" value={p.mortgage.lender?.fullName} />
                  <Field label="Loan Type" value={p.mortgage.loanType} />
                  <Field label="Term" value={p.mortgage.term} />
                  <Field label="Rate Type" value={p.mortgage.interestRateType} />
                  <Field label="Origination Date" value={p.mortgage.date} />
                  <Field label="Due Date" value={p.mortgage.dueDate} />
                </Section>
              )}

              {(p.foreclosure?.actionType || p.foreclosure?.recordingDate || p.foreclosure?.auctionDate || p.foreclosure?.filingDate) && (
                <Section title="Foreclosure">
                  <Field label="Action Type" value={p.foreclosure.actionType} />
                  <Field label="Filing Date" value={p.foreclosure.filingDate} />
                  <Field label="Recording Date" value={p.foreclosure.recordingDate} />
                  <Field label="Auction Date" value={p.foreclosure.auctionDate} />
                  <Field label="Case Number" value={p.foreclosure.caseNumber} />
                  <Field label="Auction Location" value={p.foreclosure.auctionLocation} />
                  <Field label="Default Amount" value={fmt(p.foreclosure.defaultAmount)} />
                  <Field label="Starting Bid" value={fmt(p.foreclosure.startingBid)} />
                  <Field label="Original Loan" value={fmt(p.foreclosure.originalLoanAmount)} />
                  <Field label="Trustee" value={p.foreclosure.trusteeFullName} />
                </Section>
              )}

              {/* Hawaii county-level tax assessment (from Honolulu CCHNL ArcGIS) */}
              {hawaiiLoading && !hawaiiData && (
                <div style={{ textAlign: "center", padding: 20, color: "#6b7280", fontSize: 13 }}>
                  Loading Hawaii tax records...
                </div>
              )}

              {hawaiiData?.honoluluParcel && (
                <>
                  <Section title="Honolulu County Tax Assessment">
                    <Field label="Land Value" value={hawaiiData.honoluluParcel.landvalue != null ? `$${Number(hawaiiData.honoluluParcel.landvalue).toLocaleString()}` : undefined} />
                    <Field label="Building Value" value={hawaiiData.honoluluParcel.bldgvalue != null ? `$${Number(hawaiiData.honoluluParcel.bldgvalue).toLocaleString()}` : undefined} />
                    <Field label="Total Value" value={hawaiiData.honoluluParcel.totalvalue != null ? `$${Number(hawaiiData.honoluluParcel.totalvalue).toLocaleString()}` : undefined} />
                    <Field label="Exemption" value={hawaiiData.honoluluParcel.exemption != null ? `$${Number(hawaiiData.honoluluParcel.exemption).toLocaleString()}` : undefined} />
                    <Field label="Taxable Value" value={hawaiiData.honoluluParcel.taxable != null ? `$${Number(hawaiiData.honoluluParcel.taxable).toLocaleString()}` : undefined} />
                    <Field label="Tax Amount" value={hawaiiData.honoluluParcel.taxamount != null ? `$${Number(hawaiiData.honoluluParcel.taxamount).toLocaleString()}` : undefined} />
                    <Field label="Tax Year" value={hawaiiData.honoluluParcel.taxyear} />
                  </Section>

                  <Section title="Honolulu Parcel Details">
                    <Field label="Parcel Type" value={hawaiiData.honoluluParcel.type} />
                    <Field label="Zoning" value={hawaiiData.honoluluParcel.zoning} />
                    <Field label="Land Area" value={hawaiiData.honoluluParcel.landarea != null ? `${Number(hawaiiData.honoluluParcel.landarea).toLocaleString()} sqft` : undefined} />
                    <Field label="Land Area (sf)" value={hawaiiData.honoluluParcel.landareasf != null ? `${Number(hawaiiData.honoluluParcel.landareasf).toLocaleString()} sqft` : undefined} />
                  </Section>
                </>
              )}

              {/* ── Enriched Financial Data (loaded on tab open) ── */}
              {enrichedFinancialLoading && (
                <div style={{ textAlign: "center", padding: 20, color: "#6b7280", fontSize: 13 }}>
                  Loading additional financial data...
                </div>
              )}

              {/* Mortgage & Foreclosure — from Realie primary response */}
              {(() => {
                const m = p.mortgage;
                const fc = (p as any).foreclosure;
                const hasMortgage = m && (m.amount != null || m.lender?.fullName || m.lienCount != null || m.financingHistoryCount != null);
                const hasForeclosure = fc && (fc.actionType || fc.recordingDate || fc.auctionDate);
                if (!hasMortgage && !hasForeclosure) return null;

                return (
                  <>
                    {hasMortgage && (
                      <Section title="Mortgage">
                        <Field label="Loan Amount" value={m.amount != null ? fmt(Number(m.amount)) : undefined} />
                        <Field label="Lender" value={m.lender?.fullName} />
                        <Field label="Outstanding Loans" value={m.lienCount != null ? `${m.lienCount} lien${Number(m.lienCount) !== 1 ? 's' : ''}` : undefined} />
                        <Field label="Financing History" value={m.financingHistoryCount != null ? `${m.financingHistoryCount} loans` : undefined} />
                      </Section>
                    )}
                    {hasForeclosure && (
                      <Section title="Foreclosure">
                        <Field label="Status" value={fc.actionType} />
                        <Field label="Filing Date" value={fc.filingDate} />
                        <Field label="Recording Date" value={fc.recordingDate} />
                        <Field label="Auction Date" value={fc.auctionDate} />
                        <Field label="Case Number" value={fc.caseNumber} />
                      </Section>
                    )}
                  </>
                );
              })()}

              {/* AVM History — value trend over time */}
              {enrichedFinancial?.avmHistory && (() => {
                const props = enrichedFinancial.avmHistory.property || [];
                // Each property entry may have an avm with eventDate
                const history = props
                  .map((pp: any) => ({
                    date: pp.avm?.eventDate || pp.avm?.calculatedDate,
                    value: pp.avm?.amount?.value,
                    low: pp.avm?.amount?.low,
                    high: pp.avm?.amount?.high,
                    scr: pp.avm?.amount?.scr,
                  }))
                  .filter((h: any) => h.value != null)
                  .sort((a: any, b: any) => (a.date || "").localeCompare(b.date || ""));

                if (history.length === 0) return null;

                // Compute overall value change
                const firstVal = history[0].value;
                const lastVal = history[history.length - 1].value;
                const change = firstVal && lastVal ? ((lastVal - firstVal) / firstVal * 100) : null;

                return (
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 4, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                      AVM Value History
                    </h3>
                    {change != null && (
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, color: change >= 0 ? "#059669" : "#dc2626" }}>
                          {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                        </span> change over {history.length} data points
                      </div>
                    )}
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Date</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Value</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Range</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((h: any, i: number) => (
                            <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                              <td style={{ padding: "6px 8px", fontWeight: 500 }}>{h.date || "—"}</td>
                              <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{fmt(h.value)}</td>
                              <td style={{ padding: "6px 8px", textAlign: "right", fontSize: 11, color: "#6b7280" }}>
                                {h.low != null && h.high != null ? `${fmt(h.low)} – ${fmt(h.high)}` : "—"}
                              </td>
                              <td style={{ padding: "6px 8px", textAlign: "right" }}>{h.scr ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Sales History — sourced from Realie (transfers[]) or RentCast (history dict) */}
              {(() => {
                const saleHistory = p.saleHistory || [];
                if (saleHistory.length === 0) return null;
                const sqft = p.building?.size?.livingSize || p.building?.size?.universalSize;
                return (
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                      Sales History ({saleHistory.length} transaction{saleHistory.length !== 1 ? "s" : ""})
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {saleHistory.map((s: any, i: number) => {
                        const pricePerSqft = s.amount && sqft ? Math.round(s.amount / sqft) : null;
                        return (
                          <div key={i} style={{ padding: "12px 14px", background: i === 0 ? "#eff6ff" : "#f9fafb", borderRadius: 8, borderLeft: i === 0 ? "4px solid #3b82f6" : "3px solid #e5e7eb" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
                                  {s.amount != null && s.amount > 0 ? fmt(s.amount) : "Price Not Disclosed"}
                                </div>
                                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                                  {[s.date, s.deedType].filter(Boolean).join(" · ")}
                                </div>
                              </div>
                              {pricePerSqft != null && pricePerSqft > 0 && (
                                <div style={{ fontSize: 12, color: "#6b7280" }}>${pricePerSqft.toFixed(0)}/sqft</div>
                              )}
                            </div>
                            {(s.buyerName || s.sellerName) && (
                              <div style={{ fontSize: 12, color: "#374151", marginTop: 6, lineHeight: 1.5 }}>
                                {s.sellerName && <div><span style={{ color: "#9ca3af", fontWeight: 500, fontSize: 11 }}>Seller:</span> {s.sellerName}</div>}
                                {s.buyerName && <div><span style={{ color: "#9ca3af", fontWeight: 500, fontSize: 11 }}>Buyer:</span> {s.buyerName}</div>}
                              </div>
                            )}
                            <div style={{ marginTop: 4, fontSize: 11, color: "#9ca3af" }}>
                              Source: {s._source === "realie" ? "Realie (County Records)" : "RentCast"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Home Equity — estimated equity position from /valuation/homeequity */}
              {enrichedFinancial && !enrichedFinancialLoading && (() => {
                const resp = enrichedFinancial.homeEquity;
                const prop = resp?.property?.[0] || resp;
                const he = prop?.homeEquity || prop?.valuation || prop;
                const avmValue = he?.avmValue ?? he?.avm?.amount?.value ?? he?.estimatedValue;
                const loanBalance = he?.outstandingBalance ?? he?.loanBalance ?? he?.mortgageBalance ?? he?.estimatedBalance;
                const equityAmount = he?.equity ?? he?.equityAmount ?? (avmValue != null && loanBalance != null ? avmValue - loanBalance : null);
                // Compute LTV from values when data source returns 0 or missing
                const rawLtv = he?.loanToValue ?? he?.ltv;
                const ltv = (rawLtv != null && rawLtv > 0) ? rawLtv : (avmValue && loanBalance ? (loanBalance / avmValue * 100) : null);
                const loanCount = he?.loanCount ?? he?.numberOfLoans;
                const estimatedPayment = he?.estimatedPayment ?? he?.monthlyPayment;
                // Fall back to property-level sale data when homeEquity doesn't include it
                const lastSalePrice = he?.lastSalePrice ?? he?.salePrice ?? p.sale?.amount?.saleAmt;
                const lastSaleDate = he?.lastSaleDate ?? he?.saleDate ?? p.sale?.amount?.saleRecDate ?? p.sale?.amount?.saleTransDate;

                const hasData = avmValue != null || loanBalance != null || equityAmount != null;
                const isPositive = equityAmount != null ? equityAmount >= 0 : true;

                // Show the section when we have any meaningful data (value, equity, or loan info)
                if (!hasData) return null;

                return (
                  <div style={{ marginBottom: 20, padding: "14px 18px", background: hasData ? (isPositive ? "#ecfdf5" : "#fef2f2") : "#f9fafb", borderRadius: 10, border: `1px solid ${hasData ? (isPositive ? "#a7f3d0" : "#fecaca") : "#e5e7eb"}` }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: hasData ? (isPositive ? "#059669" : "#dc2626") : "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Home Equity Analysis</div>
                    {!hasData ? (
                      <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>Not Disclosed</div>
                    ) : (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginTop: 8 }}>
                          <div>
                            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Estimated Value</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{avmValue != null ? fmt(avmValue) : "Not Disclosed"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Est. Loan Balance</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{loanBalance != null ? fmt(loanBalance) : "Not Disclosed"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Est. Equity</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: equityAmount != null ? (isPositive ? "#059669" : "#dc2626") : "#9ca3af" }}>
                              {equityAmount != null ? `${equityAmount >= 0 ? "+" : ""}${fmt(equityAmount)}` : "Not Disclosed"}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Loan-to-Value</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: ltv != null ? (Number(ltv) > 80 ? "#dc2626" : "#059669") : "#9ca3af" }}>
                              {ltv != null ? `${Number(ltv).toFixed(1)}%` : "Not Disclosed"}
                            </div>
                          </div>
                        </div>
                        {/* Additional equity details */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 10, fontSize: 12, color: "#374151" }}>
                          {loanCount != null && loanCount > 0 && <span><strong>Active Loans:</strong> {loanCount}</span>}
                          {estimatedPayment != null && estimatedPayment > 0 && <span><strong>Est. Monthly Payment:</strong> {fmt(estimatedPayment)}</span>}
                          <span><strong>Last Sale:</strong> {lastSalePrice != null ? fmt(lastSalePrice) : "Not Disclosed"}</span>
                          <span><strong>Sale Date:</strong> {lastSaleDate || "Not Disclosed"}</span>
                          {p.sale?.amount?.saleRecDate && <span><strong>Recording Date:</strong> {p.sale.amount.saleRecDate}</span>}
                          {p.sale?.amount?.saleDocType && <span><strong>Document Type:</strong> {p.sale.amount.saleDocType}</span>}
                          {p.sale?.amount?.saleCode && <span><strong>Sale Code:</strong> {p.sale.amount.saleCode}</span>}
                          {p.sale?.amount?.pricePerBed != null && <span><strong>Price / Bed:</strong> {fmt(p.sale.amount.pricePerBed)}</span>}
                          {p.sale?.amount?.pricePerSizeUnit != null && <span><strong>Price / Sqft:</strong> ${p.sale.amount.pricePerSizeUnit.toFixed(2)}</span>}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

            </>
            );
          })()}

          {/* ── Comps Tab ─────────────────────────────────────────────── */}
          {activeSection === "comps" && (() => {
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {rentcastCompsLoading && (
                  <div style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>Loading comparable sales...</div>
                    <div style={{ fontSize: 13 }}>Searching for recent sales nearby</div>
                  </div>
                )}

                {rentcastCompsError && (
                  <div style={{ padding: 16, borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 13 }}>
                    {rentcastCompsError}
                  </div>
                )}

                <div style={{ padding: 10, borderRadius: 8, background: "#fffbeb", border: "1px solid #fde68a", marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: "#92400e", lineHeight: 1.5, margin: 0 }}>
                    These comparable properties are estimates only and are not a substitute for official comps generated by a certified real estate appraiser.
                  </p>
                </div>

                {rentcastComps && rentcastComps.length > 0 && (
                  <div>
                    {(p.avm?.amount?.value || rentcastAvmPrice) && (
                      <div style={{ padding: 12, borderRadius: 8, marginBottom: 12, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                        <div style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>Estimated Value (AVM)</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#15803d" }}>
                          {fmt(p.avm?.amount?.value ?? rentcastAvmPrice ?? undefined)}
                        </div>
                        {p.avm?.amount?.low != null && p.avm?.amount?.high != null && (
                          <div style={{ fontSize: 11, color: "#166534", marginTop: 2 }}>
                            Range: {fmt(p.avm.amount.low)} – {fmt(p.avm.amount.high)}
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1f2937", marginBottom: 8 }}>
                      Comparable Properties ({rentcastComps.length})
                    </div>
                    {rentcastComps.map((comp: any, i: number) => {
                      const compPrice = comp.closePrice || comp.price;
                      const cPpsf = compPrice && comp.squareFootage ? Math.round(compPrice / comp.squareFootage) : comp.pricePerSqft;
                      const correlationPct = comp.correlation != null ? Math.round(comp.correlation * 100) : null;
                      const isMls = comp.source === "mls";
                      return (
                        <div key={comp.listingKey || comp.id || i} style={{
                          padding: 12, borderRadius: 8, marginBottom: 8,
                          background: "#fff", border: `1px solid ${isMls ? "#bfdbfe" : "#e5e7eb"}`,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "#1f2937" }}>{comp.address || comp.formattedAddress}</div>
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              {isMls && (
                                <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "#1e40af", color: "#fff" }}>MLS</span>
                              )}
                              {correlationPct != null && (
                                <span style={{
                                  fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                                  background: correlationPct >= 90 ? "#dcfce7" : correlationPct >= 70 ? "#fef9c3" : "#fee2e2",
                                  color: correlationPct >= 90 ? "#166534" : correlationPct >= 70 ? "#854d0e" : "#991b1b",
                                }}>
                                  {correlationPct}% match
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#6b7280", flexWrap: "wrap" }}>
                            {compPrice != null && <span style={{ fontWeight: 600, color: "#166534" }}>${compPrice.toLocaleString()}{isMls ? " (sold)" : ""}</span>}
                            {comp.closeDate && <span>Closed {new Date(comp.closeDate).toLocaleDateString()}</span>}
                            {comp.listPrice != null && comp.closePrice != null && comp.listPrice !== comp.closePrice && (
                              <span>List: ${comp.listPrice.toLocaleString()}</span>
                            )}
                            {comp.bedrooms != null && <span>{comp.bedrooms} bed</span>}
                            {comp.bathrooms != null && <span>{comp.bathrooms} bath</span>}
                            {comp.squareFootage != null && <span>{comp.squareFootage.toLocaleString()} sqft</span>}
                            {comp.yearBuilt != null && <span>Built {comp.yearBuilt}</span>}
                            {cPpsf && <span>${cPpsf}/sqft</span>}
                            {comp.distance != null && <span>{comp.distance.toFixed(1)} mi</span>}
                            {comp.daysOnMarket != null && <span>{comp.daysOnMarket} DOM</span>}
                          </div>
                          {isMls && (comp.listAgentName || comp.buyerAgentName) && (
                            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                              {comp.listAgentName && `List: ${comp.listAgentName}`}
                              {comp.listAgentName && comp.buyerAgentName && " | "}
                              {comp.buyerAgentName && `Buyer: ${comp.buyerAgentName}`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {rentcastComps && rentcastComps.length === 0 && !rentcastCompsLoading && (
                  <div style={{ padding: 16, textAlign: "center", color: "#6b7280", fontSize: 13 }}>
                    No comparable properties found.
                  </div>
                )}
              </div>
            );
          })()}


          {activeSection === "ownership" && (() => {
            // Resolve TMK: prefer Hawaii statewide parcel data (12-digit QPublic-compatible format)
            const tmkValue = hawaiiData?.parcel?.tmk_txt || hawaiiData?.parcel?.tmk || hawaiiData?.parcel?.cty_tmk || (hawaiiData?.owners?.[0]?.tmk) || null;
            // APN as fallback display
            const attomApn = p.identifier?.apn || null;

            // Build QPublic direct report link from TMK + county-specific AppID
            const qpubLink = (() => {
              if (hawaiiData?.parcel?.qpub_link) return hawaiiData.parcel.qpub_link;

              const keySource = tmkValue ? String(tmkValue) : attomApn;
              if (!keySource) return null;

              return buildQPublicUrl(
                keySource,
                hawaiiData?.parcel?.county,
                p.address?.postal1,
              );
            })();
            // Display TMK: prefer Hawaii source, fall back to converted APN
            const displayTmk = tmkValue || (attomApn ? attomApn.replace(/[-\s.]/g, "").slice(1).padEnd(12, "0") : null);

            return (
            <>
              {/* TMK Quick Access — always visible when TMK is known */}
              {(displayTmk || attomApn) && (
                <div style={{ marginBottom: 20, padding: "14px 18px", background: "#f0f9ff", borderRadius: 10, border: "1px solid #bfdbfe" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#3b82f6", textTransform: "uppercase", letterSpacing: 0.5 }}>TMK (Tax Map Key)</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#1e40af", fontFamily: "monospace", marginTop: 2 }}>{displayTmk || attomApn}</div>
                    </div>
                    {qpubLink && (
                      <a
                        href={qpubLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "8px 16px", background: "#1e40af", color: "#fff",
                          borderRadius: 8, fontSize: 13, fontWeight: 600,
                          textDecoration: "none", whiteSpace: "nowrap",
                        }}
                      >
                        View TMK Records
                        <span style={{ fontSize: 11 }}>&#8599;</span>
                      </a>
                    )}
                  </div>
                  {!qpubLink && hawaiiLoading && (
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
                      Loading Hawaii public records...
                    </div>
                  )}
                </div>
              )}

              {/* Current Owner — resolve from p.owner, assessment.owner, or enrichedOwner */}
              {(() => {
                const topOwner = p.owner;
                const assessOwner = p.assessment?.owner;
                const hasTop = topOwner?.owner1?.fullName || topOwner?.owner2?.fullName || topOwner?.owner3?.fullName
                  || topOwner?.corporateIndicator || (topOwner?.mailingAddressOneLine && topOwner.mailingAddressOneLine.trim());
                // Also use enrichedOwner as fallback (fetched from detailmortgageowner on Ownership tab)
                const enrichedOw = enrichedOwner
                  ? (enrichedOwner.property?.[0] || enrichedOwner)?.owner
                    || (enrichedOwner.property?.[0] || enrichedOwner)?.assessment?.owner
                  : undefined;
                const baseOwner = hasTop ? topOwner : (assessOwner ? { ...topOwner, ...assessOwner } : topOwner);
                const hasBase = baseOwner?.owner1?.fullName || baseOwner?.owner2?.fullName || baseOwner?.owner3?.fullName
                  || baseOwner?.corporateIndicator || (baseOwner?.mailingAddressOneLine && baseOwner.mailingAddressOneLine.trim());
                const owner = hasBase ? baseOwner : (enrichedOw ? { ...baseOwner, ...enrichedOw } : baseOwner);
                const ownerMailing = owner?.mailingAddressOneLine?.trim();
                return (
                  <Section title="Current Owner">
                    <Field label="Owner 1" value={owner?.owner1?.fullName} />
                    <Field label="Owner 2" value={owner?.owner2?.fullName} />
                    <Field label="Owner 3" value={owner?.owner3?.fullName} />
                    <Field label="Owner 4" value={owner?.owner4?.fullName} />
                    {/* Fallback: show mortgagor (borrower) from mortgage record when owner fields are empty */}
                    {!owner?.owner1?.fullName && !owner?.owner2?.fullName && !owner?.owner3?.fullName && (() => {
                      const m = p.mortgage as any;
                      const fc = m?.FirstConcurrent;
                      // Also check enrichedOwner mortgage as fallback source for borrower names
                      const em = (enrichedOwner?.property?.[0] || enrichedOwner)?.mortgage as any;
                      const efc = em?.FirstConcurrent || em?.firstConcurrent;
                      const b1 = m?.borrower1?.fullName || fc?.borrower1?.fullName || em?.borrower1?.fullName || efc?.borrower1?.fullName;
                      const b2 = m?.borrower2?.fullName || fc?.borrower2?.fullName || em?.borrower2?.fullName || efc?.borrower2?.fullName;
                      const vest = m?.borrowerVesting || fc?.borrowerVesting || em?.borrowerVesting || efc?.borrowerVesting;
                      if (!b1 && !b2 && !vest) return null;
                      return (
                        <>
                          {b1 && <Field label="Owner (via Mortgage)" value={b1} />}
                          {b2 && <Field label="Owner 2 (via Mortgage)" value={b2} />}
                          {vest && <Field label="Vesting" value={vest} />}
                        </>
                      );
                    })()}
                    <Field label="Owner Type" value={owner?.type} />
                    <Field label="Corporate" value={owner?.corporateIndicator === "Y" ? "Yes" : owner?.corporateIndicator === "N" ? "No" : undefined} />
                    <Field label="Mailing Address" value={ownerMailing || undefined} />
                    {/* Fallback: show mortgagor mailing address when owner mailing is empty */}
                    {!ownerMailing && (() => {
                      const m = p.mortgage as any;
                      const fc = m?.FirstConcurrent;
                      const em = (enrichedOwner?.property?.[0] || enrichedOwner)?.mortgage as any;
                      const efc = em?.FirstConcurrent || em?.firstConcurrent;
                      const street = m?.borrowerMailFullStreetAddress || fc?.borrowerMailFullStreetAddress
                        || em?.borrowerMailFullStreetAddress || efc?.borrowerMailFullStreetAddress;
                      if (!street) return null;
                      const city = m?.borrowerMailCity || fc?.borrowerMailCity || em?.borrowerMailCity || efc?.borrowerMailCity || "";
                      const state = m?.borrowerMailState || fc?.borrowerMailState || em?.borrowerMailState || efc?.borrowerMailState || "";
                      const zipVal = m?.borrowerMailZip || fc?.borrowerMailZip || em?.borrowerMailZip || efc?.borrowerMailZip || "";
                      return <Field label="Mailing (via Mortgage)" value={[street, city, state, zipVal].filter(Boolean).join(", ")} />;
                    })()}
                    <Field label="Relationship" value={owner?.ownerRelationshipType} />
                    <Field label="Rights" value={owner?.ownerRelationshipRights} />
                    <Field label="Absentee Status" value={(() => {
                      const status = (owner?.absenteeOwnerStatus || "").toUpperCase();
                      const ind = (p.summary?.absenteeInd || "").toUpperCase();
                      if (status.includes("ABSENTEE") || ind.includes("ABSENTEE") || ind === "A") return "Absentee Owner";
                      if (status.includes("OWNER") || ind.includes("OWNER OCC") || ind === "O" || ind === "S") return "Owner Occupied";
                      return owner?.absenteeOwnerStatus || undefined;
                    })()} />
                  </Section>
                );
              })()}

              {/* Last Sale Summary — always visible from base property data */}
              {(p.sale?.amount?.saleAmt || p.sale?.amount?.saleTransDate || p.sale?.amount?.saleRecDate) && (() => {
                const sa = p.sale?.amount as any;
                return (
                  <Section title="Last Sale">
                    <Field label="Sale Price" value={fmt(sa?.saleAmt || sa?.salePrice)} />
                    <Field label="Sale Date" value={sa?.saleTransDate || sa?.saleRecDate} />
                    <Field label="Recording Date" value={sa?.saleRecDate} />
                    <Field label="Transaction Type" value={sa?.saleTransType} />
                    <Field label="Document Type" value={sa?.saleDocType} />
                    <Field label="Price/sqft" value={sa?.pricePerSizeUnit != null ? `$${Number(sa.pricePerSizeUnit).toFixed(0)}` : undefined} />
                  </Section>
                );
              })()}

              {/* Enriched owner data from detailmortgageowner endpoint */}
              {enrichedOwnerLoading && (
                <div style={{ textAlign: "center", padding: 12, color: "#6b7280", fontSize: 13 }}>
                  Loading detailed ownership records...
                </div>
              )}

              {enrichedOwner && (() => {
                // The detailmortgageowner response wraps data in { property: [{ owner, mortgage, ... }] }
                // or the prop-level fields may already be extracted
                const ownerProp = enrichedOwner.property?.[0] || enrichedOwner;
                // Also check assessment.owner (may be nested in some responses)
                const eo = ownerProp?.owner || ownerProp?.assessment?.owner || enrichedOwner.owner || enrichedOwner;
                const anyOwner = eo?.owner1?.fullName || eo?.owner1?.lastName || eo?.owner2?.fullName
                  || eo?.mailingAddressOneLine || eo?.absenteeOwnerStatus || eo?.corporateIndicator;
                if (!anyOwner) return null;
                return (
                  <Section title="Detailed Owner Information">
                    {[1, 2, 3, 4].map((n) => {
                      const o = eo?.[`owner${n}`];
                      if (!o?.fullName && !o?.lastName) return null;
                      return (
                        <div key={n} style={{ gridColumn: "1 / -1" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>
                            Owner {n}: {o.fullName || [o.firstNameAndMi, o.lastName].filter(Boolean).join(" ")}
                          </div>
                        </div>
                      );
                    })}
                    <Field label="Corporate Owner" value={eo?.corporateIndicator === "Y" ? "Yes" : eo?.corporateIndicator === "N" ? "No" : undefined} />
                    <Field label="Relationship Type" value={eo?.ownerRelationshipType} />
                    <Field label="Rights" value={eo?.ownerRelationshipRights} />
                    <Field label="Mailing Address" value={eo?.mailingAddressOneLine} />
                    <Field label="Owner Occupied" value={eo?.ownerOccupied === "Y" ? "Yes" : eo?.ownerOccupied === "N" ? "No" : undefined} />
                    <Field label="Absentee Status" value={eo?.absenteeOwnerStatus} />
                  </Section>
                );
              })()}

              {/* Mortgage lender info from enriched owner (detailmortgageowner) */}
              {enrichedOwner && (() => {
                // Handle both property[0].mortgage and direct .mortgage paths
                const ownerProp = enrichedOwner.property?.[0] || enrichedOwner;
                const m = ownerProp?.mortgage || enrichedOwner?.mortgage;
                if (!m) return null;
                const m1 = m.firstConcurrent || m;
                const m2 = m.secondConcurrent;
                const hasData = m1?.lender?.fullName || m1?.companyName || m1?.lenderName || m1?.amount || m2;
                if (!hasData) return null;

                return (
                  <>
                    {m1 && (m1.lender?.fullName || m1.companyName || m1.lenderName || m1.amount) && (
                      <Section title="Current Mortgage Holder">
                        <Field label="Lender" value={m1.lender?.fullName || m1.companyName || m1.lenderName} />
                        <Field label="Loan Amount" value={m1.amount != null ? fmt(Number(m1.amount)) : undefined} />
                        <Field label="Loan Type" value={m1.loanType || m1.loanTypeCode} />
                        <Field label="Interest Rate" value={m1.interestRate != null ? `${m1.interestRate}%` : undefined} />
                        <Field label="Rate Type" value={m1.interestRateType} />
                        <Field label="Term" value={m1.term} />
                        <Field label="Origination" value={m1.date || m1.recordingDate} />
                        <Field label="Due Date" value={m1.dueDate} />
                        <Field label="Document Number" value={m1.documentNumber || m1.docNumber} />
                      </Section>
                    )}
                    {m2 && (m2.lender?.fullName || m2.companyName || m2.lenderName || m2.amount) && (
                      <Section title="Second Mortgage / Equity Line">
                        <Field label="Lender" value={m2.lender?.fullName || m2.companyName || m2.lenderName} />
                        <Field label="Loan Amount" value={m2.amount != null ? fmt(Number(m2.amount)) : undefined} />
                        <Field label="Loan Type" value={m2.loanType || m2.loanTypeCode} />
                        <Field label="Interest Rate" value={m2.interestRate != null ? `${m2.interestRate}%` : undefined} />
                        <Field label="Origination" value={m2.date || m2.recordingDate} />
                      </Section>
                    )}
                  </>
                );
              })()}

              {(() => {
                // Resolve owner for Occupancy section — same assessment.owner fallback
                const topO = p.owner;
                const assO = p.assessment?.owner;
                const hasTopO = topO?.owner1?.fullName || topO?.owner2?.fullName || topO?.owner3?.fullName
                  || topO?.corporateIndicator || (topO?.mailingAddressOneLine && topO.mailingAddressOneLine.trim());
                const occOwner = hasTopO ? topO : (assO ? { ...topO, ...assO } : topO);
                return (
                  <Section title="Occupancy">
                    <Field label="Owner Occupied" value={(() => {
                      const val = (occOwner?.ownerOccupied || "").toUpperCase();
                      if (val === "Y" || val === "1" || val === "YES" || val === "TRUE") return "Yes";
                      if (val === "N" || val === "0" || val === "NO" || val === "FALSE") return "No";
                      return occOwner?.ownerOccupied || undefined;
                    })()} />
                    <Field label="Absentee Status" value={(() => {
                      // Check owner.absenteeOwnerStatus first
                      const ownerStatus = (occOwner?.absenteeOwnerStatus || "").toUpperCase();
                      if (ownerStatus.includes("ABSENTEE")) return "Absentee Owner";
                      if (ownerStatus.includes("OWNER") && ownerStatus.includes("OCC")) return "Owner Occupied";
                      if (ownerStatus === "A") return "Absentee Owner";
                      if (ownerStatus === "O" || ownerStatus === "S") return "Owner Occupied";

                      // Check summary.absenteeInd — "A"/"ABSENTEE" = absentee, "O"/"OWNER OCCUPIED" = occupied
                      const ind = (p.summary?.absenteeInd || "").toUpperCase();
                      if (ind.includes("ABSENTEE") || ind === "A") return "Absentee Owner";
                      if (ind === "O" || ind === "S" || ind.includes("OWNER OCC")) return "Owner Occupied";

                      // Derive from ownerOccupied flag (case-insensitive to match isAbsenteeOwner logic)
                      const occupied = (occOwner?.ownerOccupied || "").toUpperCase();
                      if (occupied === "N" || occupied === "0" || occupied === "NO" || occupied === "FALSE") return "Absentee Owner";
                      if (occupied === "Y" || occupied === "1" || occupied === "YES" || occupied === "TRUE") return "Owner Occupied";

                      // Fallback to search context (e.g. when prospecting for absentee owners)
                      if (searchContext?.absenteeowner === "absentee") return "Absentee Owner";
                      if (searchContext?.absenteeowner === "occupied") return "Owner Occupied";

                      return undefined;
                    })()} />
                    <Field label="Mailing Address" value={occOwner?.mailingAddressOneLine?.trim() || undefined} />
                  </Section>
                );
              })()}

              {/* Hawaii State Data — deed owners from Honolulu OWNALL + statewide parcel */}
              {hawaiiLoading && (
                <div style={{ textAlign: "center", padding: 20, color: "#6b7280", fontSize: 13 }}>
                  Loading Hawaii public records...
                </div>
              )}

              {hawaiiData?.owners?.length > 0 && (
                <Section title="Deed Owners (Hawaii Public Records)">
                  {hawaiiData.owners.map((owner: any, i: number) => (
                    <Field
                      key={i}
                      label={`Owner ${owner.ownseq || i + 1}${owner.owntype ? ` (${owner.owntype})` : ""}`}
                      value={owner.owner}
                    />
                  ))}
                </Section>
              )}

              {hawaiiData?.parcel && (
                <Section title="State Parcel Record">
                  <Field label="TMK" value={hawaiiData.parcel.tmk_txt || hawaiiData.parcel.tmk} />
                  <Field label="County" value={hawaiiData.parcel.county} />
                  <Field label="Island" value={hawaiiData.parcel.island} />
                  <Field label="Zone" value={hawaiiData.parcel.zone} />
                  <Field label="Section" value={hawaiiData.parcel.section} />
                  <Field label="Plat" value={hawaiiData.parcel.plat} />
                  <Field label="Parcel" value={hawaiiData.parcel.parcel} />
                  <Field label="GIS Acres" value={hawaiiData.parcel.gisacres != null ? `${Number(hawaiiData.parcel.gisacres).toFixed(2)} acres` : undefined} />
                </Section>
              )}

              {hawaiiData && (
                <div style={{ marginTop: 8, padding: 10, background: "#f0f9ff", borderRadius: 8, fontSize: 11, color: "#6b7280" }}>
                  Source: State of Hawaii Statewide GIS Program &amp; City &amp; County of Honolulu OWNALL.
                  Public data updated periodically. Parcel boundaries are for visual reference only.
                </div>
              )}
            </>
            );
          })()}

          {activeSection === "neighborhood" && (
            <>
              {neighborhoodLoading && (
                <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                  Loading neighborhood data...
                </div>
              )}

              {!neighborhoodLoading && !neighborhoodData && (
                <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                  Neighborhood data not available. Connect the property data integration to access community intelligence.
                </div>
              )}

              {neighborhoodData && (() => {
                // ── Extract v4 community data ──
                // v4 response: { community: { geography: {...}, demographics: {...}, crime: {...}, climate: {...}, airQuality: {...}, naturalDisasters: {...} } }
                const communityRaw = neighborhoodData.community;
                const communityObj = communityRaw?.community || communityRaw?.response?.result?.community;
                const geo = communityObj?.geography;
                const demo = communityObj?.demographics;
                const crime = communityObj?.crime;
                const climate = communityObj?.climate;
                const airQuality = communityObj?.airQuality;
                const naturalDisasters = communityObj?.naturalDisasters;
                const hasCommunity = !!(demo || crime || climate);

                // Helper: get a field by exact v4 snake_Case_Name from demographics
                const d = (key: string) => demo?.[key];
                const pct = (key: string) => { const v = d(key); return v != null ? `${v}%` : undefined; };

                // Extract school data — v4 returns { school: [...] } or v1 format
                const schoolsRaw = neighborhoodData.schools;
                const schools = schoolsRaw?.school
                  || schoolsRaw?.response?.result?.package?.item
                  || schoolsRaw?.result?.package?.item
                  || schoolsRaw?.property?.[0]?.school
                  || (Array.isArray(schoolsRaw) ? schoolsRaw : []);
                const schoolList = Array.isArray(schools) ? schools : schools ? [schools] : [];

                // Extract school district data (if embedded in the response)
                const districtRaw = schoolsRaw?.district || null;

                // Extract POI data — v4 returns { poi: [...] }
                const poiRaw = neighborhoodData.poi;
                const poiItems = poiRaw?.poi
                  || poiRaw?.response?.result?.package?.item
                  || poiRaw?.result?.package?.item
                  || poiRaw?.package?.item
                  || poiRaw?.item
                  || (Array.isArray(poiRaw) ? poiRaw : []);
                const poiList = Array.isArray(poiItems) ? poiItems : poiItems ? [poiItems] : [];

                if (!hasCommunity && schoolList.length === 0 && poiList.length === 0) {
                  return (
                    <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                      No neighborhood data found for this property. This may occur if the area is not covered by the community data provider.
                    </div>
                  );
                }

                // Index color helper for 100-base indexes
                const idxColor = (v: number) => v >= 150 ? "#dc2626" : v >= 120 ? "#d97706" : v >= 80 ? "#059669" : "#3b82f6";
                const idxLabel = (v: number) => v >= 150 ? "High" : v >= 120 ? "Above Avg" : v >= 80 ? "Average" : "Below Avg";

                return (
                  <>
                    {/* Geography Name */}
                    {geo?.geographyName && (
                      <div style={{ marginBottom: 16, padding: "10px 14px", background: "#f0f9ff", borderRadius: 8, borderLeft: "4px solid #3b82f6" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e40af" }}>{geo.geographyName}</div>
                        {geo.geographyTypeName && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{geo.geographyTypeName}</div>}
                      </div>
                    )}

                    {/* Demographics Overview */}
                    {demo && (
                      <Section title="Demographics">
                        <Field label="Population" value={d("population") != null ? Number(d("population")).toLocaleString() : undefined} />
                        <Field label="5-Yr Projection" value={d("population_5_Yr_Projection") != null ? Number(d("population_5_Yr_Projection")).toLocaleString() : undefined} />
                        <Field label="Pop Density" value={d("population_Density_Sq_Mi") != null ? `${Number(d("population_Density_Sq_Mi")).toLocaleString()}/sqmi` : undefined} />
                        <Field label="Pop Growth (10yr)" value={pct("population_Chg_Pct_2010")} />
                        <Field label="Median Age" value={d("median_Age")} />
                        <Field label="Households" value={d("households") != null ? Number(d("households")).toLocaleString() : undefined} />
                        <Field label="Avg Household Size" value={d("household_Size_Avg")} />
                        <Field label="Family Households" value={pct("households_Family_Pct")} />
                        <Field label="Owner Occupied" value={pct("housing_Units_Owner_Occupied_Pct")} />
                        <Field label="Renter Occupied" value={pct("housing_Units_Renter_Occupied_Pct")} />
                        <Field label="Vacant Units" value={pct("housing_Units_Vacant_Pct")} />
                        <Field label="Urban" value={pct("population_Urban_Pct")} />
                      </Section>
                    )}

                    {/* Income & Economy */}
                    {demo && (d("median_Household_Income") || d("household_Income_Per_Capita") || d("population_In_Poverty_Pct")) && (
                      <Section title="Income & Economy">
                        <Field label="Median HH Income" value={d("median_Household_Income") != null ? `$${Number(d("median_Household_Income")).toLocaleString()}` : undefined} />
                        <Field label="Avg HH Income" value={d("avg_Household_Income") != null ? `$${Number(d("avg_Household_Income")).toLocaleString()}` : undefined} />
                        <Field label="Per Capita Income" value={d("household_Income_Per_Capita") != null ? `$${Number(d("household_Income_Per_Capita")).toLocaleString()}` : undefined} />
                        <Field label="Family Median Income" value={d("family_Median_Income") != null ? `$${Number(d("family_Median_Income")).toLocaleString()}` : undefined} />
                        <Field label="Poverty Rate" value={pct("population_In_Poverty_Pct")} />
                        <Field label="White Collar" value={pct("occupation_White_Collar_Pct")} />
                        <Field label="Blue Collar" value={pct("occupation_Blue_Collar_Pct")} />
                        <Field label="Work From Home" value={pct("transportation_Work_From_Home_Pct")} />
                      </Section>
                    )}

                    {/* Housing Market */}
                    {demo && (d("housing_Owner_Households_Median_Value") || d("housing_Median_Rent")) && (
                      <Section title="Housing Market">
                        <Field label="Median Home Value" value={d("housing_Owner_Households_Median_Value") != null ? `$${Number(d("housing_Owner_Households_Median_Value")).toLocaleString()}` : undefined} />
                        <Field label="Median Rent" value={d("housing_Median_Rent") != null ? `$${Number(d("housing_Median_Rent")).toLocaleString()}/mo` : undefined} />
                        <Field label="With Mortgage" value={pct("housing_Owner_Households_With_Mortgage_Pct")} />
                        <Field label="Median Year Built" value={d("housing_Median_Built_Yr")} />
                        <Field label="Med Length of Residence" value={d("median_Length_Of_Residence_Yr") != null ? `${d("median_Length_Of_Residence_Yr")} yrs` : undefined} />
                        <Field label="Single Family" value={pct("housing_Occupied_Structure_1_Unit_Detached_Pct")} />
                        <Field label="Median Vehicles" value={d("households_Median_Vehicles")} />
                      </Section>
                    )}

                    {/* Transportation & Commute */}
                    {demo && d("median_Travel_Time_To_Work_Mi") && (
                      <Section title="Transportation & Commute">
                        <Field label="Median Commute" value={d("median_Travel_Time_To_Work_Mi") != null ? `${d("median_Travel_Time_To_Work_Mi")} min` : undefined} />
                        <Field label="Drive Alone" value={pct("transportation_Car_Alone_Pct")} />
                        <Field label="Carpool" value={pct("transportation_Car_Carpool_Pct")} />
                        <Field label="Public Transit" value={pct("transportation_Public_Pct")} />
                        <Field label="Walk" value={pct("transportation_Walk_Pct")} />
                        <Field label="Work From Home" value={pct("transportation_Work_From_Home_Pct")} />
                      </Section>
                    )}

                    {/* Education */}
                    {demo && d("education_Bach_Degree_Pct") && (
                      <Section title="Education">
                        <Field label="Bachelor's Degree" value={pct("education_Bach_Degree_Pct")} />
                        <Field label="Graduate Degree" value={pct("education_Grad_Degree_Pct")} />
                        <Field label="Some College" value={pct("education_Some_College_Pct")} />
                        <Field label="High School" value={pct("education_Hs_Pct")} />
                        <Field label="Associate Degree" value={pct("education_Assoc_Degree_Pct")} />
                      </Section>
                    )}

                    {/* Crime & Safety */}
                    {crime && (
                      <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                          Crime & Safety (Index: 100 = National Avg)
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                          {[
                            { label: "Overall Crime", val: crime.crime_Index },
                            { label: "Burglary", val: crime.burglary_Index },
                            { label: "Larceny", val: crime.larceny_Index },
                            { label: "Vehicle Theft", val: crime.motor_Vehicle_Theft_Index },
                            { label: "Assault", val: crime.aggravated_Assault_Index },
                            { label: "Robbery", val: crime.forcible_Robbery_Index },
                          ].filter((c) => c.val != null).map((c) => (
                            <div key={c.label} style={{ padding: "10px 12px", background: "#f9fafb", borderRadius: 8, textAlign: "center" }}>
                              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#6b7280", letterSpacing: 0.5 }}>{c.label}</div>
                              <div style={{ fontSize: 22, fontWeight: 800, color: idxColor(c.val!) }}>{c.val}</div>
                              <div style={{ fontSize: 10, color: idxColor(c.val!) }}>{idxLabel(c.val!)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Climate */}
                    {climate && (
                      <Section title="Climate">
                        <Field label="Avg Annual Temp" value={climate.annual_Avg_Temp != null ? `${climate.annual_Avg_Temp}°F` : undefined} />
                        <Field label="Summer High" value={climate.avg_Jul_High_Temp != null ? `${climate.avg_Jul_High_Temp}°F` : undefined} />
                        <Field label="Winter Low" value={climate.avg_Jan_Low_Temp != null ? `${climate.avg_Jan_Low_Temp}°F` : undefined} />
                        <Field label="Annual Rainfall" value={climate.annual_Precip_In != null ? `${climate.annual_Precip_In}"` : undefined} />
                        <Field label="Annual Snowfall" value={climate.annual_Snowfall_In != null ? `${climate.annual_Snowfall_In}"` : undefined} />
                        <Field label="Clear Days/Yr" value={climate.clear_Day_Mean} />
                        <Field label="Rainy Days/Yr" value={climate.rainy_Day_Mean} />
                        <Field label="Sunshine" value={climate.possible_Sunshine_Pct != null ? `${climate.possible_Sunshine_Pct}%` : undefined} />
                      </Section>
                    )}

                    {/* Air Quality */}
                    {airQuality && (
                      <Section title="Air Quality (Index: 100 = National Avg)">
                        <Field label="Air Pollution" value={airQuality.air_Pollution_Index} />
                        <Field label="Ozone" value={airQuality.ozone_Index} />
                        <Field label="Particulate Matter" value={airQuality.particulate_Matter_Index} />
                        <Field label="Carbon Monoxide" value={airQuality.carbon_Monoxide_Index} />
                        <Field label="Nitrogen Dioxide" value={airQuality.nitrogen_Dioxide_Index} />
                      </Section>
                    )}

                    {/* Natural Disasters */}
                    {naturalDisasters && (
                      <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                          Natural Disaster Risk (Index: 100 = National Avg)
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
                          {[
                            { label: "Earthquake", val: naturalDisasters.earthquake_Index },
                            { label: "Hurricane", val: naturalDisasters.hurricane_Index },
                            { label: "Tornado", val: naturalDisasters.tornado_Index },
                            { label: "Hail", val: naturalDisasters.hail_Index },
                            { label: "Wind", val: naturalDisasters.wind_Index },
                            { label: "Weather", val: naturalDisasters.weather_Index },
                          ].filter((c) => c.val != null).map((c) => (
                            <div key={c.label} style={{ padding: "10px 12px", background: "#f9fafb", borderRadius: 8, textAlign: "center" }}>
                              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#6b7280", letterSpacing: 0.5 }}>{c.label}</div>
                              <div style={{ fontSize: 22, fontWeight: 800, color: idxColor(c.val!) }}>{c.val}</div>
                              <div style={{ fontSize: 10, color: idxColor(c.val!) }}>{idxLabel(c.val!)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nearby Schools */}
                    {schoolList.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                          Nearby Schools
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {schoolList.slice(0, 15).map((school: any, i: number) => {
                            // v4 fields: schoolName, schoolType, institutionType, gradeSpanLow, gradeSpanHigh,
                            //            studentCnt, schoolRating, urbanCentricCommunityType, apInd
                            // v4 nested: school.detail.schoolName, school.location, school.district
                            const detail = school.detail || school;
                            const loc = school.location || {};
                            const name = detail.schoolName || detail.InstitutionName || school.schoolName || school.InstitutionName;
                            const type = detail.institutionType || detail.schoolType || school.schoolType || school.Type;
                            const gradeSpan = (detail.gradeSpanLow && detail.gradeSpanHigh)
                              ? `${detail.gradeSpanLow}–${detail.gradeSpanHigh}`
                              : school.gradeRange || school.Grades;
                            const level = [detail.elementarySchoolInd === "Y" && "Elementary", detail.middleSchoolInd === "Y" && "Middle", detail.highSchoolInd === "Y" && "High"].filter(Boolean).join("/") || detail.instructionalLevel;
                            const students = detail.studentCnt || school.enrollment || school.Enrollment;
                            const rating = detail.schoolRating || school.rating || school.SchoolRating;
                            const dist = loc.distance ?? school.distance;
                            const community = detail.urbanCentricCommunityType;
                            const hasAP = detail.apInd === "Y";
                            const charter = detail.charterInd === "Y";

                            // Rating color for letter grades (A+, A, A-, B+, B, B-, etc.)
                            const ratingBg = typeof rating === "string"
                              ? rating.startsWith("A") ? "#059669" : rating.startsWith("B") ? "#3b82f6" : rating.startsWith("C") ? "#d97706" : "#dc2626"
                              : rating >= 8 ? "#059669" : rating >= 5 ? "#d97706" : "#dc2626";

                            return (
                              <div key={i} style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                                <div style={{ flex: 1, minWidth: 180 }}>
                                  <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{name}</div>
                                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                                    {[
                                      type,
                                      level,
                                      gradeSpan ? `Grades ${gradeSpan}` : null,
                                      dist != null ? `${Number(dist).toFixed(1)} mi` : null,
                                    ].filter(Boolean).join(" · ")}
                                  </div>
                                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1, display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {students != null && <span>Enrollment: {Number(students).toLocaleString()}</span>}
                                    {community && <span>{community}</span>}
                                    {hasAP && <span style={{ color: "#059669", fontWeight: 600 }}>AP Classes</span>}
                                    {charter && <span style={{ color: "#7c3aed", fontWeight: 600 }}>Charter</span>}
                                  </div>
                                  {/* District info if nested in v4 */}
                                  {school.district?.schoolDistrictName && (
                                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                                      District: {school.district.schoolDistrictName}
                                    </div>
                                  )}
                                </div>
                                {rating != null && (
                                  <div style={{
                                    minWidth: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                                    fontWeight: 800, fontSize: typeof rating === "string" ? 14 : 16, color: "#fff", flexShrink: 0,
                                    padding: "0 8px", background: ratingBg,
                                  }}>
                                    {rating}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Nearby Amenities / Points of Interest */}
                    {poiList.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                          Nearby Amenities
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {poiList.slice(0, 25).map((poi: any, i: number) => {
                            // v4 response nests under businessLocation, category, details
                            const biz = poi.businessLocation || {};
                            const cat = poi.category || {};
                            const det = poi.details || {};
                            // Resolve name: v4 nested → flat fallbacks
                            const poiName = biz.businessStandardName || det.businessShortName
                              || poi.name || poi.Name || poi.businessName;
                            const category = cat.condensedHeading || cat.industry || cat.category
                              || poi.businessCategory || poi.categoryName;
                            const address = biz.address || det.house && det.street
                              ? [det.house, det.street, det.strType].filter(Boolean).join(" ")
                              : (poi.address || poi.addressLine1);
                            const poiCity = biz.city || det.cityName || poi.city;
                            const poiState = det.state || poi.stateCode;
                            const poiZip = det.zip || poi.zipCode;
                            // Build phone from area code + exchange + number
                            const phone = (det.areaCode && det.exchange && det.phoneNumber)
                              ? `(${det.areaCode}) ${det.exchange}-${det.phoneNumber}`
                              : (poi.phone || poi.contactPhone);
                            const facebook = det.facebookUrl || poi.facebookUrl;
                            const yelp = det.yelpUrl || poi.yelpUrl;
                            const website = det.website || poi.website;
                            const hours = det.standardizedHours || poi.operatingHours;
                            const franchise = det.franchiseInd === "Y" || poi.franchiseInd === "Y";
                            const dist = det.distance ?? poi.distance;
                            const industry = cat.lineOfBusiness || det.industry;

                            return (
                              <div key={i} style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                  <div style={{ flex: 1, minWidth: 180 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{poiName}</div>
                                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                                      {[
                                        category,
                                        industry && industry !== category ? industry : null,
                                        dist != null ? `${Number(dist).toFixed(1)} mi` : null,
                                      ].filter(Boolean).join(" · ")}
                                    </div>
                                    {address && (
                                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                                        {[address, poiCity, poiState, poiZip].filter(Boolean).join(", ")}
                                      </div>
                                    )}
                                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1, display: "flex", flexWrap: "wrap", gap: 8 }}>
                                      {phone && <span>Tel: {phone}</span>}
                                      {franchise && <span style={{ color: "#7c3aed", fontWeight: 600 }}>Franchise</span>}
                                      {hours && <span>Hours: {hours}</span>}
                                    </div>
                                    {(facebook || yelp || website) && (
                                      <div style={{ fontSize: 11, marginTop: 2, display: "flex", gap: 10 }}>
                                        {website && <a href={website} target="_blank" rel="noopener noreferrer" style={{ color: "#059669", textDecoration: "none" }}>Website</a>}
                                        {facebook && <a href={facebook} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>Facebook</a>}
                                        {yelp && <a href={yelp} target="_blank" rel="noopener noreferrer" style={{ color: "#dc2626", textDecoration: "none" }}>Yelp</a>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}

          {activeSection === "market" && (
            <>
              {marketStatsLoading && (
                <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                  Loading market statistics...
                </div>
              )}

              {!marketStatsLoading && !marketStats && (
                <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                  Market statistics not available. Ensure RentCast is connected and a valid zip code is present.
                </div>
              )}

              {marketStats && (() => {
                const sale = marketStats.saleData;
                const rental = marketStats.rentalData;
                if (!sale && !rental) return (
                  <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                    No market data available for this zip code.
                  </div>
                );

                // Monthly history for trend table
                const saleHistory = sale?.history
                  ? Object.entries(sale.history)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .slice(-12)
                  : [];

                // Compute trend from first to last month
                const saleTrend = saleHistory.length >= 2
                  ? (() => {
                      const first = (saleHistory[0][1] as any).medianPrice;
                      const last = (saleHistory[saleHistory.length - 1][1] as any).medianPrice;
                      return first && last ? ((last - first) / first * 100) : null;
                    })()
                  : null;

                return (
                  <>
                    <div style={{ marginBottom: 16, padding: "10px 14px", background: "#f0fdf4", borderRadius: 8, borderLeft: "4px solid #059669" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#065f46" }}>
                        Market Statistics — {marketStats.zipCode || p.address?.postal1}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                        Source: RentCast{sale?.lastUpdatedDate ? ` (Updated: ${sale.lastUpdatedDate.split("T")[0]})` : ""}
                      </div>
                    </div>

                    {sale && (
                      <Section title="Sale Market Overview">
                        <Field label="Median Sale Price" value={sale.medianPrice != null ? `$${Number(sale.medianPrice).toLocaleString()}` : undefined} />
                        <Field label="Average Sale Price" value={sale.averagePrice != null ? `$${Number(sale.averagePrice).toLocaleString()}` : undefined} />
                        <Field label="Price Range" value={sale.minPrice != null && sale.maxPrice != null ? `${fmt(sale.minPrice)} – ${fmt(sale.maxPrice)}` : undefined} />
                        <Field label="Median $/Sqft" value={sale.medianPricePerSquareFoot != null ? `$${sale.medianPricePerSquareFoot.toLocaleString()}` : undefined} />
                        <Field label="Avg $/Sqft" value={sale.averagePricePerSquareFoot != null ? `$${sale.averagePricePerSquareFoot.toLocaleString()}` : undefined} />
                        <Field label="Median Sqft" value={sale.medianSquareFootage != null ? sale.medianSquareFootage.toLocaleString() : undefined} />
                        <Field label="Median Days on Market" value={sale.medianDaysOnMarket} />
                        <Field label="Avg Days on Market" value={sale.averageDaysOnMarket} />
                        <Field label="New Listings" value={sale.newListings} />
                        <Field label="Total Listings" value={sale.totalListings} />
                      </Section>
                    )}

                    {/* Sale stats by property type */}
                    {sale?.dataByPropertyType && sale.dataByPropertyType.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                          Sale Stats by Property Type
                        </h3>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                                <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Type</th>
                                <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Median Price</th>
                                <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Median $/Sqft</th>
                                <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Median DOM</th>
                                <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Listings</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sale.dataByPropertyType.map((d: any, i: number) => (
                                <tr key={d.propertyType} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                                  <td style={{ padding: "6px 8px", fontWeight: 500 }}>{d.propertyType}</td>
                                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{d.medianPrice != null ? `$${Number(d.medianPrice).toLocaleString()}` : "—"}</td>
                                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{d.medianPricePerSquareFoot != null ? `$${d.medianPricePerSquareFoot.toLocaleString()}` : "—"}</td>
                                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{d.medianDaysOnMarket ?? "—"}</td>
                                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{d.totalListings ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Sale stats by bedroom count */}
                    {sale?.dataByBedrooms && sale.dataByBedrooms.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                          Sale Stats by Bedrooms
                        </h3>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                                <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Beds</th>
                                <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Median Price</th>
                                <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Median $/Sqft</th>
                                <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Median DOM</th>
                                <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Listings</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sale.dataByBedrooms.sort((a: any, b: any) => a.bedrooms - b.bedrooms).map((d: any, i: number) => (
                                <tr key={d.bedrooms} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                                  <td style={{ padding: "6px 8px", fontWeight: 500 }}>{d.bedrooms} BR</td>
                                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{d.medianPrice != null ? `$${Number(d.medianPrice).toLocaleString()}` : "—"}</td>
                                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{d.medianPricePerSquareFoot != null ? `$${d.medianPricePerSquareFoot.toLocaleString()}` : "—"}</td>
                                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{d.medianDaysOnMarket ?? "—"}</td>
                                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{d.totalListings ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Monthly sale trend */}
                    {saleHistory.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 4, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                          Monthly Sale Trends
                        </h3>
                        {saleTrend != null && (
                          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                            <span style={{ fontWeight: 600, color: saleTrend >= 0 ? "#059669" : "#dc2626" }}>
                              {saleTrend >= 0 ? "+" : ""}{saleTrend.toFixed(1)}% median price change over {saleHistory.length} months
                            </span>
                          </div>
                        )}
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                                <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Month</th>
                                <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Median Price</th>
                                <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Avg Price</th>
                                <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>$/Sqft</th>
                                <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>DOM</th>
                                <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Listings</th>
                              </tr>
                            </thead>
                            <tbody>
                              {saleHistory.map(([month, data]: [string, any], i: number) => (
                                <tr key={month} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                                  <td style={{ padding: "6px 8px", fontWeight: 500 }}>{month}</td>
                                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{data.medianPrice != null ? `$${Number(data.medianPrice).toLocaleString()}` : "—"}</td>
                                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{data.averagePrice != null ? `$${Number(data.averagePrice).toLocaleString()}` : "—"}</td>
                                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{data.medianPricePerSquareFoot != null ? `$${data.medianPricePerSquareFoot.toLocaleString()}` : "—"}</td>
                                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{data.medianDaysOnMarket ?? "—"}</td>
                                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{data.totalListings ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {rental && (
                      <Section title="Rental Market Overview">
                        <Field label="Median Rent" value={rental.medianRent != null ? `$${Number(rental.medianRent).toLocaleString()}/mo` : undefined} />
                        <Field label="Average Rent" value={rental.averageRent != null ? `$${Number(rental.averageRent).toLocaleString()}/mo` : undefined} />
                        <Field label="Rent Range" value={rental.minRent != null && rental.maxRent != null ? `$${rental.minRent.toLocaleString()} – $${rental.maxRent.toLocaleString()}/mo` : undefined} />
                        <Field label="Median $/Sqft" value={rental.medianRentPerSquareFoot != null ? `$${rental.medianRentPerSquareFoot.toFixed(2)}/sqft` : undefined} />
                        <Field label="Median Sqft" value={rental.medianSquareFootage != null ? rental.medianSquareFootage.toLocaleString() : undefined} />
                        <Field label="Median Days on Market" value={rental.medianDaysOnMarket} />
                        <Field label="Avg Days on Market" value={rental.averageDaysOnMarket} />
                        <Field label="Total Listings" value={rental.totalListings} />
                      </Section>
                    )}

                    {/* Rental stats by bedroom count */}
                    {rental?.dataByBedrooms && rental.dataByBedrooms.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                          Rental Stats by Bedrooms
                        </h3>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                                <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Beds</th>
                                <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Median Rent</th>
                                <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>$/Sqft</th>
                                <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Median DOM</th>
                                <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Listings</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rental.dataByBedrooms.sort((a: any, b: any) => a.bedrooms - b.bedrooms).map((d: any, i: number) => (
                                <tr key={d.bedrooms} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                                  <td style={{ padding: "6px 8px", fontWeight: 500 }}>{d.bedrooms} BR</td>
                                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{d.medianRent != null ? `$${Number(d.medianRent).toLocaleString()}/mo` : "—"}</td>
                                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{d.medianRentPerSquareFoot != null ? `$${d.medianRentPerSquareFoot.toFixed(2)}` : "—"}</td>
                                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{d.medianDaysOnMarket ?? "—"}</td>
                                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{d.totalListings ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}

          {activeSection === "federal" && (
            <>
              {federalLoading && (
                <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                  Loading federal data sources...
                </div>
              )}

              {!federalLoading && !federalData && (
                <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                  Federal data not available. Connect the Federal Data integration to access government property intelligence.
                </div>
              )}

              {federalData && (
                <>
                  {/* Vacancy / Occupancy */}
                  {federalData.vacancy && (
                    <Section title="Vacancy Status">
                      {federalData.vacancy.source === "usps" && (
                        <Field label="USPS Vacancy" value={federalData.vacancy.vacant ? "Vacant" : "Active Mail Delivery"} />
                      )}
                      {federalData.vacancy.vacancyRate != null && (
                        <Field label="Area Vacancy Rate" value={`${federalData.vacancy.vacancyRate.toFixed(1)}%`} />
                      )}
                      <Field label="Data Source" value={federalData.vacancy.source === "usps" ? "USPS" : "Census Bureau ACS"} />
                    </Section>
                  )}

                  {/* Fair Market Rents */}
                  {federalData.fairMarketRent && (
                    <Section title="HUD Fair Market Rents">
                      <Field label="Area" value={federalData.fairMarketRent.areaName || federalData.fairMarketRent.countyName} />
                      <Field label="Studio/Efficiency" value={fmt(federalData.fairMarketRent.efficiency)} />
                      <Field label="1 Bedroom" value={fmt(federalData.fairMarketRent.oneBedroom)} />
                      <Field label="2 Bedroom" value={fmt(federalData.fairMarketRent.twoBedroom)} />
                      <Field label="3 Bedroom" value={fmt(federalData.fairMarketRent.threeBedroom)} />
                      <Field label="4 Bedroom" value={fmt(federalData.fairMarketRent.fourBedroom)} />
                      <Field label="Year" value={federalData.fairMarketRent.year} />
                    </Section>
                  )}

                  {/* Demographics */}
                  {federalData.demographics && (
                    <Section title="Census Demographics">
                      <Field label="Total Population" value={fmtNum(federalData.demographics.totalPopulation ?? undefined)} />
                      <Field label="Median Age" value={federalData.demographics.medianAge ?? undefined} />
                      <Field label="Median Household Income" value={fmt(federalData.demographics.medianHouseholdIncome ?? undefined)} />
                      <Field label="Median Home Value" value={fmt(federalData.demographics.medianHomeValue ?? undefined)} />
                      <Field label="Median Gross Rent" value={fmt(federalData.demographics.medianGrossRent ?? undefined)} />
                      <Field label="Total Housing Units" value={fmtNum(federalData.demographics.totalHousingUnits ?? undefined)} />
                      <Field label="Owner Occupied" value={fmtNum(federalData.demographics.ownerOccupied ?? undefined)} />
                      <Field label="Renter Occupied" value={fmtNum(federalData.demographics.renterOccupied ?? undefined)} />
                      <Field label="Vacant Units" value={fmtNum(federalData.demographics.vacantUnits ?? undefined)} />
                    </Section>
                  )}

                  {/* Flood Risk */}
                  {federalData.floodRisk && (
                    <Section title="FEMA Flood Insurance">
                      <Field label="Flood Zone" value={federalData.floodRisk.floodZone} />
                      <Field label="NFIP Policies" value={fmtNum(federalData.floodRisk.policyCount)} />
                      <Field label="Avg Premium" value={fmt(Math.round(federalData.floodRisk.averagePremium))} />
                      <Field label="Total Coverage" value={fmt(federalData.floodRisk.totalCoverage)} />
                    </Section>
                  )}

                  {/* Conforming Loan Limits */}
                  {federalData.conformingLoanLimit && (
                    <Section title="FHFA Conforming Loan Limits">
                      <Field label="1 Unit" value={fmt(federalData.conformingLoanLimit.oneUnit)} />
                      <Field label="2 Units" value={fmt(federalData.conformingLoanLimit.twoUnit)} />
                      <Field label="3 Units" value={fmt(federalData.conformingLoanLimit.threeUnit)} />
                      <Field label="4 Units" value={fmt(federalData.conformingLoanLimit.fourUnit)} />
                      <Field label="Year" value={federalData.conformingLoanLimit.year} />
                      <Field label="County" value={federalData.conformingLoanLimit.county} />
                    </Section>
                  )}

                  {/* Employment */}
                  {federalData.localEmployment?.unemploymentRate && (
                    <Section title="BLS Employment Data">
                      <Field label="State Unemployment Rate" value={`${federalData.localEmployment.unemploymentRate}%`} />
                    </Section>
                  )}

                  {/* Lending Data */}
                  {federalData.lendingData && (
                    <Section title="HMDA Mortgage Lending">
                      <Field label="Total Applications" value={fmtNum(federalData.lendingData.totalApplications)} />
                      <Field label="Total Originations" value={fmtNum(federalData.lendingData.totalOriginations)} />
                      <Field label="Total Denials" value={fmtNum(federalData.lendingData.totalDenials)} />
                      <Field label="Approval Rate" value={federalData.lendingData.approvalRate ? `${federalData.lendingData.approvalRate.toFixed(1)}%` : undefined} />
                      <Field label="Median Loan Amount" value={fmt(federalData.lendingData.medianLoanAmount)} />
                      <Field label="Year" value={federalData.lendingData.year} />
                    </Section>
                  )}

                  {/* Environmental Sites */}
                  {federalData.environmentalSites && federalData.environmentalSites.length > 0 && (
                    <Section title="EPA Environmental Sites">
                      {federalData.environmentalSites.slice(0, 10).map((site, i) => (
                        <Field key={i} label={site.siteType} value={site.facilityName} />
                      ))}
                      {federalData.environmentalSites.length > 10 && (
                        <Field label="More Sites" value={`${federalData.environmentalSites.length - 10} additional`} />
                      )}
                    </Section>
                  )}

                  {/* Recent Disasters */}
                  {federalData.recentDisasters && federalData.recentDisasters.length > 0 && (
                    <Section title="Recent FEMA Disaster Declarations">
                      {federalData.recentDisasters.slice(0, 5).map((d, i) => (
                        <Field key={i} label={d.incidentType} value={`${d.title} (${d.declarationDate?.substring(0, 10)})`} />
                      ))}
                    </Section>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Nearby Homes (Just Sold Farming) ── */}
          {activeSection === "nearby" && (
            <>
              {nearbyLoading && (
                <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
                  Searching for nearby homeowners...
                </div>
              )}

              {!nearbyLoading && nearbyHomes && nearbyHomes.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", background: "#f9fafb", borderRadius: 12 }}>
                  No nearby properties found within {farmingContext?.radiusMiles || "0.5"} miles.
                </div>
              )}

              {!nearbyLoading && !nearbyHomes && !p.location?.latitude && (
                <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", background: "#f9fafb", borderRadius: 12 }}>
                  No coordinates available for this property. Nearby homes search requires lat/lng data.
                </div>
              )}

              {!nearbyLoading && nearbyHomes && nearbyHomes.length > 0 && (() => {
                const getOwnerName = (prop: AttomProperty) => {
                  const o = prop.owner;
                  const nested = prop.assessment?.owner;
                  const owner = (o?.owner1?.fullName || o?.owner2?.fullName) ? o : nested;
                  return owner?.owner1?.fullName || owner?.owner2?.fullName || null;
                };
                const getMailAddr = (prop: AttomProperty) => {
                  const o = prop.owner;
                  const nested = prop.assessment?.owner;
                  const owner = (o?.mailingAddressOneLine?.trim()) ? o : nested;
                  if (owner?.mailingAddressOneLine?.trim()) return owner.mailingAddressOneLine;
                  const m = (prop.mortgage as any)?.FirstConcurrent || prop.mortgage;
                  if (m?.borrowerMailFullStreetAddress) {
                    return [m.borrowerMailFullStreetAddress, m.borrowerMailCity, m.borrowerMailState, m.borrowerMailZip].filter(Boolean).join(", ");
                  }
                  return null;
                };
                const withOwner = nearbyHomes.filter((h) => getOwnerName(h));
                const withMailing = nearbyHomes.filter((h) => getMailAddr(h));

                return (
                  <>
                    <div style={{ padding: "10px 14px", background: "#f5f3ff", border: "1px solid #e9d5ff", borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#7c3aed", marginBottom: 4 }}>
                        Farming Radius: {farmingContext?.radiusMiles || "0.5"} miles from this property
                      </div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        <span><strong>{nearbyHomes.length}</strong> properties found</span>
                        <span><strong>{withOwner.length}</strong> with owner names</span>
                        <span><strong>{withMailing.length}</strong> with mailing addresses</span>
                      </div>
                      <div style={{ marginTop: 6, color: "#6b7280" }}>
                        Use this data to send &ldquo;Your Neighbor&rsquo;s Home Just Sold&rdquo; postcards to nearby homeowners.
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {nearbyHomes.map((nh, idx) => {
                        const nhAddr = nh.address?.oneLine || [nh.address?.line1, nh.address?.line2].filter(Boolean).join(", ") || "Unknown";
                        const ownerName = getOwnerName(nh);
                        const mailingAddr = getMailAddr(nh);
                        const nhBeds = nh.building?.rooms?.beds;
                        const nhBaths = nh.building?.rooms?.bathsFull ?? nh.building?.rooms?.bathsTotal;
                        const nhSqft = nh.building?.size?.livingSize || nh.building?.size?.universalSize;
                        const nhValue = nh.avm?.amount?.value || nh.assessment?.market?.mktTtlValue || nh.assessment?.assessed?.assdTtlValue;
                        const nhYearBuilt = nh.building?.summary?.yearBuilt || nh.summary?.yearBuilt;

                        return (
                          <div
                            key={nh.identifier?.attomId || idx}
                            style={{
                              padding: "10px 14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
                              borderLeft: ownerName ? "3px solid #7c3aed" : "3px solid #e5e7eb",
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{nhAddr}</div>
                            <div style={{ fontSize: 12, color: "#6b7280", display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {[
                                nhBeds != null ? `${nhBeds} bed` : null,
                                nhBaths != null ? `${nhBaths} bath` : null,
                                nhSqft ? `${nhSqft.toLocaleString()} sqft` : null,
                                nhYearBuilt ? `Built ${nhYearBuilt}` : null,
                              ].filter(Boolean).join(" · ")}
                            </div>
                            <div style={{ marginTop: 4, fontSize: 12, display: "flex", flexDirection: "column", gap: 2 }}>
                              <div style={{ color: ownerName ? "#374151" : "#9ca3af" }}>
                                <strong>Owner:</strong> {ownerName || "Not listed"}
                              </div>
                              {mailingAddr && (
                                <div style={{ color: "#374151" }}>
                                  <strong>Mailing:</strong> {mailingAddr}
                                </div>
                              )}
                              {nhValue != null && (
                                <div style={{ color: "#6b7280" }}>
                                  <strong>Est. Value:</strong> ${nhValue.toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </>
          )}
    </div>
  );

  // ── Report action bar (shared between embedded and modal) ──
  const reportActionBar = (
    <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
      <button
        onClick={handleGenerateReport}
        disabled={reportGenerating}
        style={{
          padding: "7px 14px", fontSize: 12, fontWeight: 600, borderRadius: 6,
          border: "none", background: "#1e40af", color: "#fff",
          cursor: reportGenerating ? "not-allowed" : "pointer",
          opacity: reportGenerating ? 0.6 : 1,
        }}
      >
        {reportGenerating ? "Generating..." : "Download Intelligence Report (PDF)"}
      </button>
      <button
        onClick={handleShareReport}
        disabled={reportGenerating}
        style={{
          padding: "7px 14px", fontSize: 12, fontWeight: 600, borderRadius: 6,
          border: "1px solid #059669", background: reportCopied ? "#059669" : "#fff",
          color: reportCopied ? "#fff" : "#059669",
          cursor: reportGenerating ? "not-allowed" : "pointer",
          opacity: reportGenerating ? 0.6 : 1,
        }}
      >
        {reportCopied ? "Link Copied!" : "Get Shareable Link"}
      </button>
      {reportShareUrl && !reportCopied && (
        <span style={{ fontSize: 11, color: "#6b7280", alignSelf: "center" }}>
          Link ready — click to copy again
        </span>
      )}
    </div>
  );

  // In embedded mode: render value cards + tabs + content inline (no overlay or header)
  if (embedded) {
    return (
      <div>
        {reportActionBar}
        {valueSummaryCards}
        {tabsBar}
        {tabContent}
      </div>
    );
  }

  // ── Full modal mode ──
  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)",
        zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px", overflowY: "auto",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 720, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{addr}</h2>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                {[
                  beds != null ? `${beds} bed` : null,
                  baths != null ? `${baths} bath` : null,
                  sqft ? `${fmtNum(sqft)} sqft` : null,
                  yearBuilt ? `Built ${yearBuilt}` : null,
                ].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Generate Report */}
              <button
                onClick={handleGenerateReport}
                disabled={reportGenerating}
                style={{
                  padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6,
                  border: "1px solid #1e40af", background: "#1e40af", color: "#fff",
                  cursor: reportGenerating ? "not-allowed" : "pointer", opacity: reportGenerating ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {reportGenerating ? "Generating..." : "Download PDF"}
              </button>
              {/* Share Link */}
              <button
                onClick={handleShareReport}
                disabled={reportGenerating}
                style={{
                  padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6,
                  border: "1px solid #059669", background: reportCopied ? "#059669" : "#fff",
                  color: reportCopied ? "#fff" : "#059669",
                  cursor: reportGenerating ? "not-allowed" : "pointer", opacity: reportGenerating ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {reportCopied ? "Link Copied!" : "Share Link"}
              </button>
              <button
                onClick={onClose}
                style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af", lineHeight: 1, padding: 4 }}
              >
                ✕
              </button>
            </div>
          </div>

          {valueSummaryCards}
          {tabsBar}
        </div>

        {tabContent}

        {/* Reliability Disclaimer */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid #f3f4f6", textAlign: "center" }}>
          <p style={{ fontSize: 10, color: "#9ca3af", lineHeight: 1.5, margin: 0 }}>
            Information presented is deemed reliable but not guaranteed and should be used accordingly.
          </p>
        </div>
      </div>
    </div>
  );
}
