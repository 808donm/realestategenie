import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { RealieClient, createRealieClient } from "@/lib/integrations/realie-client";
import type { RealieParcel } from "@/lib/integrations/realie-client";
import { RentcastClient, createRentcastClient, mapRentcastToRealieParcel } from "@/lib/integrations/rentcast-client";
import { scoreParcel } from "@/lib/scoring/seller-motivation-score";
import { buildSearchCacheKey, searchCacheGet, searchCacheSet } from "@/lib/cache/seller-map-search-cache";

/**
 * GET /api/seller-map
 *
 * Fetch properties in a geographic area, score them for seller motivation,
 * and return scored results for the Seller Opportunity Map.
 *
 * Flow:
 *   1. RentCast: primary search (up to 500 properties, valuation, market data)
 *   2. Score with RentCast data alone
 *   3. Realie: enrich top candidates (score >= 30) with LTV, equity, liens, portfolio
 *   4. Re-score enriched properties for final ranking
 *
 * Query params:
 *   lat, lng    — center coordinates (required)
 *   radius      — search radius in miles (default 10, max 50)
 *   minScore    — minimum seller motivation score (default 0)
 *   absenteeOnly — filter to absentee owners only
 *   zip         — alternative to lat/lng: search by zip code
 *   limit       — max results (default 100, max 2000)
 *   page        — pagination page (default 1)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = request.nextUrl;
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");
    const zip = url.searchParams.get("zip");
    const zips = url.searchParams.get("zips"); // comma-separated zip codes
    const radius = Math.min(Number(url.searchParams.get("radius") || 10), 50);
    const minScore = Number(url.searchParams.get("minScore") || 0);
    const absenteeOnly = url.searchParams.get("absenteeOnly") === "true";
    const limit = Math.min(Number(url.searchParams.get("limit") || 100), 2000);
    const page = Number(url.searchParams.get("page") || 1);

    if (!lat && !lng && !zip && !zips) {
      return NextResponse.json(
        { error: "Either lat+lng, zip, or zips is required" },
        { status: 400 }
      );
    }

    // Parse multi-zip parameter
    const zipList = zips
      ? zips.split(",").map((z) => z.trim()).filter((z) => /^\d{5}$/.test(z))
      : [];

    // ── Check global search cache (7-day TTL, shared across all users) ──
    const cacheKey = buildSearchCacheKey({
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      radius,
      zip: zipList.length > 0 ? zipList.sort().join(",") : zip || undefined,
    });

    const cached = await searchCacheGet(cacheKey);
    if (cached) {
      // Apply user-specific filters on cached results
      let filtered = cached.properties
        .filter((s: any) => s.score >= minScore)
        .filter((s: any) => !absenteeOnly || s.absentee);

      return NextResponse.json({
        properties: filtered.slice(0, limit),
        total: filtered.length,
        center: lat && lng ? { lat: Number(lat), lng: Number(lng) } : undefined,
        radiusMiles: radius,
        page,
        marketData: cached.marketData,
        cached: true,
      });
    }

    let parcels: RealieParcel[] = [];

    if (zipList.length > 0) {
      // ── Multi-zip search: parallel per-zip queries ──
      parcels = await fetchByZipCodes(zipList, limit);
    } else if (lat && lng) {
      parcels = await fetchByCoords(Number(lat), Number(lng), radius, limit, page);
    } else if (zip) {
      // Single zip search
      parcels = await fetchByZipCodes([zip], limit);
    }

    // Enrich parcels with market trend data (one API call per unique zip)
    const rentcastForMarket = await getRentcastClient();
    if (rentcastForMarket) {
      const uniqueZips = [...new Set(parcels.map((p) => p.zipCode).filter(Boolean))] as string[];
      if (uniqueZips.length > 0) {
        const marketResults = await Promise.allSettled(
          uniqueZips.slice(0, 20).map((zipCode) =>
            rentcastForMarket.getMarketData({ zipCode, dataType: "Sale" })
              .then((data) => ({ zipCode, data }))
          )
        );

        const marketByZip = new Map<string, {
          medianPrice: number | undefined;
          medianPricePerSqft: number | undefined;
          avgDom: number | undefined;
          totalListings: number | undefined;
          newListings: number | undefined;
          priceTrend: number | undefined;
          medianRent: number | undefined;
        }>();

        for (const r of marketResults) {
          if (r.status !== "fulfilled") continue;
          const { zipCode: z, data } = r.value;
          const sale = data.saleData;
          if (!sale) continue;

          // Calculate price trend from history (compare most recent 2 months)
          let priceTrend: number | undefined;
          if (sale.history) {
            const months = Object.keys(sale.history).sort();
            if (months.length >= 2) {
              const current = sale.history[months[months.length - 1]];
              const previous = sale.history[months[months.length - 2]];
              if (current?.medianPrice && previous?.medianPrice) {
                priceTrend = ((current.medianPrice - previous.medianPrice) / previous.medianPrice) * 100;
              }
            }
          }

          marketByZip.set(z, {
            medianPrice: sale.medianPrice,
            medianPricePerSqft: sale.medianPricePerSquareFoot,
            avgDom: sale.averageDaysOnMarket,
            totalListings: sale.totalListings,
            newListings: sale.newListings,
            priceTrend,
            medianRent: data.rentalData?.medianRent,
          });
        }

        if (marketByZip.size > 0) {
          console.log(`[SellerMap] Market data fetched for ${marketByZip.size}/${uniqueZips.length} zips`);
          parcels = parcels.map((p) => {
            const market = p.zipCode ? marketByZip.get(p.zipCode) : undefined;
            if (!market) return p;
            return {
              ...p,
              marketMedianPrice: market.medianPrice,
              marketMedianPricePerSqft: market.medianPricePerSqft,
              marketAvgDaysOnMarket: market.avgDom,
              marketTotalListings: market.totalListings,
              marketNewListings: market.newListings,
              marketPriceTrend: market.priceTrend,
              marketMedianRent: market.medianRent,
            };
          });
        }
      }
    }

    // ── Phase 1: Initial scoring with RentCast data only ──
    let scored = parcels
      .map((p) => scoreParcel(p))
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .filter((s) => !absenteeOnly || s.absentee)
      .sort((a, b) => b.score - a.score);

    console.log(`[SellerMap] Phase 1 scored: ${scored.length} properties (before Realie enrichment)`);

    // ── Phase 2: Realie enrichment — only for top candidates (score >= 30) ──
    // Realie provides LTV, equity, liens, foreclosure, and portfolio data.
    // We only call Realie for properties that already show seller motivation
    // from RentCast data alone, respecting the 100-result Realie API cap.
    const realie = await getRealieClient();
    const parcelMap = new Map(parcels.map((p) => [
      p._id || p.siteId || p.parcelId || `${p.latitude}-${p.longitude}`,
      p,
    ]));

    const enrichCandidates = scored.filter((s) => s.score >= 30).slice(0, 500);

    if (realie && enrichCandidates.length > 0) {
      try {
        // Group candidates by zip code and fetch Realie data per zip (more targeted)
        const candidateZips = [...new Set(enrichCandidates.map((s) => {
          const parcel = parcelMap.get(s.id);
          return parcel?.zipCode;
        }).filter(Boolean))] as string[];

        // Fetch Realie data for each zip (cap total across all zips)
        let realieProperties: RealieParcel[] = [];
        let remaining = 500;

        for (const zipCode of candidateZips.slice(0, 20)) {
          if (remaining <= 0) break;
          try {
            const result = await realie.searchByZip({
              zip: zipCode,
              limit: Math.min(remaining, 100),
            });
            realieProperties.push(...result.properties);
            remaining -= result.properties.length;
          } catch (err: any) {
            console.warn(`[SellerMap] Realie zip ${zipCode} failed (non-fatal):`, err.message);
          }
        }

        if (realieProperties.length > 0) {
          console.log(`[SellerMap] Realie enrichment: ${realieProperties.length} properties across ${candidateZips.length} zips`);
          const realieMap = buildAddressMap(realieProperties);

          // Enrich original parcels and re-score
          scored = scored.map((s) => {
            const parcel = parcelMap.get(s.id);
            if (!parcel) return s;

            const enriched = enrichWithRealieData(parcel, realieMap);
            if (enriched === parcel) return s; // No Realie match found

            // Update the parcel map with enriched data
            parcelMap.set(s.id, enriched);
            const rescored = scoreParcel(enriched);
            return rescored || s;
          }).sort((a, b) => b.score - a.score);
        }
      } catch (err: any) {
        console.warn("[SellerMap] Realie enrichment failed (non-fatal):", err.message);
      }
    }

    // ── Phase 3: Apply minScore filter after enrichment ──
    scored = scored.filter((s) => s.score >= minScore);

    // ── Phase 4: AVM enrichment for borderline candidates ──
    // Fetch real market values for properties near the "likely" threshold
    // or missing valuation data entirely.
    const rentcastForAvm = await getRentcastClient();
    if (rentcastForAvm) {
      const possibleCandidates = scored.filter((s) => s.score >= 35 && s.score < 50);
      const noValueCandidates = scored.filter((s) => !s.estimatedValue && s.score >= 20);
      const seen = new Set<string>();
      const avmBatch: typeof scored = [];
      for (const s of [...possibleCandidates, ...noValueCandidates]) {
        if (!seen.has(s.id) && avmBatch.length < 10) {
          seen.add(s.id);
          avmBatch.push(s);
        }
      }

      if (avmBatch.length > 0) {
        const avmResults = await Promise.allSettled(
          avmBatch.map((s) =>
            rentcastForAvm.getValueEstimate({
              address: s.address,
              compCount: 5,
            }).then((r) => ({ id: s.id, price: r.price }))
          )
        );

        const avmMap = new Map<string, number>();
        for (const r of avmResults) {
          if (r.status === "fulfilled" && r.value.price) {
            avmMap.set(r.value.id, r.value.price);
          }
        }

        if (avmMap.size > 0) {
          console.log(`[SellerMap] AVM enriched ${avmMap.size}/${avmBatch.length} properties`);

          scored = scored.map((s) => {
            const avmPrice = avmMap.get(s.id);
            if (!avmPrice) return s;

            const parcel = parcelMap.get(s.id);
            if (!parcel) return s;

            const enriched = { ...parcel, modelValue: avmPrice };
            const rescored = scoreParcel(enriched);
            return rescored || s;
          }).sort((a, b) => b.score - a.score);
        }
      }
    }

    // Extract unique market context for the response
    const marketContext = new Map<string, any>();
    for (const p of parcels) {
      if (p.zipCode && p.marketMedianPrice != null && !marketContext.has(p.zipCode)) {
        marketContext.set(p.zipCode, {
          zipCode: p.zipCode,
          medianPrice: p.marketMedianPrice,
          medianPricePerSqft: p.marketMedianPricePerSqft,
          avgDaysOnMarket: p.marketAvgDaysOnMarket,
          totalListings: p.marketTotalListings,
          newListings: p.marketNewListings,
          priceTrend: p.marketPriceTrend,
          medianRent: p.marketMedianRent,
        });
      }
    }

    const marketData = Object.fromEntries(marketContext);

    // ── Cache the full scored results (before user-specific filters) ──
    // Store all scored properties so different users with different
    // minScore/absenteeOnly filters can benefit from the same cache.
    searchCacheSet(
      cacheKey,
      { properties: scored, total: scored.length, marketData },
      {
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        radius,
        zip: zip || undefined,
      }
    ).catch((err) => console.warn("[SellerMap] Cache write failed (non-fatal):", err));

    return NextResponse.json({
      properties: scored.slice(0, limit),
      total: scored.length,
      center: lat && lng ? { lat: Number(lat), lng: Number(lng) } : undefined,
      radiusMiles: radius,
      page,
      marketData,
    });
  } catch (error: any) {
    console.error("[SellerMap] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch seller map data" },
      { status: 500 }
    );
  }
}

/**
 * Fetch properties by coordinates using RentCast (up to 500 results).
 * Realie enrichment happens later, only for top-scoring candidates.
 */
async function fetchByCoords(
  lat: number,
  lng: number,
  radius: number,
  limit: number,
  page: number
): Promise<RealieParcel[]> {
  const rentcast = await getRentcastClient();

  if (rentcast) {
    try {
      const offset = page > 1 ? (page - 1) * Math.min(limit, 500) : 0;
      const results = await rentcast.searchProperties({
        latitude: lat,
        longitude: lng,
        radius,
        limit: Math.min(limit, 500),
        offset,
      });
      console.log(`[SellerMap] RentCast returned ${results.length} properties`);
      return results.map(mapRentcastToRealieParcel);
    } catch (err: any) {
      console.error("[SellerMap] RentCast error:", err.message);
    }
  }

  // Fallback: Realie radius search if RentCast is not configured
  const realie = await getRealieClient();
  if (realie) {
    try {
      const result = await realie.searchByRadius({
        latitude: lat,
        longitude: lng,
        radius,
        limit: Math.min(limit, 100),
        page,
      });
      console.log(`[SellerMap] Realie fallback returned ${result.properties.length} properties`);
      return result.properties;
    } catch (err: any) {
      console.error("[SellerMap] Realie fallback error:", err.message);
    }
  }

  return [];
}

/**
 * Fetch properties across multiple zip codes in parallel.
 * Each zip gets up to 500 results from RentCast (or 100 from Realie),
 * then results are merged and deduplicated.
 */
async function fetchByZipCodes(
  zipCodes: string[],
  totalLimit: number
): Promise<RealieParcel[]> {
  const rentcast = await getRentcastClient();
  const realie = await getRealieClient();

  if (!rentcast && !realie) return [];

  // Query each zip independently with full per-zip limits (not split across zips)
  const PER_ZIP_LIMIT_RENTCAST = 500;
  const PER_ZIP_LIMIT_REALIE = 100;

  const results = await Promise.allSettled(
    zipCodes.slice(0, 20).map(async (zipCode) => {
      // Try RentCast first (up to 500 per zip)
      if (rentcast) {
        try {
          const props = await rentcast.searchProperties({
            zipCode,
            limit: PER_ZIP_LIMIT_RENTCAST,
          });
          if (props.length > 0) {
            console.log(`[SellerMap] RentCast zip ${zipCode}: ${props.length} properties`);
            return props.map(mapRentcastToRealieParcel);
          }
          console.log(`[SellerMap] RentCast zip ${zipCode}: 0 results, trying Realie fallback`);
        } catch (err: any) {
          console.warn(`[SellerMap] RentCast zip ${zipCode} failed: ${err.message}, trying Realie fallback`);
        }
      }

      // Fallback to Realie (paginate through up to 500 results, 100 per page)
      if (realie) {
        try {
          const allPages: RealieParcel[] = [];
          const maxPages = 5; // 5 pages * 100 = 500 max per zip
          for (let page = 1; page <= maxPages; page++) {
            const result = await realie.searchByZip({
              zip: zipCode,
              limit: PER_ZIP_LIMIT_REALIE,
              page,
            });
            allPages.push(...result.properties);
            console.log(`[SellerMap] Realie zip ${zipCode} page ${page}: ${result.properties.length} properties`);
            // Stop if we got fewer than the limit (no more pages)
            if (result.properties.length < PER_ZIP_LIMIT_REALIE) break;
          }
          return allPages;
        } catch (err: any) {
          console.warn(`[SellerMap] Realie zip ${zipCode} failed: ${err.message}`);
        }
      }

      return [] as RealieParcel[];
    })
  );

  const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  console.log(`[SellerMap] Multi-zip total: ${all.length} properties across ${zipCodes.length} zips`);
  return deduplicateParcels(all);
}

/**
 * Deduplicate parcels by normalized address to avoid showing the same
 * property twice when it appears in overlapping zip/radius results.
 */
function deduplicateParcels(parcels: RealieParcel[]): RealieParcel[] {
  const seen = new Set<string>();
  return parcels.filter((p) => {
    const key = p.address ? normalizeAddress(p.address) : `${p.latitude}-${p.longitude}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Normalize address for fuzzy matching between RentCast and Realie records.
 */
function normalizeAddress(addr: string): string {
  return addr
    .toLowerCase()
    .replace(/\bapt\b.*$/i, "")
    .replace(/\bunit\b.*$/i, "")
    .replace(/\bste\b.*$/i, "")
    .replace(/\b0+(\d)/g, "$1")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Build a lookup map from Realie properties keyed by normalized address.
 */
function buildAddressMap(
  properties: RealieParcel[]
): Map<string, RealieParcel> {
  const map = new Map<string, RealieParcel>();
  for (const p of properties) {
    const addr = p.address || p.addressFull;
    if (addr) {
      map.set(normalizeAddress(addr), p);
    }
  }
  return map;
}

/**
 * Merge Realie-specific fields (equity, LTV, liens, foreclosure, portfolio)
 * into a RentCast-sourced parcel. Only overwrites fields that are missing.
 */
function enrichWithRealieData(
  parcel: RealieParcel,
  realieMap: Map<string, RealieParcel>
): RealieParcel {
  const addr = parcel.address || parcel.addressFull;
  if (!addr) return parcel;

  const match = realieMap.get(normalizeAddress(addr));
  if (!match) return parcel;

  return {
    ...parcel,
    // Equity analysis fields (RentCast doesn't provide these)
    LTVCurrentEstCombined: parcel.LTVCurrentEstCombined ?? match.LTVCurrentEstCombined,
    equityCurrentEstBal: parcel.equityCurrentEstBal ?? match.equityCurrentEstBal,
    modelValue: parcel.modelValue ?? match.modelValue,

    // Distress signals
    forecloseCode: parcel.forecloseCode ?? match.forecloseCode,
    totalLienCount: parcel.totalLienCount ?? match.totalLienCount,
    totalLienBalance: parcel.totalLienBalance ?? match.totalLienBalance,

    // Investor portfolio
    ownerParcelCount: parcel.ownerParcelCount ?? match.ownerParcelCount,
    ownerResCount: parcel.ownerResCount ?? match.ownerResCount,
    ownerComCount: parcel.ownerComCount ?? match.ownerComCount,

    // Market value (for tax anomaly scoring)
    totalMarketValue: parcel.totalMarketValue ?? match.totalMarketValue,
  };
}

/**
 * Helper: get a working RentCast client (from DB config or env var)
 */
async function getRentcastClient(): Promise<RentcastClient | null> {
  try {
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("config")
      .eq("provider", "rentcast")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();

    if (integration?.config) {
      const config =
        typeof integration.config === "string"
          ? JSON.parse(integration.config)
          : integration.config;

      if (config.api_key) {
        return new RentcastClient({ apiKey: config.api_key });
      }
    }

    return createRentcastClient();
  } catch {
    return null;
  }
}

/**
 * Helper: get a working Realie client (from DB config or env var)
 */
async function getRealieClient(): Promise<RealieClient | null> {
  try {
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("config")
      .eq("provider", "realie")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();

    if (integration?.config) {
      const config =
        typeof integration.config === "string"
          ? JSON.parse(integration.config)
          : integration.config;

      if (config.api_key) {
        return new RealieClient({ apiKey: config.api_key });
      }
    }

    return createRealieClient();
  } catch {
    return null;
  }
}
