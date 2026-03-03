import { createHash } from "crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

// ── Configuration ──────────────────────────────────────────────────────────
// ATTOM_CACHE_TTL_HOURS: how long to keep responses in memory (default 168 = 7 days)
// ATTOM_MOCK_MODE: "off" (default) | "auto" (read from disk first, call API only on miss, save result)

const DEFAULT_TTL_HOURS = 168; // 7 days — optimized for trial accounts
const MAX_CACHE_SIZE = 500;
const MOCK_DATA_DIR = join(process.cwd(), "src/lib/integrations/attom-mock-data");

function getTtlMs(): number {
  const hours = parseInt(process.env.ATTOM_CACHE_TTL_HOURS || "", 10);
  return (Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_TTL_HOURS) * 3600 * 1000;
}

function isMockEnabled(): boolean {
  const mode = (process.env.ATTOM_MOCK_MODE || "off").toLowerCase();
  return mode === "auto" || mode === "true" || mode === "1";
}

// ── Cache Key ──────────────────────────────────────────────────────────────

export function buildCacheKey(endpoint: string, params: Record<string, any>): string {
  // Sort params for deterministic keys
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

export function cacheSet(key: string, data: any): void {
  // Evict LRU entries if at capacity
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
    expiresAt: Date.now() + getTtlMs(),
    lastAccessed: Date.now(),
  });
}

export function cacheClear(): void {
  cache.clear();
}

export function cacheStats(): { size: number; maxSize: number; ttlHours: number } {
  return { size: cache.size, maxSize: MAX_CACHE_SIZE, ttlHours: getTtlMs() / 3600000 };
}

// ── Disk Cache (auto mode) ─────────────────────────────────────────────────
// When ATTOM_MOCK_MODE=auto, responses are automatically saved to disk and
// loaded from disk on subsequent requests. No mode switching needed — just
// set it once and forget. First request hits the real API and saves the
// response; every subsequent identical request reads from disk instantly.

function mockFilePath(key: string, endpoint: string): string {
  const safe = endpoint.replace(/[^a-zA-Z0-9]/g, "_");
  return join(MOCK_DATA_DIR, `${safe}_${hashKey(key)}.json`);
}

function ensureMockDir(): void {
  if (!existsSync(MOCK_DATA_DIR)) {
    mkdirSync(MOCK_DATA_DIR, { recursive: true });
  }
}

/** Try to load a saved response from disk. Returns null if not found or mock mode is off. */
export function diskRead(key: string, endpoint: string): any | null {
  if (!isMockEnabled()) return null;
  const filePath = mockFilePath(key, endpoint);
  try {
    const raw = readFileSync(filePath, "utf-8");
    console.log(`[ATTOM Cache] DISK HIT: ${endpoint} (${hashKey(key).slice(0, 8)})`);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Save a response to disk for future use. No-op if mock mode is off. */
export function diskWrite(key: string, endpoint: string, data: any): void {
  if (!isMockEnabled()) return;
  try {
    ensureMockDir();
    const filePath = mockFilePath(key, endpoint);
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`[ATTOM Cache] SAVED: ${endpoint} → ${filePath}`);
  } catch (err) {
    console.error(`[ATTOM Cache] Failed to save:`, err);
  }
}
