import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { RealieClient, createRealieClient } from "@/lib/integrations/realie-client";
import type { RealieParcel } from "@/lib/integrations/realie-client";
import { scoreParcel } from "@/lib/scoring/seller-motivation-score";

/**
 * GET /api/seller-map
 *
 * Fetch properties in a geographic area, score them for seller motivation,
 * and return scored results for the Seller Opportunity Map.
 *
 * Query params:
 *   lat, lng    — center coordinates (required)
 *   radius      — search radius in miles (default 2, max 10)
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
    const radius = Math.min(Number(url.searchParams.get("radius") || 2), 10);
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

    const client = await getRealieClient();
    if (!client) {
      return NextResponse.json(
        { error: "Property data service not configured. Connect Realie API in Integrations." },
        { status: 400 }
      );
    }

    // Fetch properties from Realie
    let parcels: RealieParcel[] = [];

    if (zip) {
      const result = await client.searchByZip({
        zip,
        limit: Math.min(limit, 100),
        page,
      });
      parcels = result.properties;
    } else if (lat && lng) {
      const result = await client.searchByRadius({
        latitude: Number(lat),
        longitude: Number(lng),
        radius,
        limit: Math.min(limit, 100),
        page,
      });
      parcels = result.properties;
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
