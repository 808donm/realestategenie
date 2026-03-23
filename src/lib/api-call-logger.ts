/**
 * API Call Logger — tracks all external API calls for usage reporting
 *
 * Lightweight, non-blocking. Writes to api_call_log table asynchronously.
 * Used by RentCast, Realie, Trestle, GHL, and AI clients.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";

interface ApiCallEntry {
  provider: string;    // 'rentcast' | 'realie' | 'trestle' | 'ghl' | 'federal' | 'openai'
  endpoint: string;    // URL path (e.g., '/properties', '/Property')
  method?: string;     // HTTP method
  statusCode?: number;
  responseTimeMs?: number;
  cacheHit?: boolean;
  agentId?: string;
  source?: string;     // 'seller-map', 'property-data', 'dom-prospecting', 'cron', etc.
}

// In-memory buffer for batching writes
let buffer: ApiCallEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 5000; // 5 seconds
const FLUSH_SIZE = 20;

/**
 * Log an external API call. Non-blocking — writes are batched and flushed periodically.
 */
export function logApiCall(entry: ApiCallEntry): void {
  buffer.push(entry);

  // Flush if buffer is full
  if (buffer.length >= FLUSH_SIZE) {
    flushBuffer();
  }

  // Set timer for periodic flush
  if (!flushTimer) {
    flushTimer = setTimeout(flushBuffer, FLUSH_INTERVAL);
  }
}

/**
 * Flush buffered entries to database
 */
async function flushBuffer(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (buffer.length === 0) return;

  const entries = [...buffer];
  buffer = [];

  try {
    const rows = entries.map(e => ({
      provider: e.provider,
      endpoint: e.endpoint,
      method: e.method || "GET",
      status_code: e.statusCode,
      response_time_ms: e.responseTimeMs,
      cache_hit: e.cacheHit || false,
      agent_id: e.agentId || null,
      source: e.source || null,
    }));

    await supabaseAdmin.from("api_call_log").insert(rows);
  } catch (err) {
    // Silent fail — don't break the app for logging
    console.warn("[ApiCallLogger] Failed to flush:", (err as Error).message);
  }
}

/**
 * Helper to extract endpoint path from a full URL
 */
export function extractEndpoint(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname;
  } catch {
    return url;
  }
}

/**
 * Helper to time an API call and log it
 */
export async function withApiCallLogging<T>(
  provider: string,
  endpoint: string,
  fn: () => Promise<T>,
  opts?: { method?: string; agentId?: string; source?: string }
): Promise<T> {
  const start = Date.now();
  let statusCode: number | undefined;

  try {
    const result = await fn();
    statusCode = 200;
    return result;
  } catch (err: any) {
    statusCode = err.status || 500;
    throw err;
  } finally {
    logApiCall({
      provider,
      endpoint,
      method: opts?.method || "GET",
      statusCode,
      responseTimeMs: Date.now() - start,
      agentId: opts?.agentId,
      source: opts?.source,
    });
  }
}
