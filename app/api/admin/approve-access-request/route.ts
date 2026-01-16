import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logError } from "@/lib/error-logging";
import Stripe from "stripe";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

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

    const { data: agent } = await supabase
      .from("agents")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (!agent || agent.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { requestId, adminNotes } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    // Get the access request
    const { data: accessRequest, error: fetchError } = await admin
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

    if (accessRequest.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been processed" },
        { status: 400 }
      );
    }

    // Get the default subscription plan (you can modify this to let admin choose)
    const { data: plans } = await admin
      .from("subscription_plans")
      .select("*")
      .eq("name", "Pro")
      .single();

    if (!plans) {
      return NextResponse.json(
        { error: "No subscription plans found" },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://realestategenie.app";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: accessRequest.email,
      client_reference_id: accessRequest.id, // Store access request ID
      line_items: [
        {
          price: plans.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/app?subscription=success`,
      cancel_url: `${appUrl}/register?subscription=cancelled`,
      metadata: {
        access_request_id: accessRequest.id,
        applicant_email: accessRequest.email,
        applicant_name: accessRequest.full_name,
      },
    });

    // Update access request
    await admin
      .from("access_requests")
      .update({
        status: "approved",
        admin_notes: adminNotes || null,
        reviewed_by: agent.id,
        reviewed_at: new Date().toISOString(),
        stripe_checkout_session_id: session.id,
        payment_link_sent_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    // TODO: Send email to user with payment link
    // You can add email notification here if desired

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
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
