import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";
import { generateCMA } from "@/lib/mls/cma-engine";

/**
 * POST /api/mls/cma
 *
 * Feature 3: On-Demand CMA (Comparative Market Analysis)
 *
 * Generates a CMA report by pulling comps from the MLS
 * for a given postal code / property criteria.
 *
 * Body: {
 *   postalCode: string (required)
 *   city?: string
 *   address?: string
 *   listPrice?: number
 *   beds?: number
 *   baths?: number
 *   sqft?: number
 *   yearBuilt?: number
 *   propertyType?: string
 *   save?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { postalCode, city, address, listPrice, beds, baths, sqft, yearBuilt, propertyType, save } = body;

    if (!postalCode?.trim()) {
      return NextResponse.json({ error: "Postal code is required" }, { status: 400 });
    }

    const client = await getTrestleClient(supabase, user.id);
    if (!client) {
      return NextResponse.json({ error: "Trestle MLS not connected" }, { status: 400 });
    }

    const report = await generateCMA(client, {
      postalCode: postalCode.trim(),
      city: city?.trim(),
      subjectAddress: address?.trim(),
      subjectListPrice: listPrice ? Number(listPrice) : undefined,
      subjectBeds: beds ? Number(beds) : undefined,
      subjectBaths: baths ? Number(baths) : undefined,
      subjectSqft: sqft ? Number(sqft) : undefined,
      subjectYearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
      subjectPropertyType: propertyType,
    });

    // Optionally save to database
    let savedId: string | null = null;
    if (save) {
      const { data: saved } = await supabase
        .from("cma_reports")
        .insert({
          agent_id: user.id,
          subject_address: report.subjectAddress,
          subject_city: report.subjectCity,
          subject_postal_code: report.subjectPostalCode,
          subject_listing_key: null,
          subject_list_price: report.subjectListPrice,
          subject_beds: report.subjectBeds,
          subject_baths: report.subjectBaths,
          subject_sqft: report.subjectSqft,
          subject_year_built: report.subjectYearBuilt,
          subject_property_type: report.subjectPropertyType,
          comps: report.comps,
          stats: report.stats,
        })
        .select("id")
        .single();

      savedId = saved?.id || null;
    }

    return NextResponse.json({
      success: true,
      report,
      savedId,
    });
  } catch (error) {
    console.error("Error generating CMA:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CMA generation failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mls/cma - List saved CMA reports
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: reports } = await supabase
      .from("cma_reports")
      .select("id, subject_address, subject_city, subject_postal_code, subject_list_price, stats, created_at")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ reports: reports || [] });
  } catch (error) {
    console.error("Error listing CMA reports:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list reports" },
      { status: 500 }
    );
  }
}
