import { createHash } from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Seller Map Search Cache
 *
 * Global, system-wide cache for scored seller-map search results.
 * When any user searches an area, the scored results are cached for 7 days.
 * Subsequent searches by any user in the same area return cached results
 * instantly, avoiding redundant RentCast/Realie API calls.
 *
 * Cache key is built from geographic coordinates (rounded to ~0.5 mi grid)
 * + radius, so nearby searches share cache hits.
 */

const DAY = 24 * 3600 * 1000;
const CACHE_TTL = 7 * DAY;

// Round lat/lng to 3 decimal places (~0.07 miles / ~110 meters)
// This groups nearby searches together for cache hits
function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// Bump this version when the scoring/enrichment pipeline changes to
// invalidate stale cache entries that were scored with the old logic.
const CACHE_VERSION = "v2";

export function buildSearchCacheKey(params: {
  lat?: number;
  lng?: number;
  radius?: number;
  zip?: string;
  propertyType?: string;
}): string {
  const typeSuffix = params.propertyType ? `:t=${params.propertyType}` : "";
  if (params.zip) {
    return `seller-map:${CACHE_VERSION}:zip:${params.zip}${typeSuffix}`;
  }
  const lat = params.lat != null ? roundCoord(params.lat) : 0;
  const lng = params.lng != null ? roundCoord(params.lng) : 0;
  const radius = params.radius ?? 10;
  return `seller-map:${CACHE_VERSION}:geo:${lat},${lng},r${radius}${typeSuffix}`;
}

function hashKey(key: string): string {
  return createHash("md5").update(key).digest("hex");
}

// ── Supabase client ──

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key, { auth: { persistSession: false } });
  return _supabase;
}

// ── Cache interface ──

export interface SearchCacheEntry {
  properties: any[];
  total: number;
  marketData: Record<string, any>;
}

/**
 * Read cached search results. Returns null on miss or expiry.
 */
export async function searchCacheGet(
  key: string
): Promise<SearchCacheEntry | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const hash = hashKey(key);

  try {
    const { data: row, error } = await sb
      .from("seller_map_search_cache")
      .select("properties, total, market_data, expires_at")
      .eq("cache_key", hash)
      .single();

    if (error || !row) return null;

    const expiresAt = new Date(row.expires_at).getTime();
    if (Date.now() > expiresAt) {
      // Async cleanup
      sb.from("seller_map_search_cache").delete().eq("cache_key", hash).then(() => {});
      console.log(`[SearchCache] EXPIRED: key=${hash.slice(0, 8)}…`);
      return null;
    }

    const ageMs = Date.now() - (expiresAt - CACHE_TTL);
    const ageDays = Math.round((ageMs / DAY) * 10) / 10;
    console.log(`[SearchCache] HIT: ${row.total} properties (age ${ageDays}d, TTL 7d)`);

    return {
      properties: row.properties,
      total: row.total,
      marketData: row.market_data || {},
    };
  } catch (err) {
    console.error("[SearchCache] Read error:", err);
    return null;
  }
}

/**
 * Write search results to cache. Shared globally across all users.
 */
export async function searchCacheSet(
  key: string,
  entry: SearchCacheEntry,
  geo?: { lat?: number; lng?: number; radius?: number; zip?: string }
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const hash = hashKey(key);
  const expiresAt = new Date(Date.now() + CACHE_TTL).toISOString();

  try {
    const { error } = await sb
      .from("seller_map_search_cache")
      .upsert(
        {
          cache_key: hash,
          properties: entry.properties,
          total: entry.total,
          market_data: entry.marketData,
          center_lat: geo?.lat,
          center_lng: geo?.lng,
          radius: geo?.radius,
          zip: geo?.zip,
          raw_key: key.length <= 500 ? key : key.slice(0, 500),
          expires_at: expiresAt,
        },
        { onConflict: "cache_key" }
      );

    if (error) {
      console.error("[SearchCache] Write error:", error.message);
    } else {
      console.log(`[SearchCache] SAVED: ${entry.total} properties, key=${hash.slice(0, 8)}…`);
    }
  } catch (err) {
    console.error("[SearchCache] Write error:", err);
  }
}

/**
 * Purge all expired entries.
 */
export async function searchCachePurgeExpired(): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;

  try {
    const { data, error } = await sb
      .from("seller_map_search_cache")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("cache_key");

    if (error) {
      console.error("[SearchCache] Purge error:", error.message);
      return 0;
    }

    const purged = data?.length ?? 0;
    if (purged > 0) {
      console.log(`[SearchCache] Purged ${purged} expired entries`);
    }
    return purged;
  } catch (err) {
    console.error("[SearchCache] Purge error:", err);
    return 0;
  }
}
