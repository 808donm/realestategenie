import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const DEMO_ACCOUNTS: Record<
  string,
  { email: string; password: string; displayName: string; role: string; planSlug: string }
> = {
  brokerage: {
    email: "demo-broker@realestategenie.com",
    password: "demo-broker-2026!",
    displayName: "Demo Broker",
    role: "broker",
    planSlug: "brokerage-growth",
  },
  realtor: {
    email: "demo-realtor@realestategenie.com",
    password: "demo-realtor-2026!",
    displayName: "Demo Realtor",
    role: "agent",
    planSlug: "solo-agent-pro",
  },
};

export async function POST(request: NextRequest) {
  try {
    const { accountType } = await request.json();

    const demo = DEMO_ACCOUNTS[accountType];
    if (!demo) {
      return NextResponse.json({ error: "Invalid demo account type" }, { status: 400 });
    }

    // Try to sign in with the existing demo account first
    const { data: signInData, error: signInError } = await admin.auth.signInWithPassword({
      email: demo.email,
      password: demo.password,
    });

    if (signInData?.session) {
      return NextResponse.json({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      });
    }

    // If sign-in failed, create the demo user
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: demo.email,
      password: demo.password,
      email_confirm: true,
      user_metadata: { display_name: demo.displayName },
    });

    if (createError || !newUser.user) {
      return NextResponse.json({ error: "Failed to create demo account" }, { status: 500 });
    }

    const userId = newUser.user.id;

    // Update agent profile with role
    await admin
      .from("agents")
      .update({
        display_name: demo.displayName,
        role: demo.role,
        account_status: "active",
      })
      .eq("id", userId);

    // Get subscription plan
    const { data: plan } = await admin.from("subscription_plans").select("id").eq("slug", demo.planSlug).single();

    if (plan) {
      // Create account
      const { data: account } = await admin
        .from("accounts")
        .insert({
          name: `${demo.displayName}'s Account`,
          owner_id: userId,
          subscription_plan_id: plan.id,
          billing_email: demo.email,
          is_active: true,
        })
        .select("id")
        .single();

      if (account) {
        // Add as account owner
        await admin.from("account_members").insert({
          account_id: account.id,
          agent_id: userId,
          account_role: "owner",
          is_active: true,
        });
      }

      // Create agent subscription (30-day demo trial)
      const today = new Date().toISOString().split("T")[0];
      const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      await admin.from("agent_subscriptions").insert({
        agent_id: userId,
        subscription_plan_id: plan.id,
        plan_type: "professional",
        status: "active",
        monthly_price: 0,
        current_period_start: today,
        current_period_end: trialEnd,
        trial_end_date: trialEnd,
        account_id: account?.id,
      });
    }

    // Sign in the newly created user
    const { data: session, error: sessionError } = await admin.auth.signInWithPassword({
      email: demo.email,
      password: demo.password,
    });

    if (sessionError || !session?.session) {
      return NextResponse.json({ error: "Demo account created but sign-in failed" }, { status: 500 });
    }

    return NextResponse.json({
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
    });
  } catch (err) {
    console.error("Demo login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
