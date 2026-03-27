import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { RealieParcel } from "@/lib/integrations/realie-client";
import {
  getConfiguredRentcastClient,
  getConfiguredRealieClient,
  fetchAndMergeByZipCodes,
  fetchAndMergeByCoords,
  bulkMergeRealieData,
  enrichWithRentcastAvm,
} from "@/lib/integrations/property-data-service";
import { scoreParcel } from "@/lib/scoring/seller-motivation-score";
import { buildSearchCacheKey, searchCacheGet, searchCacheSet } from "@/lib/cache/seller-map-search-cache";

/** Map RentCast property type values to Realie equivalents */
function toRealiePropertyType(rentcastType: string | undefined): string | undefined {
  if (!rentcastType) return undefined;
  const map: Record<string, string> = {
    "Single Family": "SFR",
    Condo: "CONDO",
    Townhouse: "SFR",
    "Multi-Family": "APARTMENT",
    Manufactured: "MOBILE",
    Land: "LAND",
  };
  return map[rentcastType];
}

/**
 * GET /api/seller-map
 *
 * Fetch properties in a geographic area, score them for seller motivation,
 * and return scored results for the Seller Opportunity Map.
 *
 * Uses the shared property-data-service for fetching and merging so that
 * results are identical to the prospecting module.
 *
 * Flow:
 *   1. Fetch from RentCast + Realie in parallel (shared service)
 *   2. Merge with AVM sanity check (shared service)
 *   3. Enrich with market trend data
 *   4. Score all properties
 *   5. AVM enrichment for borderline candidates
 *
 * Query params:
 *   lat, lng    — center coordinates (required)
 *   radius      — search radius in miles (default 10, max 50)
 *   minScore    — minimum seller motivation score (default 0)
 *   absenteeOnly — filter to absentee owners only
 *   zip         — alternative to lat/lng: search by zip code
 *   zips        — comma-separated zip codes
 *   limit       — max results (default 100, max 2000)
 *   page        — pagination page (default 1)
 */
export async function GET(request: NextRequest) {
  try {
    // Allow service-role key for internal server-to-server calls (e.g., Hoku copilot)
    const serviceKey = request.headers.get("x-service-role-key");
    const isServiceCall = serviceKey && serviceKey === process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!isServiceCall) {
      const supabase = await supabaseServer();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const url = request.nextUrl;
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");
    const zip = url.searchParams.get("zip");
    const zips = url.searchParams.get("zips"); // comma-separated zip codes
    const radius = Math.min(Number(url.searchParams.get("radius") || 10), 50);
    const minScore = Number(url.searchParams.get("minScore") || 0);
    const absenteeOnly = url.searchParams.get("absenteeOnly") === "true";
    const minOwnership = Number(url.searchParams.get("minOwnership") || 0);
    const minEquity = Number(url.searchParams.get("minEquity") || 0);
    const minProperties = Number(url.searchParams.get("minProperties") || 0);
    const limit = Math.min(Number(url.searchParams.get("limit") || 100), 2000);
    const page = Number(url.searchParams.get("page") || 1);
    const propertyType = url.searchParams.get("propertyType") || undefined;

    if (!lat && !lng && !zip && !zips) {
      return NextResponse.json({ error: "Either lat+lng, zip, or zips is required" }, { status: 400 });
    }

    // Parse multi-zip parameter
    const zipList = zips
      ? zips
          .split(",")
          .map((z) => z.trim())
          .filter((z) => /^\d{5}$/.test(z))
      : [];

    // ── Check global search cache (7-day TTL, shared across all users) ──
    const cacheKey = buildSearchCacheKey({
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      radius,
      zip: zipList.length > 0 ? zipList.sort().join(",") : zip || undefined,
      propertyType,
    });

    const cached = await searchCacheGet(cacheKey);
    if (cached) {
      // Apply user-specific filters on cached results
      let filtered = cached.properties
        .filter((s: any) => s.score >= minScore)
        .filter((s: any) => !absenteeOnly || s.absentee)
        .filter((s: any) => !minOwnership || (s.ownershipYears != null && s.ownershipYears >= minOwnership))
        .filter(
          (s: any) =>
            !minEquity || (s.equity != null && s.estimatedValue && (s.equity / s.estimatedValue) * 100 >= minEquity),
        )
        .filter((s: any) => !minProperties || (s.ownerParcelCount != null && s.ownerParcelCount >= minProperties));

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

    // ── Fetch + merge properties via shared service ──
    // Uses the same fetch/merge pipeline as the prospecting module.
    const realieType = toRealiePropertyType(propertyType);
    let parcels: RealieParcel[];

    if (zipList.length > 0) {
      parcels = await fetchAndMergeByZipCodes(zipList, {
        limit,
        propertyType,
        realiePropertyType: realieType,
      });
    } else if (lat && lng) {
      parcels = await fetchAndMergeByCoords(Number(lat), Number(lng), radius, {
        limit,
        page,
        propertyType,
        realiePropertyType: realieType,
      });
    } else if (zip) {
      parcels = await fetchAndMergeByZipCodes([zip], {
        limit,
        propertyType,
        realiePropertyType: realieType,
      });
    } else {
      parcels = [];
    }

    console.log(`[SellerMap] Fetched ${parcels.length} parcels via shared service`);

    // ── Enrich parcels with market trend data (one API call per unique zip) ──
    const rentcastForMarket = await getConfiguredRentcastClient();
    if (rentcastForMarket) {
      const uniqueZips = [...new Set(parcels.map((p) => p.zipCode).filter(Boolean))] as string[];
      if (uniqueZips.length > 0) {
        const marketResults = await Promise.allSettled(
          uniqueZips
            .slice(0, 20)
            .map((zipCode) =>
              rentcastForMarket.getMarketData({ zipCode, dataType: "Sale" }).then((data) => ({ zipCode, data })),
            ),
        );

        const marketByZip = new Map<
          string,
          {
            medianPrice: number | undefined;
            medianPricePerSqft: number | undefined;
            avgDom: number | undefined;
            totalListings: number | undefined;
            newListings: number | undefined;
            priceTrend: number | undefined;
            medianRent: number | undefined;
          }
        >();

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

    // ── Supplement ownership dates from MLS (Hawaii non-disclosure fix) ──
    // For parcels missing transferDate, query Trestle for most recent closed sale
    const missingDates = parcels.filter((p) => !p.transferDate && !p.ownershipStartDate && p.address);
    if (missingDates.length > 0) {
      try {
        const { supabaseAdmin } = await import("@/lib/supabase/admin");
        // Find any connected Trestle integration
        const { data: trestleInteg } = await supabaseAdmin
          .from("integrations")
          .select("config")
          .eq("provider", "trestle")
          .eq("status", "connected")
          .limit(1)
          .maybeSingle();

        if (trestleInteg?.config) {
          const config =
            typeof trestleInteg.config === "string" ? JSON.parse(trestleInteg.config) : trestleInteg.config;
          if (config.client_id && config.client_secret) {
            const { TrestleClient } = await import("@/lib/integrations/trestle-client");
            const trestle = new TrestleClient(config);

            // Batch by zip code to minimize API calls
            const zipGroups = new Map<string, typeof missingDates>();
            for (const p of missingDates.slice(0, 200)) {
              const z = p.zipCode || "";
              if (!z) continue;
              if (!zipGroups.has(z)) zipGroups.set(z, []);
              zipGroups.get(z)!.push(p);
            }

            // For each zip, get all closed sales and match by street number
            const closedByZip = await Promise.allSettled(
              [...zipGroups.keys()].slice(0, 10).map(async (zipCode) => {
                const results = await trestle.searchProperties({
                  status: ["Closed"],
                  postalCode: zipCode,
                  limit: 500,
                  skipCount: true,
                });
                return { zipCode, listings: results.value || [] };
              }),
            );

            // Build a lookup: normalized address → most recent close date
            const closeDateLookup = new Map<string, { date: string; price?: number }>();
            for (const r of closedByZip) {
              if (r.status !== "fulfilled") continue;
              for (const listing of r.value.listings) {
                if (!listing.CloseDate) continue;
                const key =
                  `${(listing.StreetNumber || "").toLowerCase()}-${(listing.StreetName || "").toLowerCase()}`.trim();
                if (key && !closeDateLookup.has(key)) {
                  closeDateLookup.set(key, { date: listing.CloseDate, price: listing.ClosePrice });
                }
                // Also index by unparsed address
                const unparsed = (listing.UnparsedAddress || "").toLowerCase().trim();
                if (unparsed && !closeDateLookup.has(unparsed)) {
                  closeDateLookup.set(unparsed, { date: listing.CloseDate, price: listing.ClosePrice });
                }
              }
            }

            // Match parcels to closed sales
            let matched = 0;
            for (const p of missingDates) {
              const addr = (p.address || p.addressFull || "").toLowerCase().trim();
              if (!addr) continue;
              // Try street number + name match
              const parts = addr.match(/^(\S+)\s+(.+?)(?:,|\s+(?:apt|unit|#))/i) || addr.match(/^(\S+)\s+(.+)/);
              if (parts) {
                const key = `${parts[1]}-${parts[2].replace(/\s+(st|street|rd|road|dr|drive|ave|avenue|blvd|boulevard|ln|lane|ct|court|way|pl|place|cir|circle)\.?$/i, "").trim()}`;
                const found = closeDateLookup.get(key);
                if (found) {
                  p.transferDate = found.date;
                  if (found.price && !p.transferPrice) p.transferPrice = found.price;
                  matched++;
                  continue;
                }
              }
              // Try full address match
              const found = closeDateLookup.get(addr) || closeDateLookup.get(addr.split(",")[0].trim());
              if (found) {
                p.transferDate = found.date;
                if (found.price && !p.transferPrice) p.transferPrice = found.price;
                matched++;
              }
            }

            if (matched > 0) {
              console.log(`[SellerMap] MLS ownership dates: matched ${matched}/${missingDates.length} parcels`);
            }
          }
        }
      } catch (e) {
        console.log("[SellerMap] MLS ownership supplement failed (non-fatal):", (e as any)?.message);
      }
    }

    // ── Score all properties ──
    const parcelMap = new Map(
      parcels.map((p) => [p._id || p.siteId || p.parcelId || `${p.latitude}-${p.longitude}`, p]),
    );

    let scored = parcels
      .map((p) => scoreParcel(p))
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .filter((s) => !absenteeOnly || s.absentee)
      .filter((s) => !minOwnership || (s.ownershipYears != null && s.ownershipYears >= minOwnership))
      .filter(
        (s) => !minEquity || (s.equity != null && s.estimatedValue && (s.equity / s.estimatedValue) * 100 >= minEquity),
      )
      .filter((s) => !minProperties || (s.ownerParcelCount != null && s.ownerParcelCount >= minProperties))
      .sort((a, b) => b.score - a.score);

    console.log(`[SellerMap] Scored: ${scored.length} properties`);

    // ── Coordinate-based Realie enrichment for top candidates ──
    // For coordinate-based searches, the shared service already fetched Realie
    // data via radius search. But if the radius search returned nothing (e.g.
    // Realie has limited coord coverage), try fetching by discovered zip codes.
    if (lat && lng && zipList.length === 0 && !zip && scored.length > 0) {
      const realie = await getConfiguredRealieClient();
      if (realie) {
        const candidateZips = [
          ...new Set(
            scored
              .filter((s) => s.score >= 20)
              .slice(0, 500)
              .map((s) => parcelMap.get(s.id)?.zipCode)
              .filter(Boolean),
          ),
        ] as string[];

        if (candidateZips.length > 0) {
          try {
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
              console.log(
                `[SellerMap] Realie coord enrichment: ${realieProperties.length} properties across ${candidateZips.length} zips`,
              );
              // Use shared merge function with AVM sanity check
              const enrichedParcels = bulkMergeRealieData(
                scored.map((s) => parcelMap.get(s.id)).filter(Boolean) as RealieParcel[],
                realieProperties,
              );

              // Update parcel map and re-score
              for (const ep of enrichedParcels) {
                const key = ep._id || ep.siteId || ep.parcelId || `${ep.latitude}-${ep.longitude}`;
                parcelMap.set(key, ep);
              }

              scored = scored
                .map((s) => {
                  const parcel = parcelMap.get(s.id);
                  if (!parcel) return s;
                  const rescored = scoreParcel(parcel);
                  return rescored || s;
                })
                .sort((a, b) => b.score - a.score);
            }
          } catch (err: any) {
            console.warn("[SellerMap] Realie enrichment failed (non-fatal):", err.message);
          }
        }
      }
    }

    // ── Apply minScore filter after all enrichment ──
    scored = scored.filter((s) => s.score >= minScore);

    // ── AVM enrichment for borderline candidates ──
    const rentcastForAvm = await getConfiguredRentcastClient();
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
          avmBatch.map(async (s) => {
            const parcel = parcelMap.get(s.id);
            if (!parcel) return null;
            // Use shared AVM enrichment with assessed-value sanity check
            const enriched = await enrichWithRentcastAvm(rentcastForAvm, parcel);
            if (enriched !== parcel) {
              parcelMap.set(s.id, enriched);
              return { id: s.id, enriched };
            }
            return null;
          }),
        );

        const enrichedCount = avmResults.filter((r) => r.status === "fulfilled" && r.value != null).length;

        if (enrichedCount > 0) {
          console.log(`[SellerMap] AVM enriched ${enrichedCount}/${avmBatch.length} properties`);
          scored = scored
            .map((s) => {
              const parcel = parcelMap.get(s.id);
              if (!parcel) return s;
              const rescored = scoreParcel(parcel);
              return rescored || s;
            })
            .sort((a, b) => b.score - a.score);
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

    // ── Cache the full scored results ──
    searchCacheSet(
      cacheKey,
      { properties: scored, total: scored.length, marketData },
      {
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        radius,
        zip: zip || undefined,
      },
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
    return NextResponse.json({ error: error.message || "Failed to fetch seller map data" }, { status: 500 });
  }
}
