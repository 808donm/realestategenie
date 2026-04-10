/**
 * DOM Cache Engine
 *
 * Global listings cache for DOM prospecting. MLS (Trestle) is the source of truth.
 * Realie supplements with AVM/equity/ownership. RentCast supplements with rental
 * AVM, HOA, and serves as listing fallback when MLS is unavailable.
 *
 * Key functions:
 * - refreshListingsCache()    — weekly bulk pull of Active, Expired, and Withdrawn Oahu listings
 * - searchCachedListings()    — DOM search against cache (zero live API calls)
 * - checkMonitoredPropertyTiers() — detect tier escalations for alerts
 * - enrichMonitoredProperties()   — refresh enrichment data for monitored properties
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { TrestleClient, TrestleProperty, createTrestleClient } from "@/lib/integrations/trestle-client";
import { RentcastClient } from "@/lib/integrations/rentcast-client";
import {
  normalizeMlsPropertyType,
  normalizeRentcastPropertyType,
  classifyTier,
  calculateLiveDom,
  type DomSearchParams,
  type DomProspectResult,
  type DomSearchResult,
} from "./dom-search-engine";

// Oahu zip codes
const OAHU_ZIPS = [
  "96701",
  "96706",
  "96707",
  "96709",
  "96712",
  "96717",
  "96730",
  "96731",
  "96734",
  "96744",
  "96759",
  "96762",
  "96782",
  "96786",
  "96789",
  "96791",
  "96792",
  "96795",
  "96797",
  "96813",
  "96814",
  "96815",
  "96816",
  "96817",
  "96818",
  "96819",
  "96820",
  "96821",
  "96822",
  "96824",
  "96825",
  "96826",
];

// Trestle fields to select
const MLS_SELECT_FIELDS = [
  "ListingKey",
  "ListingId",
  "StandardStatus",
  "PropertyType",
  "ListPrice",
  "OriginalListPrice",
  "UnparsedAddress",
  "StreetNumber",
  "StreetName",
  "StreetSuffix",
  "City",
  "StateOrProvince",
  "PostalCode",
  "Latitude",
  "Longitude",
  "BedroomsTotal",
  "BathroomsTotalInteger",
  "LivingArea",
  "YearBuilt",
  "DaysOnMarket",
  "CumulativeDaysOnMarket",
  "OnMarketDate",
  "ListAgentFullName",
  "ListAgentDirectPhone",
  "ListAgentEmail",
  "ListOfficeName",
].join(",");

// ---------------------------------------------------------------------------
// refreshListingsCache — Weekly bulk pull
// ---------------------------------------------------------------------------

export async function refreshListingsCache(
  supabase: SupabaseClient,
  trestleConfig: any | null,
  rentcastClient: RentcastClient | null,
): Promise<{
  batchId: string;
  totalListings: number;
  mlsListings: number;
  rentcastListings: number;
  zipsFetched: number;
  zipsFailed: number;
}> {
  const batchId = crypto.randomUUID();
  let totalListings = 0;
  let mlsListings = 0;
  let rentcastListings = 0;
  let zipsFetched = 0;
  let zipsFailed = 0;

  const trestle = trestleConfig ? createTrestleClient(trestleConfig) : null;

  // Process zips in batches of 5
  const BATCH_SIZE = 5;
  const DELAY_MS = 500;

  for (let i = 0; i < OAHU_ZIPS.length; i += BATCH_SIZE) {
    const batch = OAHU_ZIPS.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (zip) => {
        try {
          let listings: any[] = [];

          // STEP 1: Try MLS (Trestle) — source of truth
          if (trestle) {
            try {
              let offset = 0;
              let hasMore = true;

              while (hasMore) {
                const result = await trestle.getProperties({
                  $filter: `(StandardStatus eq 'Active' or StandardStatus eq 'Expired' or StandardStatus eq 'Withdrawn') and startswith(PostalCode, '${zip}')`,
                  $select: MLS_SELECT_FIELDS,
                  $orderby: "DaysOnMarket desc",
                  $top: 500,
                  $skip: offset,
                  $count: true,
                });

                const mlsRows = result.value.map((l: TrestleProperty) => ({
                  listing_key: l.ListingKey,
                  listing_id: l.ListingId,
                  standard_status: l.StandardStatus || "Active",
                  address:
                    l.UnparsedAddress ||
                    [l.StreetNumber, l.StreetName, l.StreetSuffix].filter(Boolean).join(" ") ||
                    "Unknown",
                  city: l.City,
                  state: l.StateOrProvince,
                  zip_code: l.PostalCode?.substring(0, 5) || zip,
                  latitude: l.Latitude,
                  longitude: l.Longitude,
                  property_type: normalizeMlsPropertyType(l.PropertyType),
                  raw_property_type: l.PropertyType,
                  list_price: l.ListPrice,
                  original_list_price: l.OriginalListPrice,
                  beds: l.BedroomsTotal,
                  baths: l.BathroomsTotalInteger,
                  sqft: l.LivingArea,
                  year_built: l.YearBuilt,
                  days_on_market: l.DaysOnMarket,
                  cumulative_days_on_market: l.CumulativeDaysOnMarket,
                  on_market_date: l.OnMarketDate || null,
                  listing_agent_name: l.ListAgentFullName,
                  listing_agent_phone: l.ListAgentDirectPhone,
                  listing_agent_email: l.ListAgentEmail,
                  listing_office_name: l.ListOfficeName,
                  data_source: "mls",
                  batch_id: batchId,
                }));

                listings.push(...mlsRows);
                mlsListings += mlsRows.length;

                const totalCount = result["@odata.count"] || 0;
                offset += 500;
                hasMore = offset < totalCount;
              }
            } catch (err: any) {
              console.warn(`[DomCache] Trestle failed for zip ${zip}:`, err.message);
            }
          }

          // STEP 2: RentCast fallback if MLS returned nothing
          if (listings.length === 0 && rentcastClient) {
            try {
              const rcListings = await rentcastClient.getSaleListings({
                zipCode: zip,
                status: "Active",
                limit: 500,
              });

              const rcRows = rcListings.map((l: any) => ({
                listing_key: l.id,
                listing_id: l.mlsNumber || null,
                standard_status: "Active",
                address: l.formattedAddress || l.addressLine1 || "Unknown",
                city: l.city,
                state: l.state,
                zip_code: l.zipCode || zip,
                latitude: l.latitude,
                longitude: l.longitude,
                property_type: normalizeRentcastPropertyType(l.propertyType),
                raw_property_type: l.propertyType,
                list_price: l.price,
                original_list_price: null,
                beds: l.bedrooms,
                baths: l.bathrooms,
                sqft: l.squareFootage,
                year_built: l.yearBuilt,
                days_on_market: l.daysOnMarket,
                cumulative_days_on_market: null,
                on_market_date: l.listedDate ? l.listedDate.split("T")[0] : null,
                listing_agent_name: l.listingAgent?.name || null,
                listing_agent_phone: l.listingAgent?.phone || null,
                listing_agent_email: l.listingAgent?.email || null,
                listing_office_name: l.listingOffice?.name || null,
                data_source: "rentcast",
                batch_id: batchId,
                hoa_fee: l.hoa?.fee || null,
              }));

              listings.push(...rcRows);
              rentcastListings += rcRows.length;
            } catch (err: any) {
              console.warn(`[DomCache] RentCast fallback failed for zip ${zip}:`, err.message);
            }
          }

          // Insert into cache
          if (listings.length > 0) {
            // Insert in chunks of 200
            for (let j = 0; j < listings.length; j += 200) {
              const chunk = listings.slice(j, j + 200);
              const { error } = await supabase.from("dom_listings_cache").insert(chunk);
              if (error) {
                console.error(`[DomCache] Insert error for zip ${zip}:`, error.message);
              }
            }
            totalListings += listings.length;
            zipsFetched++;
          } else {
            zipsFailed++;
          }
        } catch (err: any) {
          console.error(`[DomCache] Fatal error for zip ${zip}:`, err.message);
          zipsFailed++;
        }
      }),
    );

    // Rate limit between batches
    if (i + BATCH_SIZE < OAHU_ZIPS.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  // Delete previous batches (keep only the new one)
  const { error: deleteErr } = await supabase.from("dom_listings_cache").delete().neq("batch_id", batchId);

  if (deleteErr) {
    console.error("[DomCache] Failed to clean old batches:", deleteErr.message);
  }

  console.log(
    `[DomCache] Refresh complete: ${totalListings} listings (${mlsListings} MLS, ${rentcastListings} RentCast) across ${zipsFetched} zips`,
  );

  return { batchId, totalListings, mlsListings, rentcastListings, zipsFetched, zipsFailed };
}

// ---------------------------------------------------------------------------
// searchCachedListings — DOM search against cache (no live API calls)
// ---------------------------------------------------------------------------

export async function searchCachedListings(
  supabase: SupabaseClient,
  params: DomSearchParams,
): Promise<DomSearchResult> {
  // Check if cache has unexpired data
  const { count: cacheCount } = await supabase
    .from("dom_listings_cache")
    .select("*", { count: "exact", head: true })
    .gte("expires_at", new Date().toISOString());

  if (!cacheCount || cacheCount === 0) {
    return { results: [], marketStats: {}, dataSource: "rentcast", searchedAt: new Date().toISOString() };
  }

  // Build query
  let query = supabase
    .from("dom_listings_cache")
    .select("*")
    .in("standard_status", ["Active", "Expired", "Withdrawn"])
    .in("zip_code", params.zipCodes)
    .gte("expires_at", new Date().toISOString());

  if (params.propertyTypes?.length) {
    query = query.in("property_type", params.propertyTypes);
  }
  if (params.minPrice) {
    query = query.gte("list_price", params.minPrice);
  }
  if (params.maxPrice) {
    query = query.lte("list_price", params.maxPrice);
  }

  const { data: listings, error } = await query;
  if (error || !listings) {
    console.error("[DomCache] Query error:", error?.message);
    return { results: [], marketStats: {}, dataSource: "mls", searchedAt: new Date().toISOString() };
  }

  // Get avg DOM per zip/type from area_data_cache
  const { data: marketCache } = await supabase
    .from("area_data_cache")
    .select("zip_code, data")
    .eq("data_type", "market_stats")
    .in("zip_code", params.zipCodes);

  const avgDomByZipType: Record<string, Record<string, number>> = {};

  // First: populate from cached market stats
  if (marketCache) {
    for (const row of marketCache) {
      const byType = row.data?.saleData?.dataByPropertyType;
      if (byType) {
        avgDomByZipType[row.zip_code] = {};
        for (const d of byType) {
          const normType = normalizeRentcastPropertyType(d.propertyType);
          if (d.averageDaysOnMarket != null) {
            avgDomByZipType[row.zip_code][normType] = Math.round(d.averageDaysOnMarket);
          }
        }
      }
    }
  }

  // Second: compute from cache listings for zips/types missing from market stats
  // Only use Active listings for avg DOM (Expired/Withdrawn would skew averages)
  const listingsByZipType: Record<string, Record<string, number[]>> = {};
  for (const l of listings) {
    if (l.standard_status !== "Active") continue;
    const zip = l.zip_code;
    const type = l.property_type || "Other";
    if (!listingsByZipType[zip]) listingsByZipType[zip] = {};
    if (!listingsByZipType[zip][type]) listingsByZipType[zip][type] = [];
    const dom = calculateLiveDom(l.on_market_date, l.days_on_market);
    listingsByZipType[zip][type].push(dom);
  }

  for (const [zip, types] of Object.entries(listingsByZipType)) {
    if (!avgDomByZipType[zip]) avgDomByZipType[zip] = {};
    for (const [type, doms] of Object.entries(types)) {
      if (!avgDomByZipType[zip][type]) {
        avgDomByZipType[zip][type] = Math.round(doms.reduce((a, b) => a + b, 0) / doms.length);
      }
    }
  }

  // Classify each listing
  const results: DomProspectResult[] = [];
  const marketStats: Record<string, Record<string, { avgDom: number; count: number }>> = {};

  for (const l of listings) {
    const zip = l.zip_code;
    const type = l.property_type || "Other";
    const liveDom = calculateLiveDom(l.on_market_date, l.days_on_market);
    const avgDom = avgDomByZipType[zip]?.[type] || 0;

    if (avgDom <= 0) continue;

    // Build market stats for response
    if (!marketStats[zip]) marketStats[zip] = {};
    if (!marketStats[zip][type]) {
      const doms = listingsByZipType[zip]?.[type] || [];
      marketStats[zip][type] = { avgDom, count: doms.length };
    }

    const status = l.standard_status || "Active";
    const isExpiredOrWithdrawn = status === "Expired" || status === "Withdrawn";
    const tier = classifyTier(liveDom, avgDom, params);

    // Include if: expired/withdrawn (always prospectable) OR active exceeding DOM threshold
    if (!tier && !isExpiredOrWithdrawn) continue;

    results.push({
      listingKey: l.listing_key,
      mlsNumber: l.listing_id,
      address: l.address,
      city: l.city,
      state: l.state,
      zipCode: zip,
      latitude: l.latitude,
      longitude: l.longitude,
      propertyType: type,
      listPrice: l.list_price,
      originalListPrice: l.original_list_price,
      beds: l.beds,
      baths: l.baths,
      sqft: l.sqft,
      yearBuilt: l.year_built,
      daysOnMarket: liveDom,
      cumulativeDaysOnMarket: l.cumulative_days_on_market,
      listedDate: l.on_market_date,
      avgDomForType: avgDom,
      domRatio: Math.round((liveDom / avgDom) * 100) / 100,
      tier: tier || (isExpiredOrWithdrawn ? "red" : "charcoal"),
      standardStatus: status,
      prospectCategory: isExpiredOrWithdrawn ? "outreach" : "monitor",
      listingAgentName: l.listing_agent_name,
      listingAgentPhone: l.listing_agent_phone,
      listingAgentEmail: l.listing_agent_email,
      listingOfficeName: l.listing_office_name,
      dataSource: l.data_source,
    });
  }

  // Sort: outreach (expired/withdrawn) first, then by DOM ratio descending
  results.sort((a, b) => {
    if (a.prospectCategory !== b.prospectCategory) {
      return a.prospectCategory === "outreach" ? -1 : 1;
    }
    return b.domRatio - a.domRatio;
  });

  return {
    results,
    marketStats,
    dataSource: results.some((r) => r.dataSource === "mls") ? "mls" : "rentcast",
    searchedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// checkMonitoredPropertyTiers — detect tier escalations for alerts
// ---------------------------------------------------------------------------

export async function checkMonitoredPropertyTiers(supabase: SupabaseClient): Promise<
  Array<{
    monitoredPropertyId: string;
    agentId: string;
    listingKey: string;
    address: string;
    oldTier: string;
    newTier: string;
    liveDom: number;
    avgDom: number;
    domRatio: number;
    listPrice: number | null;
  }>
> {
  // Get all active monitored properties
  const { data: monitored, error: monErr } = await supabase
    .from("dom_monitored_properties")
    .select("*")
    .eq("is_active", true);

  if (monErr || !monitored?.length) return [];

  const escalations: Array<{
    monitoredPropertyId: string;
    agentId: string;
    listingKey: string;
    address: string;
    oldTier: string;
    newTier: string;
    liveDom: number;
    avgDom: number;
    domRatio: number;
    listPrice: number | null;
  }> = [];

  // Get unique zips for market stats lookup
  const uniqueZips = [...new Set(monitored.map((m) => m.zip_code))];
  const { data: marketCache } = await supabase
    .from("area_data_cache")
    .select("zip_code, data")
    .eq("data_type", "market_stats")
    .in("zip_code", uniqueZips);

  const avgDomByZipType: Record<string, Record<string, number>> = {};
  if (marketCache) {
    for (const row of marketCache) {
      const byType = row.data?.saleData?.dataByPropertyType;
      if (byType) {
        avgDomByZipType[row.zip_code] = {};
        for (const d of byType) {
          const normType = normalizeRentcastPropertyType(d.propertyType);
          if (d.averageDaysOnMarket != null) {
            avgDomByZipType[row.zip_code][normType] = Math.round(d.averageDaysOnMarket);
          }
        }
      }
    }
  }

  // Also get avg DOM from cache listings for missing zips/types
  for (const m of monitored) {
    if (!avgDomByZipType[m.zip_code]?.[m.property_type]) {
      const { data: cacheListing } = await supabase
        .from("dom_listings_cache")
        .select("days_on_market, on_market_date")
        .eq("zip_code", m.zip_code)
        .eq("property_type", m.property_type)
        .eq("standard_status", "Active")
        .gte("expires_at", new Date().toISOString());

      if (cacheListing?.length) {
        const doms = cacheListing.map((l: any) => calculateLiveDom(l.on_market_date, l.days_on_market));
        const avg = Math.round(doms.reduce((a: number, b: number) => a + b, 0) / doms.length);
        if (!avgDomByZipType[m.zip_code]) avgDomByZipType[m.zip_code] = {};
        avgDomByZipType[m.zip_code][m.property_type] = avg;
      }
    }
  }

  const TIER_ORDER = { below: 0, charcoal: 1, orange: 2, red: 3 };

  for (const m of monitored) {
    // Look up latest data from cache
    const { data: cached } = await supabase
      .from("dom_listings_cache")
      .select("*")
      .eq("listing_key", m.listing_key)
      .in("standard_status", ["Active", "Expired", "Withdrawn"])
      .gte("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    const onMarketDate = cached?.on_market_date || m.on_market_date;
    const liveDom = calculateLiveDom(onMarketDate, cached?.days_on_market || m.latest_dom);
    const avgDom = avgDomByZipType[m.zip_code]?.[m.property_type] || 0;

    if (avgDom <= 0) continue;

    const newTier =
      classifyTier(liveDom, avgDom, {
        redMultiplier: m.red_multiplier,
        orangeMultiplier: m.orange_multiplier,
        charcoalMultiplier: m.charcoal_multiplier,
      }) || "below";

    const oldTier = m.current_tier || "below";
    const domRatio = Math.round((liveDom / avgDom) * 100) / 100;

    // Update the monitored property with latest data
    await supabase
      .from("dom_monitored_properties")
      .update({
        latest_dom: liveDom,
        latest_list_price: cached?.list_price || m.latest_list_price,
        latest_status: cached?.standard_status || m.latest_status,
        previous_tier: oldTier,
        current_tier: newTier,
        last_enriched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", m.id);

    // Check for escalation
    const oldRank = TIER_ORDER[oldTier as keyof typeof TIER_ORDER] ?? 0;
    const newRank = TIER_ORDER[newTier as keyof typeof TIER_ORDER] ?? 0;

    if (newRank > oldRank) {
      escalations.push({
        monitoredPropertyId: m.id,
        agentId: m.agent_id,
        listingKey: m.listing_key,
        address: m.address,
        oldTier,
        newTier,
        liveDom,
        avgDom,
        domRatio,
        listPrice: cached?.list_price || m.latest_list_price,
      });
    }
  }

  return escalations;
}

// ---------------------------------------------------------------------------
// createTierAlerts — insert watchdog alerts for tier escalations
// ---------------------------------------------------------------------------

export async function createTierAlerts(
  supabase: SupabaseClient,
  escalations: Array<{
    monitoredPropertyId: string;
    agentId: string;
    listingKey: string;
    address: string;
    oldTier: string;
    newTier: string;
    liveDom: number;
    avgDom: number;
    domRatio: number;
    listPrice: number | null;
  }>,
): Promise<number> {
  if (!escalations.length) return 0;

  const TIER_LABELS: Record<string, string> = {
    red: "Likely Target",
    orange: "Possible Target",
    charcoal: "Monitor",
    below: "Below Threshold",
  };

  const alerts = escalations.map((e) => ({
    agent_id: e.agentId,
    monitored_property_id: e.monitoredPropertyId,
    listing_key: e.listingKey,
    address: e.address,
    alert_type: "dom_tier_change",
    alert_title: `${e.address} escalated to ${TIER_LABELS[e.newTier]} (DOM: ${e.liveDom}, avg: ${e.avgDom})`,
    alert_details: {
      previousTier: e.oldTier,
      newTier: e.newTier,
      liveDom: e.liveDom,
      avgDom: e.avgDom,
      domRatio: e.domRatio,
      listPrice: e.listPrice,
    },
    status: "new",
  }));

  const { error } = await supabase.from("mls_watchdog_alerts").insert(alerts);
  if (error) {
    console.error("[DomCache] Failed to create tier alerts:", error.message);
    return 0;
  }

  return alerts.length;
}
