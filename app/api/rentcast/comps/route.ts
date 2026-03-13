import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { RentcastClient, createRentcastClient } from "@/lib/integrations/rentcast-client";

/**
 * GET /api/rentcast/comps
 *
 * Fetch comparable properties from RentCast's AVM /avm/value endpoint.
 *
 * Query params:
 *   address   — full property address (required)
 *   compCount — number of comps to return (optional, default 5)
 *   bedrooms, bathrooms, squareFootage, propertyType — optional filters
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
    const address = url.searchParams.get("address");
    if (!address) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
    }

    const compCount = Number(url.searchParams.get("compCount")) || 5;

    const rentcast = await getRentcastClient();
    if (!rentcast) {
      return NextResponse.json({ error: "RentCast not configured" }, { status: 503 });
    }

    const avmParams: Record<string, any> = {
      address,
      compCount: Math.min(Math.max(compCount, 5), 25),
    };

    // Pass optional property attributes for better comp matching
    const bedrooms = url.searchParams.get("bedrooms");
    const bathrooms = url.searchParams.get("bathrooms");
    const squareFootage = url.searchParams.get("squareFootage");
    const propertyType = url.searchParams.get("propertyType");

    if (bedrooms) avmParams.bedrooms = Number(bedrooms);
    if (bathrooms) avmParams.bathrooms = Number(bathrooms);
    if (squareFootage) avmParams.squareFootage = Number(squareFootage);
    if (propertyType) avmParams.propertyType = propertyType;

    const valueEstimate = await rentcast.getValueEstimate(avmParams);

    return NextResponse.json({
      price: valueEstimate.price,
      priceRangeLow: valueEstimate.priceRangeLow,
      priceRangeHigh: valueEstimate.priceRangeHigh,
      comparables: valueEstimate.comparables || [],
    });
  } catch (error: any) {
    console.error("[RentCast Comps] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch comparables" },
      { status: 500 }
    );
  }
}

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
      if (config.api_key) return new RentcastClient({ apiKey: config.api_key });
    }

    return createRentcastClient();
  } catch {
    return null;
  }
}
