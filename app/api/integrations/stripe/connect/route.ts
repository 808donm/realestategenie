import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Connect Stripe Integration
 * POST /api/integrations/stripe/connect
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { secret_key, publishable_key, mode } = body;

    if (!secret_key || !publishable_key) {
      return NextResponse.json(
        { error: "Missing required fields: secret_key, publishable_key" },
        { status: 400 }
      );
    }

    // Validate that secret key starts with sk_
    if (!secret_key.startsWith('sk_')) {
      return NextResponse.json(
        { error: "Invalid secret key format. Should start with 'sk_'" },
        { status: 400 }
      );
    }

    // Validate that publishable key starts with pk_
    if (!publishable_key.startsWith('pk_')) {
      return NextResponse.json(
        { error: "Invalid publishable key format. Should start with 'pk_'" },
        { status: 400 }
      );
    }

    // Store Stripe integration
    const { error } = await supabase
      .from("integrations")
      .upsert(
        {
          agent_id: user.id,
          provider: "stripe",
          status: "connected",
          config: {
            stripe_secret_key: secret_key,
            stripe_publishable_key: publishable_key,
            stripe_mode: mode || 'test',
          },
        },
        { onConflict: "agent_id,provider" }
      );

    if (error) {
      console.error("Stripe integration error:", error);
      return NextResponse.json(
        { error: "Failed to save Stripe integration" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Stripe connected successfully",
    });
  } catch (error) {
    console.error("Stripe connection error:", error);
    return NextResponse.json(
      { error: "Failed to connect Stripe" },
      { status: 500 }
    );
  }
}
