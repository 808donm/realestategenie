import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { getValidGHLConfig, resolveGHLAgentId } from "@/lib/integrations/ghl-token-refresh";

/**
 * Send email or SMS via GHL conversations API
 * POST /api/messaging/send
 * Body: { contactId, type: "email" | "sms", message, subject? }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contactId, type, message, subject, html } = body;

    if (!contactId || !type || !message) {
      return NextResponse.json({ error: "contactId, type, and message are required" }, { status: 400 });
    }

    if (!["email", "sms"].includes(type)) {
      return NextResponse.json({ error: "type must be 'email' or 'sms'" }, { status: 400 });
    }

    const ghlAgentId = await resolveGHLAgentId(userData.user.id);
    const ghlConfig = await getValidGHLConfig(ghlAgentId);
    if (!ghlConfig) {
      return NextResponse.json(
        { error: "GHL integration not connected. Connect GHL in Settings to send messages." },
        { status: 400 },
      );
    }

    const client = new GHLClient(ghlConfig.access_token, ghlConfig.location_id);

    let result;
    if (type === "sms") {
      result = await client.sendSMS({
        contactId,
        message,
      });
    } else {
      result = await client.sendEmail({
        contactId,
        subject: subject || "(No Subject)",
        html: html || `<p>${message.replace(/\n/g, "<br>")}</p>`,
      });
    }

    // Log the sent message
    const adminClient = (await import("@supabase/supabase-js")).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    await adminClient
      .from("sent_messages")
      .insert({
        agent_id: userData.user.id,
        contact_id: contactId,
        message_type: type,
        subject: type === "email" ? subject : null,
        body: message,
        ghl_message_id: result?.messageId,
        sent_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) console.log("Could not log sent message:", error.message);
      });

    return NextResponse.json({ success: true, messageId: result?.messageId });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send message" },
      { status: 500 },
    );
  }
}
