/**
 * Shared Property Data Service
 *
 * Single source of truth for fetching, merging, and enriching property data
 * from RentCast + Realie. Used by both the prospecting module and the seller map
 * so they produce identical results.
 *
 * Data flow:
 *   1. Fetch from RentCast (primary) — returns RealieParcel[]
 *   2. Fetch from Realie (supplementary) — returns RealieParcel[]
 *   3. Merge by address match — Realie fills gaps RentCast doesn't cover
 *   4. AVM sanity check — compare each source's AVM to assessed value, pick the closer one
 *   5. Optionally enrich single-address lookups with RentCast /avm/value endpoint
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { RentcastClient, createRentcastClient, mapRentcastToRealieParcel } from "./rentcast-client";
import { RealieClient, createRealieClient } from "./realie-client";
import type { RealieParcel } from "./realie-client";

// ── Shared client helpers ─────────────────────────────────────────────────

/**
 * Get a working RentCast client from DB integration config or env var fallback.
 */
export async function getConfiguredRentcastClient(): Promise<RentcastClient | null> {
  try {
    const { data: integration, error: dbError } = await supabaseAdmin
      .from("integrations")
      .select("config")
      .eq("provider", "rentcast")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();

    if (dbError) {
      console.error(`[Rentcast] DB lookup failed:`, dbError.message);
    }

    if (integration?.config) {
      const config = typeof integration.config === "string" ? JSON.parse(integration.config) : integration.config;

      if (config.api_key) {
        return new RentcastClient({ apiKey: config.api_key });
      }
    }

    return createRentcastClient();
  } catch (err: any) {
    console.warn(`[Rentcast] Failed to create client: ${err?.message || err}`);
    return null;
  }
}

/**
 * Get a working Realie client from DB integration config or env var fallback.
 */
export async function getConfiguredRealieClient(): Promise<RealieClient | null> {
  try {
    const { data: integration, error: dbError } = await supabaseAdmin
      .from("integrations")
      .select("config")
      .eq("provider", "realie")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();

    if (dbError) {
      console.error(`[Realie] DB lookup failed:`, dbError.message);
    }

    if (integration?.config) {
      const config = typeof integration.config === "string" ? JSON.parse(integration.config) : integration.config;

      if (config.api_key) {
        return new RealieClient({ apiKey: config.api_key });
      }
    }

    const envKey = process.env.REALIE_API_KEY;
    if (envKey) {
      return new RealieClient({ apiKey: envKey });
    }

    return null;
  } catch (err: any) {
    console.warn(`[Realie] Failed to create client: ${err?.message || err}`);
    return null;
  }
}

// ── Address normalization ─────────────────────────────────────────────────

/**
 * Normalize an address string for fuzzy matching between data sources.
 */
export function normalizeAddress(addr: string): string {
  return addr
    .toLowerCase()
    .replace(/\b(apt|unit|ste|suite|#)\s*\S*/gi, "")
    .replace(/\b0+(\d)/g, "$1")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Build a lookup map from RealieParcel[] keyed by normalized address.
 */
export function buildAddressMap(properties: RealieParcel[]): Map<string, RealieParcel> {
  const map = new Map<string, RealieParcel>();
  for (const p of properties) {
    const addr = p.address || p.addressFull;
    if (addr) {
      map.set(normalizeAddress(addr), p);
    }
  }
  return map;
}

// ── AVM sanity check ──────────────────────────────────────────────────────

/**
 * Pick the best AVM value by comparing candidates to assessed value.
 * Uses log-ratio so 2x overvalued and 0.5x undervalued are penalized equally.
 * Returns the chosen value and metadata about the decision.
 */
function pickBestAvm(
  avmA: number | undefined,
  avmB: number | undefined,
  assessedValue: number | undefined,
  labelA: string,
  labelB: string,
): {
  value: number | undefined;
  low?: number;
  high?: number;
  chosen: string;
  sources?: Record<string, any>;
} | null {
  if (!avmA && !avmB) return null;
  if (avmA && !avmB) return { value: avmA, chosen: labelA };
  if (!avmA && avmB) return { value: avmB, chosen: labelB };

  // Both have values — use assessed value as tiebreaker
  if (assessedValue && assessedValue > 0) {
    const ratioA = avmA! / assessedValue;
    const ratioB = avmB! / assessedValue;
    const devA = Math.abs(Math.log(ratioA));
    const devB = Math.abs(Math.log(ratioB));

    const chosen = devB <= devA ? labelB : labelA;
    console.log(
      `[PropertyData] AVM: chose ${chosen} ($${(chosen === labelA ? avmA! : avmB!).toLocaleString()}) — ` +
        `assessed: $${assessedValue.toLocaleString()}, ` +
        `${labelA} ratio: ${ratioA.toFixed(2)}, ${labelB} ratio: ${ratioB.toFixed(2)}`,
    );
    return {
      value: chosen === labelA ? avmA : avmB,
      chosen,
      sources: {
        [labelA]: avmA,
        [labelB]: avmB,
        assessedValue,
      },
    };
  }

  // No assessed value — can't compare, prefer the one that exists
  // If both exist, prefer the one with a range (indicating a real model)
  return { value: avmA || avmB, chosen: avmA ? labelA : labelB };
}

// ── Single-property merge ─────────────────────────────────────────────────

/**
 * Merge Realie supplementary data into a RentCast-sourced parcel.
 * This is the SINGLE merge function used by both seller map and prospecting.
 *
 * What Realie provides that RentCast doesn't:
 * - AVM model values (modelValue, modelValueMin, modelValueMax)
 * - Equity & LTV (equityCurrentEstBal, LTVCurrentEstCombined)
 * - Mortgage/Liens (totalLienCount, totalLienBalance, lenderName)
 * - Foreclosure status (forecloseCode, forecloseRecordDate, auctionDate)
 * - Owner portfolio (ownerParcelCount, ownerResCount, ownerComCount)
 * - Market values (totalMarketValue with building/land breakdown)
 * - Parcel geometry (geometry)
 * - Assessment history (assessments[])
 */
export function mergeParcelData(parcel: RealieParcel, realieMatch: RealieParcel): RealieParcel {
  const merged = { ...parcel };

  // ── AVM sanity check ──
  // Compare both AVM estimates to the assessed value (county-set, reliable anchor).
  // Pick whichever is closer. This handles cases like RentCast returning $8.5M
  // for a lot assessed at $877K (bad comps) while Realie returns $971K.
  const rcAvm = parcel.modelValue;
  const realieAvm = realieMatch.modelValue;
  const assessedValue =
    parcel.totalAssessedValue ||
    realieMatch.totalAssessedValue ||
    parcel.totalMarketValue ||
    realieMatch.totalMarketValue;

  if (rcAvm || realieAvm) {
    const avmResult = pickBestAvm(rcAvm, realieAvm, assessedValue, "rentcast", "realie");
    if (avmResult) {
      merged.modelValue = avmResult.value;
      // Preserve min/max from the chosen source
      if (avmResult.chosen === "realie") {
        merged.modelValueMin = realieMatch.modelValueMin;
        merged.modelValueMax = realieMatch.modelValueMax;
      }
    }
  }

  // ── Equity & LTV — Realie provides real estimates, RentCast has none ──
  merged.equityCurrentEstBal = parcel.equityCurrentEstBal ?? realieMatch.equityCurrentEstBal;
  merged.equityCurrentEstRange = parcel.equityCurrentEstRange ?? realieMatch.equityCurrentEstRange;
  merged.LTVCurrentEstCombined = parcel.LTVCurrentEstCombined ?? realieMatch.LTVCurrentEstCombined;
  merged.LTVCurrentEstRange = parcel.LTVCurrentEstRange ?? realieMatch.LTVCurrentEstRange;
  merged.LTVPurchase = parcel.LTVPurchase ?? realieMatch.LTVPurchase;

  // ── Mortgage / Liens ──
  merged.totalLienCount = parcel.totalLienCount ?? realieMatch.totalLienCount;
  merged.totalLienBalance = parcel.totalLienBalance ?? realieMatch.totalLienBalance;
  merged.totalFinancingHistCount = parcel.totalFinancingHistCount ?? realieMatch.totalFinancingHistCount;
  merged.lenderName = parcel.lenderName ?? realieMatch.lenderName;

  // ── Foreclosure ──
  merged.forecloseCode = parcel.forecloseCode ?? realieMatch.forecloseCode;
  merged.forecloseRecordDate = parcel.forecloseRecordDate ?? realieMatch.forecloseRecordDate;
  merged.forecloseFileDate = parcel.forecloseFileDate ?? realieMatch.forecloseFileDate;
  merged.forecloseCaseNum = parcel.forecloseCaseNum ?? realieMatch.forecloseCaseNum;
  merged.auctionDate = parcel.auctionDate ?? realieMatch.auctionDate;

  // ── Owner portfolio counts ──
  merged.ownerParcelCount = parcel.ownerParcelCount ?? realieMatch.ownerParcelCount;
  merged.ownerResCount = parcel.ownerResCount ?? realieMatch.ownerResCount;
  merged.ownerComCount = parcel.ownerComCount ?? realieMatch.ownerComCount;

  // ── Market values (county-assessed) ──
  merged.totalMarketValue = parcel.totalMarketValue ?? realieMatch.totalMarketValue;
  merged.totalBuildingValue = parcel.totalBuildingValue ?? realieMatch.totalBuildingValue;
  merged.totalLandValue = parcel.totalLandValue ?? realieMatch.totalLandValue;
  merged.assessedBuildingValue = parcel.assessedBuildingValue ?? realieMatch.assessedBuildingValue;
  merged.assessedLandValue = parcel.assessedLandValue ?? realieMatch.assessedLandValue;

  // ── Assessment history ──
  if (!merged.assessments?.length && realieMatch.assessments?.length) {
    merged.assessments = realieMatch.assessments;
  }

  // ── Parcel geometry ──
  if (!merged.geometry && realieMatch.geometry) {
    merged.geometry = realieMatch.geometry;
  }

  // ── Legal description ──
  merged.legalDesc = parcel.legalDesc ?? realieMatch.legalDesc;
  merged.parcelId = parcel.parcelId ?? realieMatch.parcelId;

  return merged;
}

// ── Bulk merge ────────────────────────────────────────────────────────────

/**
 * Match and merge Realie data into an array of parcels by normalized address.
 * Used by both seller map bulk searches and prospecting searches.
 */
export function bulkMergeRealieData(parcels: RealieParcel[], realieData: RealieParcel[]): RealieParcel[] {
  if (!realieData.length) return parcels;
  if (!parcels.length) return realieData;

  const realieMap = buildAddressMap(realieData);
  let mergedCount = 0;

  const result = parcels.map((parcel) => {
    const addr = parcel.address || parcel.addressFull;
    if (!addr) return parcel;

    const match = realieMap.get(normalizeAddress(addr));
    if (!match) return parcel;

    mergedCount++;
    return mergeParcelData(parcel, match);
  });

  if (mergedCount > 0) {
    console.log(`[PropertyData] Merged Realie data into ${mergedCount}/${parcels.length} parcels`);
  }

  return result;
}

// ── Deduplication ─────────────────────────────────────────────────────────

/**
 * Deduplicate parcels by normalized address.
 */
export function deduplicateParcels(parcels: RealieParcel[]): RealieParcel[] {
  const seen = new Set<string>();
  return parcels.filter((p) => {
    const key = p.address ? normalizeAddress(p.address) : `${p.latitude}-${p.longitude}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── RentCast AVM enrichment ───────────────────────────────────────────────

/**
 * Enrich a parcel with a real AVM from RentCast's /avm/value endpoint.
 * The standard searchProperties endpoint only returns lastSalePrice as an
 * AVM proxy, which can be decades stale. This calls the dedicated AVM endpoint
 * for a proper statistical valuation, then applies the assessed-value sanity check.
 */
export async function enrichWithRentcastAvm(client: RentcastClient, parcel: RealieParcel): Promise<RealieParcel> {
  const address = parcel.addressFull || parcel.address;
  if (!address) return parcel;

  try {
    const avmResult = await client.getValueEstimate({
      address,
      latitude: parcel.latitude,
      longitude: parcel.longitude,
      compCount: 5,
    });

    if (!avmResult?.price) return parcel;

    const newAvmValue = avmResult.price;
    const assessedValue = parcel.totalAssessedValue || parcel.totalMarketValue;
    const existingAvm = parcel.modelValue;

    // Apply the same AVM sanity check
    if (existingAvm && assessedValue && assessedValue > 0) {
      const existingDev = Math.abs(Math.log(existingAvm / assessedValue));
      const newDev = Math.abs(Math.log(newAvmValue / assessedValue));

      if (newDev < existingDev) {
        // RentCast real AVM is closer to assessed — use it
        console.log(
          `[PropertyData] RentCast AVM ($${newAvmValue.toLocaleString()}) closer to assessed ` +
            `($${assessedValue.toLocaleString()}) than existing ($${existingAvm.toLocaleString()})`,
        );
        return { ...parcel, modelValue: newAvmValue };
      }
      // Existing AVM (from Realie) is better — keep it
      return parcel;
    }

    // No existing AVM or no assessed value — use the RentCast AVM
    return { ...parcel, modelValue: newAvmValue };
  } catch (err: any) {
    console.warn(`[PropertyData] RentCast AVM enrichment failed for ${address}: ${err?.message}`);
    return parcel;
  }
}

// ── Full fetch pipeline ───────────────────────────────────────────────────

/**
 * Fetch properties by zip codes from RentCast + Realie, merge, and deduplicate.
 * This is the unified pipeline used by both seller map and prospecting.
 */
export async function fetchAndMergeByZipCodes(
  zipCodes: string[],
  options: {
    limit?: number;
    propertyType?: string;
    realiePropertyType?: string;
  } = {},
): Promise<RealieParcel[]> {
  const rentcast = await getConfiguredRentcastClient();
  const realie = await getConfiguredRealieClient();

  if (!rentcast && !realie) return [];

  const perZipLimitRentcast = 500;
  const perZipLimitRealie = 100;

  // Fetch from both sources in parallel
  const [rentcastParcels, realieParcels] = await Promise.all([
    // RentCast primary fetch
    (async () => {
      if (!rentcast) return [] as RealieParcel[];
      const results = await Promise.allSettled(
        zipCodes.slice(0, 20).map(async (zipCode) => {
          try {
            const props = await rentcast.searchProperties({
              zipCode,
              limit: perZipLimitRentcast,
              ...(options.propertyType ? { propertyType: options.propertyType } : {}),
            });
            if (props.length > 0) {
              console.log(`[PropertyData] RentCast zip ${zipCode}: ${props.length} properties`);
              return props.map(mapRentcastToRealieParcel);
            }
          } catch (err: any) {
            console.warn(`[PropertyData] RentCast zip ${zipCode} failed: ${err.message}`);
          }
          return [] as RealieParcel[];
        }),
      );
      return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    })(),
    // Realie supplementary fetch
    (async () => {
      if (!realie) return [] as RealieParcel[];
      const allRealie: RealieParcel[] = [];
      let remaining = 500;
      for (const zipCode of zipCodes.slice(0, 20)) {
        if (remaining <= 0) break;
        try {
          const result = await realie.searchByZip({
            zip: zipCode,
            limit: Math.min(remaining, perZipLimitRealie),
            ...(options.realiePropertyType ? { property_type: options.realiePropertyType } : {}),
          });
          allRealie.push(...result.properties);
          remaining -= result.properties.length;
        } catch (err: any) {
          console.warn(`[PropertyData] Realie zip ${zipCode} failed (non-fatal): ${err.message}`);
        }
      }
      return allRealie;
    })(),
  ]);

  // Use RentCast as primary, fall back to Realie if RentCast returned nothing
  let parcels = rentcastParcels.length > 0 ? rentcastParcels : realieParcels;

  // Merge Realie enrichment into RentCast parcels
  if (rentcastParcels.length > 0 && realieParcels.length > 0) {
    parcels = bulkMergeRealieData(parcels, realieParcels);
  }

  return deduplicateParcels(parcels);
}

/**
 * Fetch properties by coordinates from RentCast + Realie, merge, and deduplicate.
 */
export async function fetchAndMergeByCoords(
  lat: number,
  lng: number,
  radius: number,
  options: {
    limit?: number;
    page?: number;
    propertyType?: string;
    realiePropertyType?: string;
  } = {},
): Promise<RealieParcel[]> {
  const rentcast = await getConfiguredRentcastClient();
  const realie = await getConfiguredRealieClient();

  if (!rentcast && !realie) return [];

  const limit = options.limit || 500;
  const page = options.page || 1;

  // Fetch from both sources in parallel
  const [rentcastParcels, realieParcels] = await Promise.all([
    // RentCast primary
    (async () => {
      if (!rentcast) return [] as RealieParcel[];
      try {
        const offset = page > 1 ? (page - 1) * Math.min(limit, 500) : 0;
        const results = await rentcast.searchProperties({
          latitude: lat,
          longitude: lng,
          radius,
          limit: Math.min(limit, 500),
          offset,
          ...(options.propertyType ? { propertyType: options.propertyType } : {}),
        });
        console.log(`[PropertyData] RentCast coords: ${results.length} properties`);
        return results.map(mapRentcastToRealieParcel);
      } catch (err: any) {
        console.error("[PropertyData] RentCast coords error:", err.message);
        return [] as RealieParcel[];
      }
    })(),
    // Realie supplementary
    (async () => {
      if (!realie) return [] as RealieParcel[];
      try {
        const result = await realie.searchByRadius({
          latitude: lat,
          longitude: lng,
          radius,
          limit: Math.min(limit, 100),
          page,
          ...(options.realiePropertyType ? { property_type: options.realiePropertyType } : {}),
        });
        console.log(`[PropertyData] Realie coords: ${result.properties.length} properties`);
        return result.properties;
      } catch (err: any) {
        console.warn("[PropertyData] Realie coords failed (non-fatal):", err.message);
        return [] as RealieParcel[];
      }
    })(),
  ]);

  let parcels = rentcastParcels.length > 0 ? rentcastParcels : realieParcels;

  if (rentcastParcels.length > 0 && realieParcels.length > 0) {
    parcels = bulkMergeRealieData(parcels, realieParcels);
  }

  return deduplicateParcels(parcels);
}

/**
 * Fetch a single property by address from both sources and merge.
 * Also calls RentCast's /avm/value for a real valuation.
 */
export async function fetchAndMergeSingleProperty(
  address: string,
  options: {
    lat?: number;
    lng?: number;
    state?: string;
  } = {},
): Promise<RealieParcel | null> {
  const rentcast = await getConfiguredRentcastClient();
  const realie = await getConfiguredRealieClient();

  // Extract state from address if not provided
  const stateMatch = address.match(/,\s*([A-Z]{2})\s*\d{0,5}\s*$/);
  const state = options.state || stateMatch?.[1];
  const street = address.replace(/,\s*[^,]+,\s*[A-Z]{2}\s*\d{0,5}\s*$/, "").trim();

  // Fetch from all sources in parallel
  const [rcProperty, realieProperty, avmResult] = await Promise.all([
    // RentCast property search
    (async () => {
      if (!rentcast) return null;
      try {
        const results = await rentcast.searchProperties({ address, limit: 1 });
        return results.length > 0 ? mapRentcastToRealieParcel(results[0]) : null;
      } catch (err: any) {
        console.warn("[PropertyData] RentCast single-prop error:", err.message);
        return null;
      }
    })(),
    // Realie property search
    (async () => {
      if (!realie || !state) return null;
      try {
        const result = await realie.searchByAddress({ address: street, state, limit: 1 });
        return result.properties.length > 0 ? result.properties[0] : null;
      } catch (err: any) {
        console.warn("[PropertyData] Realie single-prop error:", err.message);
        return null;
      }
    })(),
    // RentCast real AVM
    (async () => {
      if (!rentcast) return null;
      try {
        return await rentcast.getValueEstimate({ address, compCount: 5 });
      } catch (err: any) {
        console.warn("[PropertyData] RentCast AVM error:", err.message);
        return null;
      }
    })(),
  ]);

  if (!rcProperty && !realieProperty) return null;

  // Start with whichever source returned data
  let merged = rcProperty || realieProperty!;

  // Merge Realie enrichment if both sources have data
  if (rcProperty && realieProperty) {
    merged = mergeParcelData(rcProperty, realieProperty);
  }

  // Apply RentCast real AVM (with sanity check against assessed value)
  if (avmResult?.price) {
    merged = await enrichWithRentcastAvm(rentcast!, { ...merged, modelValue: merged.modelValue });

    // If the RentCast AVM won the sanity check OR there was no existing AVM,
    // apply the full AVM data
    const assessedValue = merged.totalAssessedValue || merged.totalMarketValue;
    if (assessedValue && assessedValue > 0 && avmResult.price) {
      const existingDev = merged.modelValue ? Math.abs(Math.log(merged.modelValue / assessedValue)) : Infinity;
      const rcDev = Math.abs(Math.log(avmResult.price / assessedValue));

      if (rcDev < existingDev || !merged.modelValue) {
        merged.modelValue = avmResult.price;
        merged.modelValueMin = avmResult.priceRangeLow;
        merged.modelValueMax = avmResult.priceRangeHigh;
      }
    } else if (!merged.modelValue) {
      merged.modelValue = avmResult.price;
      merged.modelValueMin = avmResult.priceRangeLow;
      merged.modelValueMax = avmResult.priceRangeHigh;
    }
  }

  return merged;
}
