import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { RealieClient, createRealieClient } from "@/lib/integrations/realie-client";
import { RentcastClient, createRentcastClient } from "@/lib/integrations/rentcast-client";
import type { RentcastProperty } from "@/lib/integrations/rentcast-client";

/**
 * GET /api/seller-map/property-detail
 *
 * Fetch full property detail for a single address, merging RentCast + Realie data.
 * Returns building info, tax assessments, sale history, owner info, and comps.
 *
 * Query params:
 *   address  — full property address (required)
 *   lat, lng — coordinates for comps search
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
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");

    if (!address) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
    }

    const rentcast = await getRentcastClient();
    const realie = await getRealieClient();

    // Fetch property detail from RentCast
    let property: RentcastProperty | null = null;
    if (rentcast) {
      try {
        const results = await rentcast.searchProperties({ address, limit: 1 });
        if (results.length > 0) {
          property = results[0];
        }
      } catch (err: any) {
        console.error("[PropertyDetail] RentCast error:", err.message);
      }
    }

    // Fetch comps from RentCast if we have coordinates
    let comps: any[] = [];
    if (rentcast && lat && lng) {
      try {
        const valueEstimate = await rentcast.getValueEstimate({
          latitude: Number(lat),
          longitude: Number(lng),
          bedrooms: property?.bedrooms,
          bathrooms: property?.bathrooms,
          squareFootage: property?.squareFootage,
          propertyType: property?.propertyType,
          compCount: 10,
        });
        comps = (valueEstimate.comparables || []).map((c) => ({
          id: c.id,
          address: c.formattedAddress,
          lat: c.latitude,
          lng: c.longitude,
          price: c.price,
          beds: c.bedrooms,
          baths: c.bathrooms,
          sqft: c.squareFootage,
          yearBuilt: c.yearBuilt,
          distance: c.distance,
          daysOnMarket: c.daysOnMarket,
          correlation: c.correlation,
          status: c.status,
          listingType: c.listingType,
          listedDate: c.listedDate,
        }));
      } catch (err: any) {
        console.error("[PropertyDetail] Comps error:", err.message);
      }
    }

    // Enrich with Realie data (equity, liens, portfolio)
    let realieEnrichment: Record<string, any> = {};
    if (realie) {
      try {
        // Extract state from address
        const stateMatch = address.match(/,\s*([A-Z]{2})\s*\d{0,5}\s*$/);
        const state = stateMatch?.[1];
        const street = address.replace(/,\s*[^,]+,\s*[A-Z]{2}\s*\d{0,5}\s*$/, "").trim();

        if (state) {
          const result = await realie.searchByAddress({
            address: street,
            state,
            limit: 1,
          });
          if (result.properties.length > 0) {
            const rp = result.properties[0];
            realieEnrichment = {
              equity: rp.equityCurrentEstBal,
              ltv: rp.LTVCurrentEstCombined,
              modelValue: rp.modelValue,
              totalMarketValue: rp.totalMarketValue,
              forecloseCode: rp.forecloseCode,
              totalLienCount: rp.totalLienCount,
              totalLienBalance: rp.totalLienBalance,
              ownerParcelCount: rp.ownerParcelCount,
              ownerResCount: rp.ownerResCount,
              ownerComCount: rp.ownerComCount,
            };
          }
        }
      } catch (err: any) {
        console.warn("[PropertyDetail] Realie enrichment failed:", err.message);
      }
    }

    // Build response
    const detail = {
      // Overview
      address: property?.formattedAddress || address,
      addressLine1: property?.addressLine1,
      city: property?.city,
      state: property?.state,
      zipCode: property?.zipCode,
      county: property?.county,
      lat: property?.latitude || (lat ? Number(lat) : undefined),
      lng: property?.longitude || (lng ? Number(lng) : undefined),
      propertyType: property?.propertyType,
      lastSaleDate: property?.lastSaleDate,
      lastSalePrice: property?.lastSalePrice,
      ownerOccupied: property?.ownerOccupied,

      // Building
      bedrooms: property?.bedrooms,
      bathrooms: property?.bathrooms,
      squareFootage: property?.squareFootage,
      lotSize: property?.lotSize,
      yearBuilt: property?.yearBuilt,
      features: property?.features,
      zoning: property?.zoning,

      // Financial
      taxAssessments: property?.taxAssessments,
      propertyTaxes: property?.propertyTaxes,
      hoa: property?.hoa,
      ...realieEnrichment,

      // Ownership
      owner: property?.owner,
      saleHistory: property?.history,

      // Comps
      comps,
    };

    return NextResponse.json(detail);
  } catch (error: any) {
    console.error("[PropertyDetail] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch property detail" },
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
      if (config.api_key) return new RealieClient({ apiKey: config.api_key });
    }

    return createRealieClient();
  } catch {
    return null;
  }
}
