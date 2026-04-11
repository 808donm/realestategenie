import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Admin Market Reports CRUD
 * Manages market_report_configs and agent MLS ID assignments
 */

async function checkAdmin() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return agent?.is_admin ? user : null;
}

export async function GET() {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("market_report_configs")
    .select("*")
    .order("mls_id")
    .order("display_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ configs: data });
}

export async function POST(request: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { mls_id, mls_name, state, report_slug, report_title, report_description, report_category, display_order } = body;

  if (!mls_id || !report_slug || !report_title) {
    return NextResponse.json({ error: "mls_id, report_slug, and report_title are required" }, { status: 400 });
  }

  const { data: config, error } = await supabaseAdmin
    .from("market_report_configs")
    .insert({
      mls_id,
      mls_name: mls_name || mls_id,
      state: state || "",
      report_slug,
      report_title,
      report_description: report_description || null,
      report_category: report_category || "market_stats",
      display_order: display_order || 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ config });
}

export async function PATCH(request: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Set agent's MLS ID
  if (body.action === "set_agent_mls") {
    const { agentEmail, mls_id } = body;
    if (!agentEmail || !mls_id) return NextResponse.json({ error: "agentEmail and mls_id required" }, { status: 400 });

    // Find agent by email
    const { data: agent } = await supabaseAdmin
      .from("agents")
      .select("id")
      .eq("email", agentEmail)
      .single();

    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    // Update their Trestle integration config with mls_id
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("id, config")
      .eq("agent_id", agent.id)
      .eq("provider", "trestle")
      .maybeSingle();

    if (!integration) {
      return NextResponse.json({ error: "Agent has no MLS connection" }, { status: 404 });
    }

    const config = typeof integration.config === "string" ? JSON.parse(integration.config) : integration.config || {};
    config.mls_id = mls_id;

    const { error } = await supabaseAdmin
      .from("integrations")
      .update({ config })
      .eq("id", integration.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: true, agent_id: agent.id, mls_id });
  }

  // Toggle report active/inactive
  const { id, is_active } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("market_report_configs")
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true });
}

export async function DELETE(request: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("market_report_configs")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
