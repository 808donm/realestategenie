import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Update GHL integration configuration
 * POST /api/integrations/ghl/config
 * Body: { ghl_lease_template_id?: string | null, ... other config }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Get agent's own integration
    const { data: integration, error: fetchError } = await supabase
      .from("integrations")
      .select("config")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .single();

    if (fetchError || !integration) {
      return NextResponse.json(
        { error: "GHL integration not found. Please connect your own GHL account in Integrations." },
        { status: 404 },
      );
    }

    // Merge new config with existing config
    const updatedConfig = {
      ...(integration.config || {}),
      ...body,
    };

    // Update integration config
    const { error: updateError } = await supabase
      .from("integrations")
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", user.id)
      .eq("provider", "ghl");

    if (updateError) {
      console.error("[GHL Config] Update error:", updateError);
      return NextResponse.json({ error: `Failed to update config: ${updateError.message}` }, { status: 500 });
    }

    console.log("[GHL Config] Configuration updated successfully");

    return NextResponse.json({
      success: true,
      message: "Configuration updated",
      config: updatedConfig,
    });
  } catch (error: any) {
    console.error("[GHL Config] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Get current GHL integration configuration
 * GET /api/integrations/ghl/config
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get agent's own integration
    const { data: integration, error } = await supabase
      .from("integrations")
      .select("config")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .single();

    if (error || !integration) {
      return NextResponse.json(
        { error: "GHL integration not found. Please connect your own GHL account in Integrations." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      config: integration.config || {},
    });
  } catch (error: any) {
    console.error("[GHL Config] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
