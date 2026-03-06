import { createHash } from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Unified Property Data Cache
 *
 * Provider-agnostic cache layer for Realie.ai property data and free data sources.
 * All property data is cached for 7 days regardless of source. The cache refreshes
 * weekly — if a zip code or property hasn't been queried before, it's fetched fresh
 * and then cached for 7 days.
 *
 * Two layers:
 *   1. In-memory (fastest, within a single serverless invocation)
 *   2. Supabase (persistent, system-wide, survives deploys & cold starts)
 *
 * On Vercel, serverless functions have ephemeral filesystems and no shared memory.
 * Supabase provides the persistent, system-wide cache that survives across all
 * invocations, users, and deploys.
 */

const DAY = 24 * 3600 * 1000;
const CACHE_TTL = 7 * DAY; // 7 days for all property data

const MAX_MEMORY_CACHE_SIZE = 500;

// ── Cache Key ──────────────────────────────────────────────────────────────

export function buildPropertyCacheKey(
  provider: "realie" | "free-data" | "unified",
  endpoint: string,
  params: Record<string, any>
): string {
  const sorted = Object.keys(params)
    .filter((k) => k !== "endpoint" && params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return `${provider}:${endpoint}:${sorted}`;
}

function hashKey(key: string): string {
  return createHash("md5").update(key).digest("hex");
}

// ── In-Memory Cache (Layer 1) ─────────────────────────────────────────────

interface CacheEntry {
  data: any;
  expiresAt: number;
  lastAccessed: number;
  source: "realie" | "free-data" | "computed" | "merged";
}

const cache = new Map<string, CacheEntry>();

export function propertyCacheGet(key: string): { data: any; source: string } | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  entry.lastAccessed = Date.now();
  return { data: entry.data, source: entry.source };
}

export function propertyCacheSet(
  key: string,
  data: any,
  source: "realie" | "free-data" | "computed" | "merged"
): void {
  if (cache.size >= MAX_MEMORY_CACHE_SIZE) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, v] of cache) {
      if (v.lastAccessed < oldestTime) {
        oldestTime = v.lastAccessed;
        oldestKey = k;
      }
    }
    if (oldestKey) cache.delete(oldestKey);
  }

  cache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL,
    lastAccessed: Date.now(),
    source,
  });
}

export function propertyCacheClear(): void {
  cache.clear();
}

export function propertyCacheStats(): {
  size: number;
  maxSize: number;
  ttlDays: number;
} {
  return { size: cache.size, maxSize: MAX_MEMORY_CACHE_SIZE, ttlDays: 7 };
}

// ── Supabase Persistent Cache (Layer 2) ───────────────────────────────────
// Uses the `property_data_cache` table in Supabase for system-wide persistence.
// Table schema:
//   cache_key  TEXT PRIMARY KEY
//   data       JSONB NOT NULL
//   source     TEXT NOT NULL
//   created_at TIMESTAMPTZ DEFAULT now()
//   expires_at TIMESTAMPTZ NOT NULL

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key, { auth: { persistSession: false } });
  return _supabase;
}

/**
 * Read from the Supabase persistent cache.
 * Returns null on miss or expiry. Automatically deletes expired rows.
 */
export async function propertyDbRead(
  key: string,
  _provider: string
): Promise<{ data: any; source: string } | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const hash = hashKey(key);

  try {
    const { data: row, error } = await sb
      .from("property_data_cache")
      .select("data, source, expires_at")
      .eq("cache_key", hash)
      .single();

    if (error || !row) return null;

    // Check expiry
    const expiresAt = new Date(row.expires_at).getTime();
    if (Date.now() > expiresAt) {
      // Async cleanup — don't await
      sb.from("property_data_cache").delete().eq("cache_key", hash).then(() => {});
      console.log(`[PropertyCache] DB EXPIRED: ${_provider} key=${hash.slice(0, 8)}…`);
      return null;
    }

    const ageMs = Date.now() - (expiresAt - CACHE_TTL);
    const ageDays = Math.round((ageMs / DAY) * 10) / 10;
    console.log(`[PropertyCache] DB HIT: ${_provider} (age ${ageDays}d, TTL 7d)`);
    return { data: row.data, source: row.source };
  } catch (err) {
    console.error(`[PropertyCache] DB read error:`, err);
    return null;
  }
}

/**
 * Write to the Supabase persistent cache.
 * Uses upsert to handle both inserts and updates.
 */
export async function propertyDbWrite(
  key: string,
  _provider: string,
  data: any,
  source: "realie" | "free-data" | "computed" | "merged"
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const hash = hashKey(key);
  const expiresAt = new Date(Date.now() + CACHE_TTL).toISOString();

  try {
    const { error } = await sb
      .from("property_data_cache")
      .upsert(
        {
          cache_key: hash,
          data,
          source,
          expires_at: expiresAt,
          raw_key: key.length <= 500 ? key : key.slice(0, 500), // For debugging
        },
        { onConflict: "cache_key" }
      );

    if (error) {
      console.error(`[PropertyCache] DB write error:`, error.message);
    } else {
      console.log(`[PropertyCache] DB SAVED: ${_provider} key=${hash.slice(0, 8)}…`);
    }
  } catch (err) {
    console.error(`[PropertyCache] DB write error:`, err);
  }
}

/**
 * Purge all expired entries from Supabase cache.
 */
export async function propertyDbPurgeExpired(): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;

  try {
    const { data, error } = await sb
      .from("property_data_cache")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("cache_key");

    if (error) {
      console.error(`[PropertyCache] DB purge error:`, error.message);
      return 0;
    }

    const purged = data?.length ?? 0;
    if (purged > 0) {
      console.log(`[PropertyCache] Purged ${purged} expired entries from DB cache`);
    }
    return purged;
  } catch (err) {
    console.error(`[PropertyCache] DB purge error:`, err);
    return 0;
  }
}

// ── Legacy disk cache stubs (no-ops on Vercel) ───────────────────────────
// Kept for backward compatibility — callers that still reference these won't break.

export function propertyDiskRead(_key: string, _provider: string): { data: any; source: string } | null {
  return null; // Disk cache disabled — use propertyDbRead instead
}

export function propertyDiskWrite(
  _key: string,
  _provider: string,
  _data: any,
  _source: "realie" | "free-data" | "computed" | "merged"
): void {
  // No-op — use propertyDbWrite instead
}

export function propertyDiskPurgeExpired(): number {
  return 0; // No-op — use propertyDbPurgeExpired instead
}

/**
 * Deep merge two property objects. Values from `base` are kept unless
 * `supplement` has a non-null/undefined value for the same path.
 * This lets Realie data take priority while free sources fill gaps.
 */
export function mergePropertyData(base: any, supplement: any): any {
  if (!supplement) return base;
  if (!base) return supplement;

  const result = { ...base };

  for (const key of Object.keys(supplement)) {
    if (key === "_source") continue; // Don't overwrite source marker

    const baseVal = result[key];
    const suppVal = supplement[key];

    if (suppVal === undefined || suppVal === null) continue;

    if (baseVal === undefined || baseVal === null) {
      // Base is missing this field — take from supplement
      result[key] = suppVal;
    } else if (
      typeof baseVal === "object" && !Array.isArray(baseVal) &&
      typeof suppVal === "object" && !Array.isArray(suppVal)
    ) {
      // Both are objects — recurse
      result[key] = mergePropertyData(baseVal, suppVal);
    }
    // If base already has a value, keep it (Realie-first priority)
  }

  return result;
}
