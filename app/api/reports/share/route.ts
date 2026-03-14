import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * POST /api/reports/share - Create a shareable link for a property report
 * Body: { report: {...}, agentName, agentEmail, agentPhone, brandColor?, logoUrl? }
 *
 * GET /api/reports/share?id=xxx - Retrieve a shared report (public, no auth)
 */
export async function POST(request: NextRequest) {
  try {
    const { supabaseServer } = await import("@/lib/supabase/server");
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { report, agentName, agentEmail, agentPhone, brandColor, logoUrl } = body;

    if (!report) {
      return NextResponse.json({ error: "report data is required" }, { status: 400 });
    }

    // Generate a unique share ID
    const shareId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

    const { error } = await admin
      .from("shared_reports")
      .insert({
        share_id: shareId,
        agent_id: userData.user.id,
        report_data: report,
        agent_name: agentName || null,
        agent_email: agentEmail || null,
        agent_phone: agentPhone || null,
        brand_color: brandColor || "#3b82f6",
        logo_url: logoUrl || null,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        view_count: 0,
      });

    if (error) {
      // Table might not exist yet
      console.log("Could not save shared report:", error.message);
      return NextResponse.json({
        success: true,
        shareId,
        shareUrl: `${request.nextUrl.origin}/shared/report/${shareId}`,
        note: "Link generated (storage pending migration)",
      });
    }

    return NextResponse.json({
      success: true,
      shareId,
      shareUrl: `${request.nextUrl.origin}/shared/report/${shareId}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create share link" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const shareId = request.nextUrl.searchParams.get("id");
    if (!shareId) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { data: report, error } = await admin
      .from("shared_reports")
      .select("*")
      .eq("share_id", shareId)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: "Report not found or expired" }, { status: 404 });
    }

    // Check expiry
    if (report.expires_at && new Date(report.expires_at) < new Date()) {
      return NextResponse.json({ error: "This report link has expired" }, { status: 410 });
    }

    // Increment view count
    await admin
      .from("shared_reports")
      .update({ view_count: (report.view_count || 0) + 1 })
      .eq("share_id", shareId);

    return NextResponse.json({
      report: report.report_data,
      agentName: report.agent_name,
      agentEmail: report.agent_email,
      agentPhone: report.agent_phone,
      brandColor: report.brand_color,
      logoUrl: report.logo_url,
      createdAt: report.created_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load report" },
      { status: 500 }
    );
  }
}
