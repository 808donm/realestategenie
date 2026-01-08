import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Connect PayPal Integration
 * POST /api/integrations/paypal/connect
 *
 * Stores PayPal credentials (client ID and secret)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { client_id, client_secret, mode } = body;

    if (!client_id || !client_secret) {
      return NextResponse.json(
        { error: "Missing required fields: client_id, client_secret" },
        { status: 400 }
      );
    }

    // Validate mode
    if (mode && !['sandbox', 'live'].includes(mode)) {
      return NextResponse.json(
        { error: "Invalid mode. Must be 'sandbox' or 'live'" },
        { status: 400 }
      );
    }

    // Upsert PayPal integration
    const { data, error } = await supabase
      .from("integrations")
      .upsert({
        agent_id: user.id,
        provider: "paypal",
        status: "connected",
        config: {
          paypal_client_id: client_id,
          paypal_client_secret: client_secret,
          paypal_mode: mode || 'sandbox',
        },
      }, {
        onConflict: "agent_id,provider",
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving PayPal integration:", error);
      return NextResponse.json(
        { error: "Failed to save PayPal integration", details: error.message },
        { status: 500 }
      );
    }

    // Log to audit log
    await supabase.from("audit_log").insert({
      agent_id: user.id,
      action: "integration.connected",
      details: { provider: "paypal", mode: mode || 'sandbox' },
    });

    return NextResponse.json({
      success: true,
      message: "PayPal connected successfully",
      data,
    });
  } catch (error) {
    console.error("PayPal connect error:", error);
    return NextResponse.json(
      { error: "Failed to connect PayPal" },
      { status: 500 }
    );
  }
}
