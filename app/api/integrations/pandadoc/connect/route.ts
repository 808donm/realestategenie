import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { PandaDocClient } from "@/lib/integrations/pandadoc-client";

/**
 * Connect PandaDoc Integration
 *
 * Accepts an API key and stores it in the database after testing the connection
 * PandaDoc uses API keys instead of OAuth
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { api_key, default_template_id } = body;

    if (!api_key) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    // Test the API key
    const client = new PandaDocClient(api_key);
    const isValid = await client.testConnection();

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid API key or connection failed" },
        { status: 400 }
      );
    }

    // Get list of templates to verify access
    let templates: Array<{ id: string; name: string; version?: string }> = [];
    try {
      const result = await client.listTemplates({ count: 50 });
      templates = result.results;
    } catch (error) {
      console.error("Error fetching templates:", error);
      templates = [];
    }

    // Prepare config
    const config: any = {
      api_key,
      templates,
    };

    if (default_template_id) {
      config.default_template_id = default_template_id;
    }

    // Check if integration already exists
    const { data: existing } = await supabase
      .from("integrations")
      .select("id")
      .eq("agent_id", userData.user.id)
      .eq("provider", "pandadoc")
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
        console.error("Error updating PandaDoc integration:", updateError);
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
          provider: "pandadoc",
          config,
          status: "connected",
          last_sync_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Error creating PandaDoc integration:", insertError);
        return NextResponse.json(
          { error: "Failed to create integration" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "PandaDoc connected successfully",
      templates: templates.map((t) => ({ id: t.id, name: t.name })),
    });
  } catch (error) {
    console.error("Error in PandaDoc connect:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
