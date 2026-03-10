import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { RealieClient, createRealieClient } from "@/lib/integrations/realie-client";
import type { RealieParcel } from "@/lib/integrations/realie-client";
import { RentcastClient, createRentcastClient, mapRentcastToRealieParcel } from "@/lib/integrations/rentcast-client";
import { scoreParcel } from "@/lib/scoring/seller-motivation-score";

/**
 * GET /api/seller-map
 *
 * Fetch properties in a geographic area, score them for seller motivation,
 * and return scored results for the Seller Opportunity Map.
 *
 * Uses RentCast for lat/lng radius searches (native geo support), then
 * enriches results with Realie equity/portfolio data for better scoring.
 *
 * Query params:
 *   lat, lng    — center coordinates (required)
 *   radius      — search radius in miles (default 10, max 50)
 *   minScore    — minimum seller motivation score (default 0)
 *   absenteeOnly — filter to absentee owners only
 *   zip         — alternative to lat/lng: search by zip code
 *   limit       — max results (default 100, max 500)
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
    const radius = Math.min(Number(url.searchParams.get("radius") || 10), 50);
    const minScore = Number(url.searchParams.get("minScore") || 0);
    const absenteeOnly = url.searchParams.get("absenteeOnly") === "true";
    const limit = Math.min(Number(url.searchParams.get("limit") || 100), 500);
    const page = Number(url.searchParams.get("page") || 1);

    if (!lat && !lng && !zip) {
      return NextResponse.json(
        { error: "Either lat+lng or zip is required" },
        { status: 400 }
      );
    }

    let parcels: RealieParcel[] = [];

    if (lat && lng) {
      parcels = await fetchByCoords(Number(lat), Number(lng), radius, limit, page);
    } else if (zip) {
      // Zip-code searches use Realie (which supports zip+state search)
      const realie = await getRealieClient();
      if (realie) {
        const result = await realie.searchByZip({
          zip,
          limit: Math.min(limit, 100),
          page,
        });
        parcels = result.properties;
      }
    }

    // Score each property and filter
    const scored = parcels
      .map((p) => scoreParcel(p))
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .filter((s) => s.score >= minScore)
      .filter((s) => !absenteeOnly || s.absentee)
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({
      properties: scored.slice(0, limit),
      total: scored.length,
      center: lat && lng ? { lat: Number(lat), lng: Number(lng) } : undefined,
      radiusMiles: radius,
      page,
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
 * Fetch properties by coordinates.
 * Primary: RentCast (native lat/lng/radius support).
 * Enrichment: Realie equity, LTV, lien, and portfolio fields.
 * Fallback: Realie alone if RentCast is unavailable.
 */
async function fetchByCoords(
  lat: number,
  lng: number,
  radius: number,
  limit: number,
  page: number
): Promise<RealieParcel[]> {
  const rentcast = await getRentcastClient();
  const realie = await getRealieClient();

  // Try RentCast first (native geo search)
  let rentcastParcels: RealieParcel[] = [];
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
      rentcastParcels = results.map(mapRentcastToRealieParcel);
      console.log(`[SellerMap] RentCast returned ${results.length} properties`);
    } catch (err: any) {
      console.error("[SellerMap] RentCast error:", err.message);
    }
  }

  // If RentCast gave us results, enrich with Realie equity/portfolio data
  if (rentcastParcels.length > 0 && realie) {
    try {
      const result = await realie.searchByRadius({
        latitude: lat,
        longitude: lng,
        radius,
        limit: Math.min(limit, 100),
        page,
      });

      if (result.properties.length > 0) {
        console.log(`[SellerMap] Realie enrichment: ${result.properties.length} properties`);
        const realieMap = buildAddressMap(result.properties);
        rentcastParcels = rentcastParcels.map((p) =>
          enrichWithRealieData(p, realieMap)
        );
      }
    } catch (err: any) {
      // Enrichment failure is non-fatal — RentCast data alone still works
      console.warn("[SellerMap] Realie enrichment failed (non-fatal):", err.message);
    }

    return rentcastParcels;
  }

  // Fallback: Realie only (if RentCast is not configured or returned nothing)
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
