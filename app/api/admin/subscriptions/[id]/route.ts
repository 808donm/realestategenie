import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// PATCH update user subscription
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;
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
  const { plan_id, status, billing_cycle } = body;

  // Validate required fields
  if (!plan_id || !status || !billing_cycle) {
    return NextResponse.json(
      { error: "Missing required fields: plan_id, status, billing_cycle" },
      { status: 400 }
    );
  }

  // Get the plan details to set the pricing
  const { data: plan } = await supabaseAdmin
    .from("subscription_plans")
    .select("*")
    .eq("id", plan_id)
    .single();

  if (!plan) {
    return NextResponse.json({ error: "Invalid plan_id" }, { status: 400 });
  }

  // Calculate pricing based on billing cycle
  const monthly_price = billing_cycle === "annual" && plan.annual_price
    ? plan.annual_price / 12
    : plan.monthly_price;

  try {
    // Check if subscription exists
    const { data: existingSubscription } = await supabaseAdmin
      .from("agent_subscriptions")
      .select("id")
      .eq("agent_id", agentId)
      .single();

    let subscription;

    if (existingSubscription) {
      // Update existing subscription
      const { data, error } = await supabaseAdmin
        .from("agent_subscriptions")
        .update({
          subscription_plan_id: plan_id,
          status,
          billing_cycle,
          monthly_price,
          updated_at: new Date().toISOString(),
        })
        .eq("agent_id", agentId)
        .select()
        .single();

      if (error) throw error;
      subscription = data;
    } else {
      // Create new subscription
      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const { data, error } = await supabaseAdmin
        .from("agent_subscriptions")
        .insert({
          agent_id: agentId,
          subscription_plan_id: plan_id,
          status,
          billing_cycle,
          monthly_price,
          current_period_start: now.toISOString(),
          current_period_end: nextMonth.toISOString(),
          next_billing_date: nextMonth.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      subscription = data;
    }

    return NextResponse.json({
      subscription,
      message: "Subscription updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update subscription" },
      { status: 500 }
    );
  }
}
