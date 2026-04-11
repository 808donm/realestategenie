import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { runEmailBlast, summarizeBlastCriteria } from "@/lib/mls-blast/mls-blast-engine";

/**
 * GET /api/mls-blast/blasts - List agent's email blasts
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: blasts, error } = await supabase
      .from("mls_email_blasts")
      .select("*")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const enriched = (blasts || []).map((b: any) => ({
      ...b,
      criteriaSummary: summarizeBlastCriteria(b.search_criteria),
    }));

    return NextResponse.json({ blasts: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/mls-blast/blasts - Create new email blast
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, searchCriteria, alertTypes, crmContactIds, crmTag, schedule } = body;

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const { data: blast, error } = await supabase
      .from("mls_email_blasts")
      .insert({
        agent_id: user.id,
        name,
        search_criteria: searchCriteria || {},
        alert_types: alertTypes || ["new_listing", "closed", "price_change"],
        crm_contact_ids: crmContactIds || [],
        crm_tag: crmTag || null,
        schedule: schedule || "weekly",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ blast });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/mls-blast/blasts - Update or trigger send
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, action } = body;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    if (action === "send") {
      const result = await runEmailBlast(id);
      return NextResponse.json({ result });
    }

    if (action === "toggle") {
      const { data: existing } = await supabase.from("mls_email_blasts").select("is_active").eq("id", id).single();
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await supabase.from("mls_email_blasts").update({ is_active: !existing.is_active, updated_at: new Date().toISOString() }).eq("id", id);
      return NextResponse.json({ toggled: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/mls-blast/blasts?id=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await supabase.from("mls_email_blasts").delete().eq("id", id).eq("agent_id", user.id);
    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
