import { createHash } from "crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "fs";
import { join } from "path";

// ── ATTOM Data Update Schedule ─────────────────────────────────────────────
// Daily:   assessor, recorder, preforeclosure
// Weekly:  building permits
// Monthly: AVM, equity
//
// Cache TTLs are aligned to these frequencies so data stays fresh without
// burning API calls on data that hasn't changed yet.

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

/** TTL per endpoint category (in ms). Aligned to ATTOM's data update cadence. */
function getEndpointTtl(endpoint: string): number {
  // Override: env var sets a floor/ceiling for all endpoints (in hours)
  const envHours = parseInt(process.env.ATTOM_CACHE_TTL_HOURS || "", 10);
  if (Number.isFinite(envHours) && envHours > 0) return envHours * HOUR;

  const ep = endpoint.toLowerCase();

  // Monthly updates — cache 30 days
  if (ep.includes("avm") || ep === "rentalavm" || ep === "homeequity") return 30 * DAY;

  // Weekly updates — cache 7 days
  if (ep === "buildingpermits") return 7 * DAY;

  // Area/static data — rarely changes, cache 30 days
  if (["neighborhood", "poi", "salestrend", "transactionsalestrend",
       "community", "school", "schooldistrict", "schoolprofile",
       "hazardrisk", "climaterisk", "riskprofile",
       "parcelboundary", "schoolboundary", "neighborhoodboundary",
       "ibuyer", "marketanalytics"].includes(ep)) return 30 * DAY;

  // Daily updates (assessor/recorder/preforeclosure) — cache 24 hours
  if (["assessment", "assessmentdetail", "assessmenthistory",
       "recorder", "preforeclosure"].includes(ep)) return 1 * DAY;

  // Property detail endpoints — owner/mortgage data updated daily
  // but 24h is safe since changes are rare for a specific property
  if (ep.includes("detail") || ep.includes("expanded") || ep.includes("snapshot")
      || ep === "basicprofile" || ep === "sale" || ep === "salesnapshot"
      || ep === "saleshistory" || ep === "saleshistoryexpanded"
      || ep === "detailowner" || ep === "detailmortgageowner"
      || ep === "detailmortgage" || ep === "detailwithschools") return 1 * DAY;

  // Default: 24 hours
  return 1 * DAY;
}

const MAX_CACHE_SIZE = 1000;
const DISK_CACHE_DIR = join(process.cwd(), "src/lib/integrations/attom-mock-data");

// ── Cache Key ──────────────────────────────────────────────────────────────

export function buildCacheKey(endpoint: string, params: Record<string, any>): string {
  const sorted = Object.keys(params)
    .filter((k) => k !== "endpoint" && params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return `${endpoint}:${sorted}`;
}

function hashKey(key: string): string {
  return createHash("md5").update(key).digest("hex");
}

// ── In-Memory Cache ────────────────────────────────────────────────────────

interface CacheEntry {
  data: any;
  expiresAt: number;
  lastAccessed: number;
}

const cache = new Map<string, CacheEntry>();

export function cacheGet(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  entry.lastAccessed = Date.now();
  return entry.data;
}

export function cacheSet(key: string, data: any, endpoint: string): void {
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
    expiresAt: Date.now() + getEndpointTtl(endpoint),
    lastAccessed: Date.now(),
  });
}

export function cacheClear(): void {
  cache.clear();
}

export function cacheStats(): { size: number; maxSize: number } {
  return { size: cache.size, maxSize: MAX_CACHE_SIZE };
}

// ── Disk Cache ─────────────────────────────────────────────────────────────
// Always-on. Saves ATTOM responses to disk so they survive server restarts
// and are shared across all users. Files are checked against endpoint-specific
// TTLs so stale data gets refreshed automatically.
//
// Disable with ATTOM_DISK_CACHE=false if needed (e.g., in CI).

function isDiskCacheEnabled(): boolean {
  const val = (process.env.ATTOM_DISK_CACHE || "").toLowerCase();
  return val !== "false" && val !== "0";
}

function diskFilePath(key: string, endpoint: string): string {
  const safe = endpoint.replace(/[^a-zA-Z0-9]/g, "_");
  return join(DISK_CACHE_DIR, `${safe}_${hashKey(key)}.json`);
}

function ensureDiskDir(): void {
  if (!existsSync(DISK_CACHE_DIR)) {
    mkdirSync(DISK_CACHE_DIR, { recursive: true });
  }
}

/**
 * Read from disk cache. Returns null if:
 * - Disk cache is disabled
 * - File doesn't exist
 * - File is older than the endpoint's TTL
 */
export function diskRead(key: string, endpoint: string): any | null {
  if (!isDiskCacheEnabled()) return null;
  const filePath = diskFilePath(key, endpoint);
  try {
    const stats = statSync(filePath);
    const ageMs = Date.now() - stats.mtimeMs;
    const ttl = getEndpointTtl(endpoint);
    if (ageMs > ttl) {
      console.log(`[ATTOM Cache] DISK STALE: ${endpoint} (age ${Math.round(ageMs / HOUR)}h > TTL ${Math.round(ttl / HOUR)}h)`);
      return null;
    }
    const raw = readFileSync(filePath, "utf-8");
    console.log(`[ATTOM Cache] DISK HIT: ${endpoint} (age ${Math.round(ageMs / HOUR)}h, TTL ${Math.round(ttl / HOUR)}h)`);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Save response to disk. Always-on unless ATTOM_DISK_CACHE=false. */
export function diskWrite(key: string, endpoint: string, data: any): void {
  if (!isDiskCacheEnabled()) return;
  try {
    ensureDiskDir();
    const filePath = diskFilePath(key, endpoint);
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`[ATTOM Cache] SAVED: ${endpoint} → ${filePath}`);
  } catch (err) {
    console.error(`[ATTOM Cache] Failed to save:`, err);
  }
}
