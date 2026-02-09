import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { TrestleClient, TrestleAuthMethod } from "@/lib/integrations/trestle-client";

/**
 * Connect Trestle Integration
 *
 * Accepts credentials and stores them after testing the connection
 * Supports multiple auth methods:
 * - Basic Auth (username + password)
 * - OAuth2 Client Credentials (client_id + client_secret)
 * - Bearer Token
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      auth_method,
      username,
      password,
      client_id,
      client_secret,
      bearer_token,
      api_url,
      token_url,
    } = body;

    // Validate required fields
    if (!api_url) {
      return NextResponse.json(
        { error: "WebAPI URL is required" },
        { status: 400 }
      );
    }

    // Determine auth method and validate credentials
    let method: TrestleAuthMethod = auth_method || "basic";

    if (username && password) {
      method = "basic";
    } else if (client_id && client_secret) {
      method = "oauth2";
    } else if (bearer_token) {
      method = "bearer";
    } else {
      return NextResponse.json(
        { error: "Please provide either username/password or client credentials" },
        { status: 400 }
      );
    }

    // Test the credentials
    const client = new TrestleClient({
      method,
      username,
      password,
      clientId: client_id,
      clientSecret: client_secret,
      bearerToken: bearer_token,
      apiUrl: api_url,
      tokenUrl: token_url,
    });

    const testResult = await client.testConnection();

    if (!testResult.success) {
      return NextResponse.json(
        { error: testResult.message || "Invalid credentials or connection failed" },
        { status: 400 }
      );
    }

    // Prepare config (store credentials securely)
    const config: Record<string, any> = {
      auth_method: method,
      api_url,
      total_listings: testResult.data?.totalListings || 0,
      connected_at: new Date().toISOString(),
    };

    // Store credentials based on auth method
    if (method === "basic") {
      config.username = username;
      config.password = password;
    } else if (method === "oauth2") {
      config.client_id = client_id;
      config.client_secret = client_secret;
      if (token_url) config.token_url = token_url;
    } else if (method === "bearer") {
      config.bearer_token = bearer_token;
    }

    // Upsert integration using admin client (bypasses RLS, matches Stripe/PayPal pattern)
    const { error: dbError } = await supabaseAdmin
      .from("integrations")
      .upsert(
        {
          agent_id: userData.user.id,
          provider: "trestle",
          config,
          status: "connected",
          last_sync_at: new Date().toISOString(),
        },
        { onConflict: "agent_id,provider" }
      );

    if (dbError) {
      console.error("Error saving Trestle integration:", dbError);
      return NextResponse.json(
        { error: "Failed to save integration: " + dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Trestle connected successfully",
      totalListings: testResult.data?.totalListings || 0,
    });
  } catch (error) {
    console.error("Error in Trestle connect:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
