/**
 * DOM Prospecting Search Engine
 *
 * Identifies stale listings that exceed average Days on Market thresholds
 * by property type within a zip code. Uses MLS (Trestle) as primary data
 * source, falls back to RentCast when MLS is unavailable.
 *
 * Tiered classification:
 *   - Red:      DOM >= avg × redMultiplier      (Likely Target)
 *   - Orange:   DOM >= avg × orangeMultiplier    (Possible Target)
 *   - Charcoal: DOM >= avg × charcoalMultiplier  (Monitor)
 */

import {
  TrestleClient,
  TrestleProperty,
  createTrestleClient,
} from "@/lib/integrations/trestle-client";
import {
  RentcastClient,
  createRentcastClient,
} from "@/lib/integrations/rentcast-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DomSearchParams {
  zipCodes: string[];
  redMultiplier: number;     // e.g., 2.0
  orangeMultiplier: number;  // e.g., 1.5
  charcoalMultiplier: number; // e.g., 1.15
  propertyTypes?: string[];  // e.g., ["Single Family", "Condo"]
  minPrice?: number;
  maxPrice?: number;
}

export interface DomProspectResult {
  listingKey?: string;
  mlsNumber?: string;
  address: string;
  city?: string;
  state?: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  propertyType?: string;
  listPrice?: number;
  originalListPrice?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  daysOnMarket: number;
  cumulativeDaysOnMarket?: number;
  listedDate?: string;
  avgDomForType: number;
  domRatio: number;
  tier: "red" | "orange" | "charcoal";
  listingAgentName?: string;
  listingAgentPhone?: string;
  listingAgentEmail?: string;
  listingOfficeName?: string;
  dataSource: "mls" | "rentcast";
}

export interface DomSearchResult {
  results: DomProspectResult[];
  marketStats: Record<string, Record<string, { avgDom: number; count: number }>>;
  dataSource: "mls" | "rentcast" | "mixed";
  searchedAt: string;
}

// ---------------------------------------------------------------------------
// Property type normalization
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Live DOM calculation from on_market_date
// ---------------------------------------------------------------------------

/** Calculate live DOM from on_market_date to today */
export function calculateLiveDom(onMarketDate: string | Date | null | undefined, fallbackDom?: number): number {
  if (!onMarketDate) return fallbackDom ?? 0;
  const start = typeof onMarketDate === "string" ? new Date(onMarketDate) : onMarketDate;
  if (isNaN(start.getTime())) return fallbackDom ?? 0;
  const diffMs = Date.now() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 3600 * 1000)));
}

// ---------------------------------------------------------------------------
// Property type normalization
// ---------------------------------------------------------------------------

/** Normalize MLS property types to standard categories */
export function normalizeMlsPropertyType(type?: string): string {
  if (!type) return "Other";
  const t = type.toLowerCase();
  if (t.includes("single") || t.includes("sfr") || t.includes("house") || t.includes("residential")) return "Single Family";
  if (t.includes("condo") || t.includes("condominium")) return "Condo";
  if (t.includes("town") || t.includes("townhome") || t.includes("townhouse")) return "Townhouse";
  if (t.includes("multi") || t.includes("duplex") || t.includes("triplex") || t.includes("fourplex")) return "Multi-Family";
  if (t.includes("land") || t.includes("lot") || t.includes("vacant")) return "Land";
  return type;
}

/** Normalize RentCast property types to standard categories */
export function normalizeRentcastPropertyType(type?: string): string {
  if (!type) return "Other";
  const t = type.toLowerCase();
  if (t.includes("single") || t === "sfr") return "Single Family";
  if (t.includes("condo")) return "Condo";
  if (t.includes("town")) return "Townhouse";
  if (t.includes("multi") || t.includes("duplex") || t.includes("triplex")) return "Multi-Family";
  if (t.includes("land") || t.includes("lot")) return "Land";
  return type;
}

// ---------------------------------------------------------------------------
// Compute avg DOM by property type from listing data
// ---------------------------------------------------------------------------

export function computeAvgDomByType(
  listings: Array<{ propertyType: string; dom: number }>
): Record<string, { avgDom: number; count: number }> {
  const groups: Record<string, number[]> = {};

  for (const l of listings) {
    const t = l.propertyType;
    if (!groups[t]) groups[t] = [];
    groups[t].push(l.dom);
  }

  const result: Record<string, { avgDom: number; count: number }> = {};
  for (const [type, doms] of Object.entries(groups)) {
    const avg = doms.reduce((a, b) => a + b, 0) / doms.length;
    result[type] = { avgDom: Math.round(avg), count: doms.length };
  }

  return result;
}

// ---------------------------------------------------------------------------
// Classify a listing into a tier
// ---------------------------------------------------------------------------

export function classifyTier(
  dom: number,
  avgDom: number,
  params: Pick<DomSearchParams, "redMultiplier" | "orangeMultiplier" | "charcoalMultiplier">
): "red" | "orange" | "charcoal" | null {
  if (avgDom <= 0) return null;
  const ratio = dom / avgDom;
  if (ratio >= params.redMultiplier) return "red";
  if (ratio >= params.orangeMultiplier) return "orange";
  if (ratio >= params.charcoalMultiplier) return "charcoal";
  return null;
}

// ---------------------------------------------------------------------------
// MLS (Trestle) Search
// ---------------------------------------------------------------------------

async function searchMls(
  client: TrestleClient,
  params: DomSearchParams
): Promise<{ listings: DomProspectResult[]; marketStats: Record<string, Record<string, { avgDom: number; count: number }>> }> {
  const allListings: TrestleProperty[] = [];
  const marketStats: Record<string, Record<string, { avgDom: number; count: number }>> = {};

  // Fetch active listings for each zip code
  for (const zip of params.zipCodes) {
    try {
      // Build property type filter for OData
      let propTypeFilter = "";
      if (params.propertyTypes?.length) {
        const typeFilters = params.propertyTypes.map(t => `PropertyType eq '${t}'`);
        propTypeFilter = ` and (${typeFilters.join(" or ")})`;
      }

      // Build price filter
      let priceFilter = "";
      if (params.minPrice) priceFilter += ` and ListPrice ge ${params.minPrice}`;
      if (params.maxPrice) priceFilter += ` and ListPrice le ${params.maxPrice}`;

      const result = await client.getProperties({
        $filter: `StandardStatus eq 'Active' and startswith(PostalCode, '${zip}')${propTypeFilter}${priceFilter}`,
        $select: [
          "ListingKey", "ListingId", "StandardStatus", "PropertyType",
          "ListPrice", "OriginalListPrice", "UnparsedAddress", "StreetNumber",
          "StreetName", "StreetSuffix", "City", "StateOrProvince", "PostalCode",
          "Latitude", "Longitude", "BedroomsTotal", "BathroomsTotalInteger",
          "LivingArea", "YearBuilt", "DaysOnMarket", "CumulativeDaysOnMarket",
          "OnMarketDate", "ListAgentFullName", "ListAgentDirectPhone",
          "ListAgentEmail", "ListOfficeName",
        ].join(","),
        $orderby: "DaysOnMarket desc",
        $top: 500,
        $count: true,
      });

      // Compute average DOM by property type for this zip
      const zipListings = result.value.map(l => ({
        propertyType: normalizeMlsPropertyType(l.PropertyType),
        dom: l.DaysOnMarket ?? l.CumulativeDaysOnMarket ?? 0,
      }));

      marketStats[zip] = computeAvgDomByType(zipListings);
      allListings.push(...result.value);
    } catch (err: any) {
      console.warn(`[DomEngine] MLS fetch failed for zip ${zip}:`, err.message);
    }
  }

  // Now classify each listing against its zip's avg DOM for its property type
  const results: DomProspectResult[] = [];

  for (const l of allListings) {
    const zip = l.PostalCode?.substring(0, 5) || "";
    const propType = normalizeMlsPropertyType(l.PropertyType);
    const dom = l.CumulativeDaysOnMarket ?? l.DaysOnMarket ?? 0;

    // Get avg DOM for this property type in this zip
    const zipStats = marketStats[zip];
    const typeStats = zipStats?.[propType];
    if (!typeStats || typeStats.avgDom <= 0) continue;

    const tier = classifyTier(dom, typeStats.avgDom, params);
    if (!tier) continue;

    const address = l.UnparsedAddress
      || [l.StreetNumber, l.StreetName, l.StreetSuffix].filter(Boolean).join(" ")
      || "Unknown Address";

    results.push({
      listingKey: l.ListingKey,
      mlsNumber: l.ListingId,
      address,
      city: l.City,
      state: l.StateOrProvince,
      zipCode: zip,
      latitude: l.Latitude,
      longitude: l.Longitude,
      propertyType: propType,
      listPrice: l.ListPrice,
      originalListPrice: l.OriginalListPrice,
      beds: l.BedroomsTotal,
      baths: l.BathroomsTotalInteger,
      sqft: l.LivingArea,
      yearBuilt: l.YearBuilt,
      daysOnMarket: dom,
      cumulativeDaysOnMarket: l.CumulativeDaysOnMarket,
      listedDate: l.OnMarketDate,
      avgDomForType: typeStats.avgDom,
      domRatio: Math.round((dom / typeStats.avgDom) * 100) / 100,
      tier,
      listingAgentName: l.ListAgentFullName,
      listingAgentPhone: l.ListAgentDirectPhone,
      listingAgentEmail: l.ListAgentEmail,
      listingOfficeName: l.ListOfficeName,
      dataSource: "mls",
    });
  }

  // Sort by DOM ratio descending (most stale first)
  results.sort((a, b) => b.domRatio - a.domRatio);

  return { listings: results, marketStats };
}

// ---------------------------------------------------------------------------
// RentCast Fallback Search
// ---------------------------------------------------------------------------

async function searchRentcast(
  client: RentcastClient,
  params: DomSearchParams,
  cachedMarketStats?: Record<string, any>
): Promise<{ listings: DomProspectResult[]; marketStats: Record<string, Record<string, { avgDom: number; count: number }>> }> {
  const marketStats: Record<string, Record<string, { avgDom: number; count: number }>> = {};
  const allListings: any[] = [];

  for (const zip of params.zipCodes) {
    try {
      // Get active sale listings from RentCast
      const listings = await client.getSaleListings({
        zipCode: zip,
        status: "Active",
        limit: 500,
      });

      // Try to get avg DOM from cached market stats first, then fetch live
      let zipAvgDomByType: Record<string, { avgDom: number; count: number }> = {};

      const cachedZip = cachedMarketStats?.[zip];
      if (cachedZip?.saleData?.dataByPropertyType) {
        // Use cached market stats from area_data_cache
        for (const d of cachedZip.saleData.dataByPropertyType) {
          const normType = normalizeRentcastPropertyType(d.propertyType);
          if (d.averageDaysOnMarket != null) {
            zipAvgDomByType[normType] = {
              avgDom: Math.round(d.averageDaysOnMarket),
              count: d.totalListings || 0,
            };
          }
        }
      }

      // If no cached stats or missing types, compute from the listings themselves
      if (Object.keys(zipAvgDomByType).length === 0 && listings.length > 0) {
        const listingDoms = listings.map(l => ({
          propertyType: normalizeRentcastPropertyType(l.propertyType),
          dom: l.daysOnMarket || 0,
        }));
        zipAvgDomByType = computeAvgDomByType(listingDoms);
      }

      // If still nothing, try fetching market data live
      if (Object.keys(zipAvgDomByType).length === 0) {
        try {
          const mktData = await client.getMarketData({ zipCode: zip, dataType: "Sale" });
          if (mktData?.saleData?.dataByPropertyType) {
            for (const d of mktData.saleData.dataByPropertyType) {
              const normType = normalizeRentcastPropertyType(d.propertyType);
              if (d.averageDaysOnMarket != null) {
                zipAvgDomByType[normType] = {
                  avgDom: Math.round(d.averageDaysOnMarket),
                  count: d.totalListings || 0,
                };
              }
            }
          }
        } catch {
          // If market data fails, we'll use listing-computed avg above
        }
      }

      marketStats[zip] = zipAvgDomByType;

      for (const l of listings) {
        allListings.push({ ...l, _zip: zip });
      }
    } catch (err: any) {
      console.warn(`[DomEngine] RentCast fetch failed for zip ${zip}:`, err.message);
    }
  }

  // Classify each listing
  const results: DomProspectResult[] = [];

  for (const l of allListings) {
    const zip = l._zip || l.zipCode || "";
    const propType = normalizeRentcastPropertyType(l.propertyType);
    const dom = l.daysOnMarket || 0;

    const zipStats = marketStats[zip];
    const typeStats = zipStats?.[propType];
    if (!typeStats || typeStats.avgDom <= 0) continue;

    const tier = classifyTier(dom, typeStats.avgDom, params);
    if (!tier) continue;

    // Apply price filters
    if (params.minPrice && l.price < params.minPrice) continue;
    if (params.maxPrice && l.price > params.maxPrice) continue;

    // Apply property type filter
    if (params.propertyTypes?.length && !params.propertyTypes.includes(propType)) continue;

    results.push({
      listingKey: l.id,
      mlsNumber: l.mlsNumber,
      address: l.formattedAddress || l.addressLine1 || "Unknown Address",
      city: l.city,
      state: l.state,
      zipCode: zip,
      latitude: l.latitude,
      longitude: l.longitude,
      propertyType: propType,
      listPrice: l.price,
      originalListPrice: undefined,
      beds: l.bedrooms,
      baths: l.bathrooms,
      sqft: l.squareFootage,
      yearBuilt: l.yearBuilt,
      daysOnMarket: dom,
      cumulativeDaysOnMarket: undefined,
      listedDate: l.listedDate,
      avgDomForType: typeStats.avgDom,
      domRatio: Math.round((dom / typeStats.avgDom) * 100) / 100,
      tier,
      listingAgentName: l.listingAgent?.name,
      listingAgentPhone: l.listingAgent?.phone,
      listingAgentEmail: l.listingAgent?.email,
      listingOfficeName: l.listingOffice?.name,
      dataSource: "rentcast",
    });
  }

  results.sort((a, b) => b.domRatio - a.domRatio);

  return { listings: results, marketStats };
}

// ---------------------------------------------------------------------------
// Main search function — MLS first, RentCast fallback
// ---------------------------------------------------------------------------

export async function runDomSearch(
  params: DomSearchParams,
  options: {
    trestleConfig?: any;
    rentcastClient?: RentcastClient | null;
    cachedMarketStats?: Record<string, any>;
  }
): Promise<DomSearchResult> {
  let mlsResults: DomProspectResult[] = [];
  let rentcastResults: DomProspectResult[] = [];
  let allMarketStats: Record<string, Record<string, { avgDom: number; count: number }>> = {};
  let dataSource: "mls" | "rentcast" | "mixed" = "rentcast";

  // 1. Try MLS (Trestle) first
  if (options.trestleConfig) {
    try {
      const trestle = createTrestleClient(options.trestleConfig);
      const mlsSearch = await searchMls(trestle, params);
      mlsResults = mlsSearch.listings;
      allMarketStats = mlsSearch.marketStats;
      dataSource = "mls";
      console.log(`[DomEngine] MLS returned ${mlsResults.length} stale listings across ${params.zipCodes.length} zips`);
    } catch (err: any) {
      console.warn("[DomEngine] MLS search failed, falling back to RentCast:", err.message);
    }
  }

  // 2. For zips with no MLS results, supplement with RentCast
  const mlsZips = new Set(mlsResults.map(r => r.zipCode));
  const missingZips = params.zipCodes.filter(z => !mlsZips.has(z));

  if (missingZips.length > 0 && options.rentcastClient) {
    try {
      const rcParams = { ...params, zipCodes: missingZips };
      const rcSearch = await searchRentcast(
        options.rentcastClient,
        rcParams,
        options.cachedMarketStats
      );
      rentcastResults = rcSearch.listings;

      // Merge market stats
      for (const [zip, stats] of Object.entries(rcSearch.marketStats)) {
        if (!allMarketStats[zip]) allMarketStats[zip] = stats;
      }

      if (mlsResults.length > 0 && rentcastResults.length > 0) {
        dataSource = "mixed";
      } else if (rentcastResults.length > 0) {
        dataSource = "rentcast";
      }

      console.log(`[DomEngine] RentCast supplemented ${rentcastResults.length} listings for ${missingZips.length} zips`);
    } catch (err: any) {
      console.warn("[DomEngine] RentCast fallback also failed:", err.message);
    }
  }

  // 3. Combine and sort by DOM ratio
  const combined = [...mlsResults, ...rentcastResults].sort(
    (a, b) => b.domRatio - a.domRatio
  );

  return {
    results: combined,
    marketStats: allMarketStats,
    dataSource,
    searchedAt: new Date().toISOString(),
  };
}
