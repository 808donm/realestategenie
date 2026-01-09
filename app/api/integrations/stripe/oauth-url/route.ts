import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate state token for security
    const state = crypto.randomUUID();

    // Store state in session/database for validation (you could use a temp table or session)
    // For now, we'll include user ID in state and validate on callback

    // Build Stripe Connect OAuth URL
    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json(
        { error: "Stripe Connect is not configured. Please contact support." },
        { status: 500 }
      );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/stripe/callback`;

    // Encode user ID and state in the state parameter
    const stateData = Buffer.from(
      JSON.stringify({ userId: userData.user.id, nonce: state })
    ).toString("base64url");

    const oauthUrl = new URL("https://connect.stripe.com/oauth/authorize");
    oauthUrl.searchParams.set("client_id", clientId);
    oauthUrl.searchParams.set("state", stateData);
    oauthUrl.searchParams.set("response_type", "code");
    oauthUrl.searchParams.set("redirect_uri", redirectUri);
    oauthUrl.searchParams.set("scope", "read_write");

    return NextResponse.json({ oauth_url: oauthUrl.toString() });
  } catch (error) {
    console.error("Error generating Stripe OAuth URL:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
