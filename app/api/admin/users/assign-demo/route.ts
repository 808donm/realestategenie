import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();

  // Verify admin
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: adminAgent } = await supabase
    .from("agents")
    .select("is_admin, account_status")
    .eq("id", userData.user.id)
    .single();

  if (!adminAgent?.is_admin || adminAgent.account_status !== "active") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    // Get the target user
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from("agents")
      .select("id, email, display_name, role")
      .eq("id", userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the solo-agent-pro plan for demo realtors
    const { data: plan } = await supabaseAdmin
      .from("subscription_plans")
      .select("id, name, slug")
      .eq("slug", "solo-agent-pro")
      .single();

    if (!plan) {
      return NextResponse.json(
        { error: "Demo plan (solo-agent-pro) not found. Please create it first." },
        { status: 400 }
      );
    }

    // Check if user already has an active subscription
    const { data: existingSub } = await supabaseAdmin
      .from("agent_subscriptions")
      .select("id, status")
      .eq("agent_id", userId)
      .in("status", ["active", "trial"])
      .single();

    if (existingSub) {
      return NextResponse.json(
        { error: "User already has an active subscription" },
        { status: 400 }
      );
    }

    // Activate the user account
    await supabaseAdmin
      .from("agents")
      .update({
        account_status: "active",
        role: targetUser.role || "agent",
      })
      .eq("id", userId);

    // Check if user already has an account
    const { data: existingAccount } = await supabaseAdmin
      .from("accounts")
      .select("id")
      .eq("owner_id", userId)
      .single();

    let accountId = existingAccount?.id;

    if (!accountId) {
      // Create account for the user
      const { data: newAccount, error: accountError } = await supabaseAdmin
        .from("accounts")
        .insert({
          name: `${targetUser.display_name || targetUser.email}'s Account`,
          owner_id: userId,
          subscription_plan_id: plan.id,
          billing_email: targetUser.email,
          is_active: true,
        })
        .select("id")
        .single();

      if (accountError) {
        throw new Error(`Failed to create account: ${accountError.message}`);
      }
      accountId = newAccount.id;

      // Add user as account owner
      await supabaseAdmin.from("account_members").insert({
        account_id: accountId,
        agent_id: userId,
        account_role: "owner",
        is_active: true,
      });
    }

    // Create 30-day demo trial subscription
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error: subError } = await supabaseAdmin
      .from("agent_subscriptions")
      .insert({
        agent_id: userId,
        subscription_plan_id: plan.id,
        status: "trial",
        billing_cycle: "monthly",
        monthly_price: 0,
        current_period_start: now.toISOString(),
        current_period_end: trialEnd.toISOString(),
        trial_end_date: trialEnd.toISOString(),
        account_id: accountId,
      });

    if (subError) {
      throw new Error(`Failed to create subscription: ${subError.message}`);
    }

    return NextResponse.json({
      message: "Demo account assigned successfully",
      trialEnd: trialEnd.toISOString(),
    });
  } catch (error: any) {
    console.error("Assign demo error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign demo account" },
      { status: 500 }
    );
  }
}
