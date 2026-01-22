import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logError } from "@/lib/error-logging";
import Stripe from "stripe";

// Force dynamic rendering and Node.js runtime - DO NOT CACHE
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0; // Never cache this route
// NOTE: Email sending is temporarily disabled - see bottom of file

const API_VERSION = "v2-email-disabled"; // Used to verify correct version is deployed

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
    console.log("Initializing Stripe client...");
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    console.log("Stripe key exists:", !!stripeKey);

    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    stripe = new Stripe(stripeKey, {
      apiVersion: "2025-12-15.clover",
    });
    console.log("Stripe client initialized successfully");
  }
  return stripe;
}

export async function POST(request: NextRequest) {
  console.log(`=== send-paid-invitation API ${API_VERSION} ===`);
  console.log("Email sending is DISABLED in this version");

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

    const { email, fullName, phone, planId, billingFrequency, adminNotes } = await request.json();
    console.log("Request body parsed successfully");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!fullName) {
      return NextResponse.json(
        { error: "Full name is required" },
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
    console.log("Input validation passed");

    // Check if user already exists
    const { data: existingAgent } = await (getAdmin()
      .from("agents") as any)
      .select("id")
      .eq("email", email)
      .single();

    if (existingAgent) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }
    console.log("No existing agent found - proceeding");

    // Check if there's already a pending access request for this email
    const { data: existingRequest } = await (getAdmin()
      .from("access_requests") as any)
      .select("id, status")
      .eq("email", email)
      .in("status", ["pending", "approved"])
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: "There is already an active request or invitation for this email" },
        { status: 400 }
      );
    }
    console.log("No existing access request found - proceeding");

    // Get the selected subscription plan
    const { data: plans } = await getAdmin()
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (!plans) {
      return NextResponse.json(
        { error: "Subscription plan not found" },
        { status: 404 }
      );
    }
    console.log("Subscription plan found successfully");

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
    console.log("Stripe price ID found - about to create access request");

    // Create an access request record (pre-approved by admin)
    const { data: accessRequest, error: createError } = await (getAdmin()
      .from("access_requests") as any)
      .insert({
        full_name: fullName,
        email: email,
        phone: phone || null,
        company: null,
        message: "Direct invitation sent by admin",
        status: "approved",
        admin_notes: adminNotes || "Direct paid invitation",
        reviewed_by: agent.id,
        reviewed_at: new Date().toISOString(),
        payment_link_sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError || !accessRequest) {
      console.error("Failed to create access request:", createError);
      return NextResponse.json(
        { error: "Failed to create invitation record" },
        { status: 500 }
      );
    }
    console.log("Access request created successfully - about to create Stripe session");

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
      customer_email: email,
      client_reference_id: accessRequest.id,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/app?subscription=success`,
      cancel_url: `${appUrl}/register?subscription=cancelled`,
      metadata: {
        access_request_id: accessRequest.id,
        applicant_email: email,
        applicant_name: fullName,
        billing_frequency: billingFrequency,
      },
    });
    console.log("Stripe session created successfully:", session.id);

    console.log("About to update access request with Stripe session ID");
    // Update access request with Stripe session ID
    await (getAdmin()
      .from("access_requests") as any)
      .update({
        stripe_checkout_session_id: session.id,
      })
      .eq("id", accessRequest.id);
    console.log("Access request updated successfully");

    // TEMPORARY: Skip email sending to unblock payment link generation
    // TODO: Fix Resend API initialization issue and re-enable
    console.log("Email sending temporarily disabled");
    console.log(`Payment link created successfully: ${session.url}`);

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      accessRequestId: accessRequest.id,
      emailSent: false,
      note: "Payment link generated successfully. Email functionality temporarily disabled - please send the link manually.",
    });
  } catch (error: any) {
    console.error("Error sending paid invitation:", error);
    await logError({
      endpoint: "/api/admin/send-paid-invitation",
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
