import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";

/**
 * POST /api/genie/send
 *
 * Send an approved draft via GoHighLevel and log the action.
 *
 * Body:
 *   channel: "email" | "sms"
 *   leadId: string
 *   ghlContactId: string
 *   subject?: string (email only)
 *   body: string
 *   actionType: string
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { channel, leadId, ghlContactId, subject, body: messageBody, actionType } = body;

    if (!channel || !ghlContactId || !messageBody) {
      return NextResponse.json({ error: "channel, ghlContactId, and body are required" }, { status: 400 });
    }

    // Get valid GHL config (handles token refresh internally)
    const config = await getValidGHLConfig(user.id);
    if (!config) {
      return NextResponse.json({ error: "GoHighLevel is not connected" }, { status: 503 });
    }

    const ghl = new GHLClient({
      accessToken: config.access_token,
      locationId: config.location_id,
    });

    // Send the message
    let messageId: string | undefined;
    try {
      if (channel === "email") {
        const result = await ghl.sendEmail({
          contactId: ghlContactId,
          subject: subject || "Follow up",
          html: messageBody.replace(/\n/g, "<br>"),
        });
        messageId = result.messageId;
      } else {
        const result = await ghl.sendSMS({
          contactId: ghlContactId,
          message: messageBody,
        });
        messageId = result.messageId;
      }
    } catch (sendErr: any) {
      // Log failed attempt
      await supabaseAdmin.from("genie_action_log").insert({
        agent_id: user.id,
        lead_id: leadId || null,
        action_type: `send_${channel}`,
        action_detail: {
          ghlContactId,
          subject,
          bodyPreview: messageBody.substring(0, 200),
          error: sendErr.message,
          actionType,
        },
        status: "failed",
      });

      return NextResponse.json({ error: sendErr.message || "Failed to send" }, { status: 500 });
    }

    // Log successful send
    await supabaseAdmin.from("genie_action_log").insert({
      agent_id: user.id,
      lead_id: leadId || null,
      action_type: `send_${channel}`,
      action_detail: {
        ghlContactId,
        messageId,
        subject,
        bodyPreview: messageBody.substring(0, 200),
        channel,
        actionType,
      },
      status: "completed",
    });

    return NextResponse.json({ success: true, messageId });
  } catch (error: any) {
    console.error("[Genie Send] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
