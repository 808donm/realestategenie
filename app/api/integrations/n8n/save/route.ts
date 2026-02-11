import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Save n8n webhook configuration
 * POST /api/integrations/n8n/save
 */
export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { webhook_url, secret_key, enabled_events } = body;

    if (!webhook_url) {
      return NextResponse.json({ error: "Webhook URL is required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(webhook_url);
    } catch {
      return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 });
    }

    // Upsert n8n integration
    const { error } = await supabase
      .from("integrations")
      .upsert({
        agent_id: user.id,
        provider: "n8n",
        status: "connected",
        config: {
          webhook_url,
          secret_key: secret_key || null,
          enabled_events: enabled_events || [],
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "agent_id,provider",
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log to audit
    await supabase.from("audit_log").insert({
      agent_id: user.id,
      action: "integration.configured",
      details: { provider: "n8n", webhook_url },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
