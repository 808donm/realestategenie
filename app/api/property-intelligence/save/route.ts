import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { PropertyReportData } from "@/lib/documents/property-intelligence-report";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

/**
 * POST /api/property-intelligence/save
 *
 * Saves a Property Intelligence Report to Supabase so it can be shared via
 * public link.  Returns the report ID for constructing `/report/{id}`.
 *
 * Body: { property: PropertyReportData }
 * Returns: { id: string, shareUrl: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const property: PropertyReportData = body.property;

    if (!property || !property.address) {
      return NextResponse.json({ error: "property.address is required" }, { status: 400 });
    }

    // Fetch agent branding for the report record
    const { data: agent } = await supabase
      .from("agents")
      .select("display_name, email, phone_e164, license_number, photo_url")
      .eq("id", user.id)
      .single();

    // Save to property_intelligence_reports table
    const { data: report, error } = await admin
      .from("property_intelligence_reports")
      .insert({
        agent_id: user.id,
        address: property.address,
        city: property.city || null,
        state: property.state || null,
        zip: property.zip || null,
        report_data: property,
        agent_branding: {
          displayName: agent?.display_name || agent?.email || "",
          email: agent?.email || "",
          phone: agent?.phone_e164 || null,
          licenseNumber: agent?.license_number || null,
          photoUrl: agent?.photo_url || null,
        },
      })
      .select("id")
      .single();

    if (error) {
      console.error("[property-intelligence/save] DB error:", error.message, error.code);

      // If the table doesn't exist yet, return a graceful error so the client
      // can fall back to the alternate share endpoint
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json(
          { error: "Reports table not available. Please run database migrations." },
          { status: 503 },
        );
      }

      return NextResponse.json({ error: `Failed to save report: ${error.message}` }, { status: 500 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://realestategenie.app";
    return NextResponse.json({
      id: report.id,
      shareUrl: `${origin}/report/${report.id}`,
    });
  } catch (err: any) {
    console.error("[property-intelligence/save] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to save report" }, { status: 500 });
  }
}

/**
 * GET /api/property-intelligence/save?id=<reportId>
 *
 * Public endpoint to fetch saved report data (for the shareable page).
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { data: report, error } = await admin.from("property_intelligence_reports").select("*").eq("id", id).single();

  if (error || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ report });
}
