import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET plan details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await supabaseServer();

  // Check if user is admin
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (agent?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Get plan
  const { data: plan, error } = await supabaseAdmin
    .from("subscription_plans")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json({ plan });
}

// PATCH update plan
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await supabaseServer();

  // Check if user is admin
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (agent?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Parse request body
  const body = await request.json();
  const {
    name,
    slug,
    description,
    monthly_price,
    annual_price,
    tier_level,
    max_agents,
    max_properties,
    max_tenants,
    is_active,
    is_custom,
  } = body;

  // Validate required fields
  if (!name || !slug || monthly_price === undefined || tier_level === undefined) {
    return NextResponse.json(
      { error: "Missing required fields: name, slug, monthly_price, tier_level" },
      { status: 400 }
    );
  }

  // Update plan
  const { data: plan, error } = await supabaseAdmin
    .from("subscription_plans")
    .update({
      name,
      slug,
      description,
      monthly_price: parseFloat(monthly_price),
      annual_price: annual_price ? parseFloat(annual_price) : null,
      tier_level: parseInt(tier_level),
      max_agents: parseInt(max_agents),
      max_properties: parseInt(max_properties),
      max_tenants: parseInt(max_tenants),
      is_active: is_active === true || is_active === "true",
      is_custom: is_custom === true || is_custom === "true",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating plan:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plan, message: "Plan updated successfully" });
}

// DELETE plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await supabaseServer();

  // Check if user is admin
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (agent?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Check if plan has active subscribers
  const { count } = await supabaseAdmin
    .from("agent_subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("subscription_plan_id", id)
    .eq("status", "active");

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete plan with ${count} active subscriber(s)` },
      { status: 400 }
    );
  }

  // Delete plan
  const { error } = await supabaseAdmin
    .from("subscription_plans")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting plan:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Plan deleted successfully" });
}
