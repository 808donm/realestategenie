import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/messaging/auto-response - Get auto-response settings
 * POST /api/messaging/auto-response - Update auto-response settings
 *
 * Controls whether the AI SMS assistant auto-replies 24/7 to inbound messages.
 * When enabled, the GHL webhook handler uses the AI SMS assistant to generate
 * and send replies automatically.
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read from integrations config
    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("agent_id", userData.user.id)
      .eq("provider", "ghl")
      .eq("status", "connected")
      .single();

    const config = (integration?.config as Record<string, any>) || {};

    return NextResponse.json({
      enabled: !!config.ai_sms_enabled,
      autoReplyEmail: !!config.ai_email_enabled,
      afterHoursOnly: !!config.ai_after_hours_only,
      businessHoursStart: config.business_hours_start || "08:00",
      businessHoursEnd: config.business_hours_end || "18:00",
      maxAutoRepliesPerContact: config.max_auto_replies || 5,
      escalateAfterReplies: config.escalate_after_replies || 3,
      greeting: config.ai_greeting || "Thanks for reaching out! I'll get back to you shortly.",
    });
  } catch {
    return NextResponse.json({
      enabled: false,
      autoReplyEmail: false,
      afterHoursOnly: false,
      businessHoursStart: "08:00",
      businessHoursEnd: "18:00",
      maxAutoRepliesPerContact: 5,
      escalateAfterReplies: 3,
      greeting: "Thanks for reaching out! I'll get back to you shortly.",
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Read current integration config
    const { data: integration } = await supabase
      .from("integrations")
      .select("id, config")
      .eq("agent_id", userData.user.id)
      .eq("provider", "ghl")
      .eq("status", "connected")
      .single();

    if (!integration) {
      return NextResponse.json(
        { error: "GHL integration not connected. Connect GHL in Settings first." },
        { status: 400 },
      );
    }

    const currentConfig = (integration.config as Record<string, any>) || {};
    const updatedConfig = {
      ...currentConfig,
      ai_sms_enabled: body.enabled ?? currentConfig.ai_sms_enabled,
      ai_email_enabled: body.autoReplyEmail ?? currentConfig.ai_email_enabled,
      ai_after_hours_only: body.afterHoursOnly ?? currentConfig.ai_after_hours_only,
      business_hours_start: body.businessHoursStart || currentConfig.business_hours_start,
      business_hours_end: body.businessHoursEnd || currentConfig.business_hours_end,
      max_auto_replies: body.maxAutoRepliesPerContact || currentConfig.max_auto_replies,
      escalate_after_replies: body.escalateAfterReplies || currentConfig.escalate_after_replies,
      ai_greeting: body.greeting || currentConfig.ai_greeting,
    };

    const { error } = await supabase
      .from("integrations")
      .update({ config: updatedConfig, updated_at: new Date().toISOString() })
      .eq("id", integration.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update settings" },
      { status: 500 },
    );
  }
}
