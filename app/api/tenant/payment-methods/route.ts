import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch payment methods
    const { data: paymentMethods, error: methodsError } = await supabase
      .from("tenant_payment_methods")
      .select("*")
      .eq("tenant_user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (methodsError) {
      console.error("Error fetching payment methods:", methodsError);
      return NextResponse.json(
        { error: "Failed to fetch payment methods" },
        { status: 500 }
      );
    }

    return NextResponse.json({ paymentMethods });
  } catch (error) {
    console.error("Error in GET /api/tenant/payment-methods:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify this is a tenant account
    const userMetadata = user.user_metadata;
    if (userMetadata?.role !== "tenant") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      payment_type,
      stripe_payment_method_id,
      stripe_customer_id,
      paypal_billing_agreement_id,
      last_four,
      card_brand,
      paypal_email,
    } = body;

    // Validate input
    if (!payment_type || !["stripe", "paypal"].includes(payment_type)) {
      return NextResponse.json(
        { error: "Invalid payment type" },
        { status: 400 }
      );
    }

    // Check if this is the first payment method (should be default)
    const { count } = await supabase
      .from("tenant_payment_methods")
      .select("*", { count: "exact", head: true })
      .eq("tenant_user_id", user.id);

    const isFirstMethod = count === 0;

    // Create payment method
    const { data: newMethod, error: createError } = await supabase
      .from("tenant_payment_methods")
      .insert({
        tenant_user_id: user.id,
        payment_type,
        stripe_payment_method_id,
        stripe_customer_id,
        paypal_billing_agreement_id,
        last_four,
        card_brand,
        paypal_email,
        is_default: isFirstMethod, // First method is automatically default
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating payment method:", createError);
      return NextResponse.json(
        { error: "Failed to create payment method" },
        { status: 500 }
      );
    }

    return NextResponse.json({ paymentMethod: newMethod }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/tenant/payment-methods:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
