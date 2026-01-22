import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logError } from "@/lib/error-logging";
import Stripe from "stripe";

// Force dynamic rendering and Node.js runtime
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Lazy initialization to prevent build-time evaluation
let admin: ReturnType<typeof createAdminClient> | null = null;
let stripe: Stripe | null = null;

function getAdmin() {
  if (!admin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log("Creating admin client...");
    console.log("Supabase URL exists:", !!supabaseUrl);
    console.log("Service Role Key exists:", !!serviceRoleKey);
    console.log("Service Role Key length:", serviceRoleKey?.length || 0);

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase credentials");
    }

    admin = createAdminClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { persistSession: false } }
    );
    console.log("Admin client created successfully");
  }
  return admin;
}

function getStripe() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-12-15.clover",
    });
  }
  return stripe;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Check if user is authenticated and is an admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to check role (bypasses RLS)
    // Note: agents.id IS the user_id (it references auth.users(id))
    const { data: agentData } = await getAdmin()
      .from("agents")
      .select("id, role")
      .eq("id", user.id)  // Changed from user_id to id
      .single();

    const agent = agentData as any;

    if (!agent || agent.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { requestId, planId, billingFrequency, adminNotes } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 }
      );
    }

    if (!billingFrequency || !["monthly", "yearly"].includes(billingFrequency)) {
      return NextResponse.json(
        { error: "Valid billing frequency is required (monthly or yearly)" },
        { status: 400 }
      );
    }

    // Get the access request
    const { data: accessRequest, error: fetchError } = await getAdmin()
      .from("access_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !accessRequest) {
      return NextResponse.json(
        { error: "Access request not found" },
        { status: 404 }
      );
    }

    // Type assertion to help TypeScript understand the shape
    const accessReq = accessRequest as any;

    if (accessReq.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been processed" },
        { status: 400 }
      );
    }

    // Get the selected subscription plan
    const { data: plans } = await getAdmin()
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (!plans) {
      return NextResponse.json(
        { error: "No subscription plans found" },
        { status: 500 }
      );
    }

    // Type assertion to help TypeScript understand the shape
    const plan = plans as any;

    // Select the appropriate Stripe price ID based on billing frequency
    const stripePriceId = billingFrequency === "yearly"
      ? plan.stripe_yearly_price_id
      : plan.stripe_price_id;

    if (!stripePriceId) {
      return NextResponse.json(
        { error: `Stripe price ID not configured for ${billingFrequency} billing on this plan` },
        { status: 500 }
      );
    }

    // Get admin's Stripe integration from database
    console.log("Fetching Stripe integration for admin:", agent.id);
    const { data: stripeIntegrationData, error: stripeIntError } = await getAdmin()
      .from("integrations")
      .select("config")
      .eq("agent_id", agent.id)
      .eq("provider", "stripe")
      .eq("status", "connected")
      .single();

    const stripeIntegration = stripeIntegrationData as any;

    console.log("Stripe integration found:", !!stripeIntegration, "Error:", stripeIntError);

    if (!stripeIntegration?.config) {
      return NextResponse.json(
        { error: "Stripe not connected. Please connect your Stripe account in the Integrations page." },
        { status: 400 }
      );
    }

    const stripeConfig = stripeIntegration.config as any;
    if (!stripeConfig.stripe_secret_key) {
      return NextResponse.json(
        { error: "Stripe secret key not found in integration config." },
        { status: 400 }
      );
    }

    console.log("Initializing Stripe client with credentials from database");
    const stripe = new Stripe(stripeConfig.stripe_secret_key, {
      apiVersion: "2025-12-15.clover",
    });
    console.log("Stripe client initialized successfully");

    // Create Stripe checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://realestategenie.app";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: accessReq.email,
      client_reference_id: accessReq.id, // Store access request ID
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/app?subscription=success`,
      cancel_url: `${appUrl}/register?subscription=cancelled`,
      metadata: {
        access_request_id: accessReq.id,
        applicant_email: accessReq.email,
        applicant_name: accessReq.full_name,
        billing_frequency: billingFrequency,
      },
    });

    // Update access request
    await (getAdmin()
      .from("access_requests") as any)
      .update({
        status: "approved",
        admin_notes: adminNotes || null,
        reviewed_by: agent.id,
        reviewed_at: new Date().toISOString(),
        stripe_checkout_session_id: session.id,
        payment_link_sent_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    // TEMPORARY: Skip email sending to unblock payment link generation
    // TODO: Fix Resend API initialization issue and re-enable
    console.log("Email sending temporarily disabled");
    console.log(`Payment link created successfully: ${session.url}`);

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      emailSent: false,
      note: "Payment link generated successfully. Email functionality temporarily disabled - please send the link manually.",
    });
  } catch (error: any) {
    console.error("Error approving access request:", error);
    await logError({
      endpoint: "/api/admin/approve-access-request",
      errorMessage: error.message,
      stackTrace: error.stack,
      severity: "error",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
