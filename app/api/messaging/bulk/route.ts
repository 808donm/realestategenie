import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";

/**
 * POST /api/messaging/bulk
 * Send bulk email or SMS to a list of contact IDs
 * Body: { contactIds: string[], type: "email" | "sms", message: string, subject?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contactIds, type, message, subject } = body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: "contactIds array is required" }, { status: 400 });
    }
    if (!type || !["email", "sms"].includes(type)) {
      return NextResponse.json({ error: "type must be 'email' or 'sms'" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    if (contactIds.length > 100) {
      return NextResponse.json({ error: "Maximum 100 contacts per batch" }, { status: 400 });
    }

    const ghlConfig = await getValidGHLConfig(userData.user.id);
    if (!ghlConfig) {
      return NextResponse.json({ error: "GHL integration not connected" }, { status: 400 });
    }

    const client = new GHLClient(ghlConfig.access_token, ghlConfig.location_id);

    const results: Array<{ contactId: string; success: boolean; error?: string }> = [];

    // Send messages sequentially with small delays to avoid rate limits
    for (const contactId of contactIds) {
      try {
        if (type === "sms") {
          await client.sendSMS({ contactId, message });
        } else {
          await client.sendEmail({
            contactId,
            subject: subject || "(No Subject)",
            html: `<p>${message.replace(/\n/g, "<br>")}</p>`,
          });
        }
        results.push({ contactId, success: true });
      } catch (err: any) {
        results.push({ contactId, success: false, error: err.message });
      }

      // Small delay between messages to respect rate limits
      if (contactIds.indexOf(contactId) < contactIds.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      sent: succeeded,
      failed,
      total: contactIds.length,
      results,
    });
  } catch (error) {
    console.error("Bulk send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send bulk messages" },
      { status: 500 }
    );
  }
}
