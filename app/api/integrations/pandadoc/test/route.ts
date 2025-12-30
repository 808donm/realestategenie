import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { PandaDocClient } from "@/lib/integrations/pandadoc-client";

/**
 * Test PandaDoc Connection
 *
 * Tests the stored API key and refreshes template list
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get integration
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", userData.user.id)
      .eq("provider", "pandadoc")
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: "PandaDoc integration not found" },
        { status: 404 }
      );
    }

    const apiKey = integration.config?.api_key;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found in configuration" },
        { status: 400 }
      );
    }

    // Test connection
    const client = new PandaDocClient(apiKey);
    const isValid = await client.testConnection();

    if (!isValid) {
      // Update status to error
      await supabase
        .from("integrations")
        .update({
          status: "error",
          last_error: "API key is invalid or expired",
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      return NextResponse.json(
        { error: "Connection test failed", success: false },
        { status: 400 }
      );
    }

    // Refresh template list
    let templates: Array<{ id: string; name: string; version?: string }> = [];
    try {
      const result = await client.listTemplates({ count: 50 });
      templates = result.results;

      // Update config with latest templates
      await supabase
        .from("integrations")
        .update({
          config: {
            ...integration.config,
            templates,
          },
          status: "connected",
          last_sync_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);
    } catch (error) {
      console.error("Error fetching templates:", error);
      templates = [];
    }

    return NextResponse.json({
      success: true,
      message: "Connection successful",
      templates: templates.map((t) => ({ id: t.id, name: t.name })),
      template_count: templates.length,
    });
  } catch (error) {
    console.error("Error testing PandaDoc connection:", error);
    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}
