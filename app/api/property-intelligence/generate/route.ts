import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  generatePropertyIntelligencePDF,
  type PropertyReportData,
} from "@/lib/documents/property-intelligence-report";
import type { AgentBranding } from "@/lib/documents/neighborhood-profile-generator";

/**
 * POST /api/property-intelligence/generate
 *
 * Accepts pre-gathered property data from the client and generates a branded
 * Property Intelligence Report PDF.  The client already has all the ATTOM /
 * Realie / federal / hazard data loaded in the property-detail-modal, so we
 * avoid redundant API calls by letting it POST the assembled payload.
 *
 * Body: { property: PropertyReportData }
 * Returns: PDF blob (application/pdf)
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
      return NextResponse.json(
        { error: "property.address is required" },
        { status: 400 },
      );
    }

    // Fetch agent branding
    const { data: agent } = await supabase
      .from("agents")
      .select("display_name, email, phone_e164, license_number, photo_url")
      .eq("id", user.id)
      .single();

    const branding: AgentBranding = {
      displayName: agent?.display_name || agent?.email || user.email || "Agent",
      email: agent?.email || user.email || "",
      phone: agent?.phone_e164 || null,
      licenseNumber: agent?.license_number || null,
      photoUrl: agent?.photo_url || null,
      brokerageName: "Real Estate Genie",
    };

    // Ensure generated timestamp
    if (!property.generatedAt) {
      property.generatedAt = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    // Generate PDF
    const pdfBlob = generatePropertyIntelligencePDF(property, branding);

    // Convert Blob to ArrayBuffer for the response
    const arrayBuffer = await pdfBlob.arrayBuffer();

    // Sanitize filename
    const safeAddr = property.address
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 60);
    const filename = `Property_Intelligence_${safeAddr}.pdf`;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("[property-intelligence/generate] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate report" },
      { status: 500 },
    );
  }
}
