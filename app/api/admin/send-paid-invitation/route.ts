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

    const { email, fullName, phone, planId, billingFrequency, adminNotes } = await request.json();

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

    // Create Stripe checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://realestategenie.app";

    const session = await getStripe().checkout.sessions.create({
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

    // Update access request with Stripe session ID
    await (getAdmin()
      .from("access_requests") as any)
      .update({
        stripe_checkout_session_id: session.id,
      })
      .eq("id", accessRequest.id);

    // Send payment link email to user
    try {
      const { sendPaymentLinkEmail } = await import("@/lib/email/resend");

      await sendPaymentLinkEmail({
        to: email,
        name: fullName,
        planName: plan.name,
        monthlyPrice: plan.monthly_price,
        annualPrice: plan.annual_price,
        billingFrequency,
        paymentUrl: session.url!,
        planDetails: {
          maxAgents: plan.max_agents,
          maxProperties: plan.max_properties,
          maxTenants: plan.max_tenants,
        },
      });

      console.log(`Payment link email sent to ${email}`);

      return NextResponse.json({
        success: true,
        checkoutUrl: session.url,
        accessRequestId: accessRequest.id,
        emailSent: true,
      });
    } catch (emailError: any) {
      console.error("Failed to send payment link email:", emailError);
      // Don't fail the invitation - return success but indicate email wasn't sent
      return NextResponse.json({
        success: true,
        checkoutUrl: session.url,
        accessRequestId: accessRequest.id,
        emailSent: false,
        warning: "Invitation created but email could not be sent. Please share the payment link manually.",
      });
    }
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
