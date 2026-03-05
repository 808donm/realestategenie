import { createHash } from "crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";

/**
 * Unified Property Data Cache
 *
 * Provider-agnostic cache layer shared by Realie.ai (primary) and ATTOM (fallback).
 * All property data is cached for 7 days regardless of source. The cache refreshes
 * weekly — if a zip code or property hasn't been queried before, it's fetched fresh
 * and then cached for 7 days.
 *
 * Three layers:
 *   1. In-memory (fastest, lost on restart)
 *   2. Disk (survives restarts, shared across users)
 *   3. API call (Realie first, ATTOM fallback)
 */

const DAY = 24 * 3600 * 1000;
const CACHE_TTL = 7 * DAY; // 7 days for all property data

const MAX_CACHE_SIZE = 2000;
const DISK_CACHE_DIR = join(process.cwd(), "src/lib/integrations/property-data-cache");

// ── Cache Key ──────────────────────────────────────────────────────────────

export function buildPropertyCacheKey(
  provider: "realie" | "attom" | "unified",
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

// ── In-Memory Cache ────────────────────────────────────────────────────────

interface CacheEntry {
  data: any;
  expiresAt: number;
  lastAccessed: number;
  source: "realie" | "attom" | "merged";
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
  source: "realie" | "attom" | "merged"
): void {
  if (cache.size >= MAX_CACHE_SIZE) {
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
  return { size: cache.size, maxSize: MAX_CACHE_SIZE, ttlDays: 7 };
}

// ── Disk Cache ─────────────────────────────────────────────────────────────

function isDiskCacheEnabled(): boolean {
  const val = (process.env.PROPERTY_DISK_CACHE || "").toLowerCase();
  return val !== "false" && val !== "0";
}

function diskFilePath(key: string, provider: string): string {
  const safe = provider.replace(/[^a-zA-Z0-9]/g, "_");
  return join(DISK_CACHE_DIR, `${safe}_${hashKey(key)}.json`);
}

function ensureDiskDir(): void {
  if (!existsSync(DISK_CACHE_DIR)) {
    mkdirSync(DISK_CACHE_DIR, { recursive: true });
  }
}

export function propertyDiskRead(key: string, provider: string): { data: any; source: string } | null {
  if (!isDiskCacheEnabled()) return null;
  const filePath = diskFilePath(key, provider);
  try {
    const stats = statSync(filePath);
    const ageMs = Date.now() - stats.mtimeMs;
    if (ageMs > CACHE_TTL) {
      const ageDays = Math.round(ageMs / DAY * 10) / 10;
      console.log(`[PropertyCache] DISK STALE: ${provider} (age ${ageDays}d > TTL 7d)`);
      return null;
    }
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const ageDays = Math.round(ageMs / DAY * 10) / 10;
    console.log(`[PropertyCache] DISK HIT: ${provider} (age ${ageDays}d, TTL 7d)`);
    return { data: parsed.data || parsed, source: parsed.source || provider };
  } catch {
    return null;
  }
}

export function propertyDiskWrite(
  key: string,
  provider: string,
  data: any,
  source: "realie" | "attom" | "merged"
): void {
  if (!isDiskCacheEnabled()) return;
  try {
    ensureDiskDir();
    const filePath = diskFilePath(key, provider);
    writeFileSync(filePath, JSON.stringify({ data, source, cachedAt: new Date().toISOString() }, null, 2));
    console.log(`[PropertyCache] SAVED: ${provider} → ${filePath}`);
  } catch (err) {
    console.error(`[PropertyCache] Failed to save:`, err);
  }
}

/**
 * Purge all expired entries from disk cache.
 * Call this on a weekly schedule or at startup.
 */
export function propertyDiskPurgeExpired(): number {
  if (!isDiskCacheEnabled()) return 0;
  if (!existsSync(DISK_CACHE_DIR)) return 0;

  let purged = 0;
  try {
    const files = readdirSync(DISK_CACHE_DIR);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const filePath = join(DISK_CACHE_DIR, file);
      try {
        const stats = statSync(filePath);
        if (Date.now() - stats.mtimeMs > CACHE_TTL) {
          unlinkSync(filePath);
          purged++;
        }
      } catch {
        // Skip files we can't stat
      }
    }
    if (purged > 0) {
      console.log(`[PropertyCache] Purged ${purged} expired entries from disk cache`);
    }
  } catch (err) {
    console.error(`[PropertyCache] Error during purge:`, err);
  }
  return purged;
}

/**
 * Deep merge two property objects. Values from `base` are kept unless
 * `supplement` has a non-null/undefined value for the same path.
 * This lets Realie data take priority while ATTOM fills gaps.
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
