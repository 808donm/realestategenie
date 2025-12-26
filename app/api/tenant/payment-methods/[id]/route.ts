import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await params;

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { is_default, autopay_enabled } = body;

    // Fetch the payment method to verify ownership
    const { data: method } = await supabase
      .from("tenant_payment_methods")
      .select("*")
      .eq("id", id)
      .single();

    if (!method) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (method.tenant_user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - not owner" },
        { status: 403 }
      );
    }

    // If setting as default, unset all other defaults first
    if (is_default === true) {
      await supabase
        .from("tenant_payment_methods")
        .update({ is_default: false, autopay_enabled: false })
        .eq("tenant_user_id", user.id)
        .neq("id", id);
    }

    // Prepare update object
    const updates: any = {};
    if (is_default !== undefined) {
      updates.is_default = is_default;
    }
    if (autopay_enabled !== undefined) {
      // Only allow autopay on default payment method
      if (autopay_enabled && !method.is_default && !is_default) {
        return NextResponse.json(
          { error: "Only default payment method can have autopay enabled" },
          { status: 400 }
        );
      }
      updates.autopay_enabled = autopay_enabled;
    }

    // Update the payment method
    const { data: updatedMethod, error: updateError } = await supabase
      .from("tenant_payment_methods")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating payment method:", updateError);
      return NextResponse.json(
        { error: "Failed to update payment method" },
        { status: 500 }
      );
    }

    return NextResponse.json({ paymentMethod: updatedMethod });
  } catch (error) {
    console.error("Error in PATCH /api/tenant/payment-methods/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await params;

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the payment method to verify ownership
    const { data: method } = await supabase
      .from("tenant_payment_methods")
      .select("*")
      .eq("id", id)
      .single();

    if (!method) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (method.tenant_user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - not owner" },
        { status: 403 }
      );
    }

    // Prevent deletion of default payment method
    if (method.is_default) {
      return NextResponse.json(
        { error: "Cannot delete default payment method. Set another method as default first." },
        { status: 400 }
      );
    }

    // Delete the payment method
    const { error: deleteError } = await supabase
      .from("tenant_payment_methods")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting payment method:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete payment method" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/tenant/payment-methods/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
