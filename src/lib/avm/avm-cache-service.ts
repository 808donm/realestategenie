/**
 * AVM Cache Service
 *
 * Unified cache operations for the 4 AVM caching strategies:
 *   1. Sale outcome tracking -- record AVM prediction vs actual sale price
 *   2. Historical comp cache -- cache closed sales for richer comp pool
 *   3. List-to-sale ratio -- calibrate list price weight by area
 *   4. Genie AVM result cache -- reuses existing property_data_cache
 */

import { createHash } from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key, { auth: { persistSession: false } });
  return _supabase;
}

function normalizeAddress(address: string): string {
  return address.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
}

function hashAddress(address: string): string {
  return createHash("md5").update(normalizeAddress(address)).digest("hex");
}

// ── Strategy 1: Sale Outcome Tracking ────────────────────────────────────

export interface SaleOutcomeParams {
  address: string;
  genieAvm: number;
  genieAvmConfidence?: string;
  listPrice?: number;
  salePrice: number;
  closeDate: string;
  propertyType?: string;
  zipCode: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  subdivision?: string;
}

export async function recordSaleOutcome(params: SaleOutcomeParams): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const errorPct = ((params.genieAvm - params.salePrice) / params.salePrice) * 100;
  const absErrorPct = Math.abs(errorPct);

  try {
    await sb.from("avm_sale_outcomes").upsert(
      {
        address: params.address,
        address_hash: hashAddress(params.address),
        genie_avm: params.genieAvm,
        genie_avm_confidence: params.genieAvmConfidence,
        list_price: params.listPrice,
        sale_price: params.salePrice,
        close_date: params.closeDate,
        error_pct: Math.round(errorPct * 100) / 100,
        abs_error_pct: Math.round(absErrorPct * 100) / 100,
        property_type: params.propertyType,
        zip_code: params.zipCode,
        beds: params.beds,
        baths: params.baths,
        sqft: params.sqft,
        year_built: params.yearBuilt,
        subdivision: params.subdivision,
      },
      { onConflict: "address_hash,close_date" },
    );
  } catch (err) {
    console.warn("[AVM Cache] Failed to record sale outcome:", err);
  }
}

// ── Strategy 2: Historical Comp Cache ────────────────────────────────────

export interface ClosedCompRecord {
  address: string;
  closePrice: number;
  listPrice?: number;
  closeDate: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  lotSize?: number;
  propertyType?: string;
  propertySubType?: string;
  zipCode: string;
  lat?: number;
  lng?: number;
  subdivision?: string;
  ownershipType?: string;
  source: "mls" | "rentcast";
  listingKey?: string;
  daysOnMarket?: number;
  correlation?: number;
}

export async function cacheClosedCompsBatch(comps: ClosedCompRecord[]): Promise<void> {
  const sb = getSupabase();
  if (!sb || comps.length === 0) return;

  const rows = comps
    .filter((c) => c.closePrice > 0 && c.closeDate && c.address)
    .map((c) => ({
      address: c.address,
      address_hash: hashAddress(c.address),
      close_price: c.closePrice,
      list_price: c.listPrice || null,
      close_date: c.closeDate.split("T")[0],
      beds: c.beds || null,
      baths: c.baths || null,
      sqft: c.sqft || null,
      year_built: c.yearBuilt || null,
      lot_size: c.lotSize || null,
      property_type: c.propertyType || null,
      property_sub_type: c.propertySubType || null,
      zip_code: c.zipCode,
      lat: c.lat || null,
      lng: c.lng || null,
      subdivision: c.subdivision || null,
      ownership_type: c.ownershipType || null,
      source: c.source,
      listing_key: c.listingKey || null,
      days_on_market: c.daysOnMarket || null,
      correlation: c.correlation || null,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return;

  try {
    await sb.from("comp_history_cache").upsert(rows, { onConflict: "address_hash" });
  } catch (err) {
    console.warn("[AVM Cache] Failed to cache comps batch:", err);
  }
}

export async function getHistoricalComps(params: {
  zipCode: string;
  propertyType?: string;
  beds?: number;
  minCloseDate?: string;
  listPrice?: number;
  limit?: number;
}): Promise<ClosedCompRecord[]> {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    let query = sb
      .from("comp_history_cache")
      .select("*")
      .eq("zip_code", params.zipCode)
      .order("close_date", { ascending: false })
      .limit(params.limit || 20);

    if (params.propertyType) {
      query = query.eq("property_type", params.propertyType);
    }
    if (params.beds != null) {
      query = query.gte("beds", Math.max(1, params.beds - 1)).lte("beds", params.beds + 1);
    }
    if (params.minCloseDate) {
      query = query.gte("close_date", params.minCloseDate);
    }
    if (params.listPrice && params.listPrice > 0) {
      query = query.gte("close_price", Math.round(params.listPrice * 0.5)).lte("close_price", Math.round(params.listPrice * 1.5));
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row: any) => ({
      address: row.address,
      closePrice: row.close_price,
      listPrice: row.list_price,
      closeDate: row.close_date,
      beds: row.beds,
      baths: row.baths,
      sqft: row.sqft,
      yearBuilt: row.year_built,
      lotSize: row.lot_size,
      propertyType: row.property_type,
      propertySubType: row.property_sub_type,
      zipCode: row.zip_code,
      lat: row.lat,
      lng: row.lng,
      subdivision: row.subdivision,
      ownershipType: row.ownership_type,
      source: row.source,
      listingKey: row.listing_key,
      daysOnMarket: row.days_on_market,
      correlation: row.correlation,
    }));
  } catch (err) {
    console.warn("[AVM Cache] Failed to fetch historical comps:", err);
    return [];
  }
}

// ── Strategy 3: List-to-Sale Ratio ───────────────────────────────────────

export async function getListToSaleRatio(
  zipCode: string,
  subdivision?: string,
  propertyType?: string,
): Promise<{ avg: number; median: number; count: number } | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    // Try subdivision-specific first, fall back to ZIP-level
    const queries = [];
    if (subdivision) {
      queries.push(
        sb
          .from("list_to_sale_ratio_cache")
          .select("avg_ratio, median_ratio, sample_count")
          .eq("zip_code", zipCode)
          .eq("subdivision", subdivision)
          .maybeSingle(),
      );
    }
    queries.push(
      sb
        .from("list_to_sale_ratio_cache")
        .select("avg_ratio, median_ratio, sample_count")
        .eq("zip_code", zipCode)
        .is("subdivision", null)
        .maybeSingle(),
    );

    for (const q of queries) {
      const { data } = await q;
      if (data && data.sample_count >= 5) {
        return {
          avg: Number(data.avg_ratio),
          median: Number(data.median_ratio),
          count: data.sample_count,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function refreshListToSaleRatios(zipCode: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  try {
    // Calculate ratios from comp_history_cache where both list_price and close_price exist
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);

    const { data: comps } = await sb
      .from("comp_history_cache")
      .select("list_price, close_price, subdivision, property_type")
      .eq("zip_code", zipCode)
      .gte("close_date", cutoff.toISOString().split("T")[0])
      .not("list_price", "is", null)
      .gt("list_price", 0)
      .gt("close_price", 0);

    if (!comps || comps.length === 0) return;

    // Compute ZIP-level ratio
    const ratios = comps.map((c: any) => c.close_price / c.list_price);
    ratios.sort((a: number, b: number) => a - b);
    const avgRatio = ratios.reduce((s: number, r: number) => s + r, 0) / ratios.length;
    const medianRatio = ratios[Math.floor(ratios.length / 2)];

    // Delete existing row then insert (unique index uses COALESCE which Supabase JS can't target)
    await sb
      .from("list_to_sale_ratio_cache")
      .delete()
      .eq("zip_code", zipCode)
      .is("subdivision", null)
      .is("property_type", null);

    await sb.from("list_to_sale_ratio_cache").insert({
      zip_code: zipCode,
      subdivision: null,
      property_type: null,
      avg_ratio: Math.round(avgRatio * 10000) / 10000,
      median_ratio: Math.round(medianRatio * 10000) / 10000,
      sample_count: ratios.length,
      period_months: 12,
      last_updated: new Date().toISOString(),
    });

    console.log(`[AVM Cache] Refreshed list-to-sale ratio for ${zipCode}: avg=${avgRatio.toFixed(4)}, n=${ratios.length}`);
  } catch (err) {
    console.warn("[AVM Cache] Failed to refresh ratios:", err);
  }
}
