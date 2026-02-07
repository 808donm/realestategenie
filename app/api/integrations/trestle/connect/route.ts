import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { TrestleClient } from "@/lib/integrations/trestle-client";

/**
 * Connect Trestle Integration
 *
 * Accepts client credentials and stores them after testing the connection
 * Trestle uses OAuth2 Client Credentials flow
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { client_id, client_secret, api_url } = body;

    if (!client_id || !client_secret) {
      return NextResponse.json(
        { error: "Client ID and Client Secret are required" },
        { status: 400 }
      );
    }

    // Test the credentials
    const client = new TrestleClient(
      client_id,
      client_secret,
      api_url || process.env.TRESTLE_API_URL
    );

    const testResult = await client.testConnection();

    if (!testResult.success) {
      return NextResponse.json(
        { error: testResult.message || "Invalid credentials or connection failed" },
        { status: 400 }
      );
    }

    // Prepare config
    const config = {
      client_id,
      client_secret,
      api_url: api_url || process.env.TRESTLE_API_URL || "https://api-prod.corelogic.com",
      total_listings: testResult.data?.totalListings || 0,
      connected_at: new Date().toISOString(),
    };

    // Check if integration already exists
    const { data: existing } = await supabase
      .from("integrations")
      .select("id")
      .eq("agent_id", userData.user.id)
      .eq("provider", "trestle")
      .maybeSingle();

    if (existing) {
      // Update existing integration
      const { error: updateError } = await supabase
        .from("integrations")
        .update({
          config,
          status: "connected",
          last_sync_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Error updating Trestle integration:", updateError);
        return NextResponse.json(
          { error: "Failed to update integration" },
          { status: 500 }
        );
      }
    } else {
      // Create new integration
      const { error: insertError } = await supabase
        .from("integrations")
        .insert({
          agent_id: userData.user.id,
          provider: "trestle",
          config,
          status: "connected",
          last_sync_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Error creating Trestle integration:", insertError);
        return NextResponse.json(
          { error: "Failed to create integration" },
          { status: 500 }
        );
      }
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
