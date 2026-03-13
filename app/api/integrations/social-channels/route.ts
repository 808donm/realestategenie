import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/integrations/social-channels
 * Returns the agent's social channel configuration.
 */
export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabaseAdmin
    .from("integrations")
    .select("id, config, status, last_sync_at")
    .eq("agent_id", user.id)
    .eq("provider", "social_channels")
    .single();

  return NextResponse.json({ integration: data || null });
}

/**
 * POST /api/integrations/social-channels
 * Create or update social channel configuration.
 */
export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { channel, config } = body;

  if (!channel || !config) {
    return NextResponse.json(
      { error: "Missing channel or config" },
      { status: 400 }
    );
  }

  // Load existing integration
  const { data: existing } = await supabaseAdmin
    .from("integrations")
    .select("id, config")
    .eq("agent_id", user.id)
    .eq("provider", "social_channels")
    .single();

  const existingConfig = (existing?.config || {}) as Record<string, any>;
  const updatedConfig = {
    ...existingConfig,
    [channel]: { ...config, enabled: true },
  };

  if (existing) {
    await supabaseAdmin
      .from("integrations")
      .update({
        config: updatedConfig,
        status: "connected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("integrations").insert({
      agent_id: user.id,
      provider: "social_channels",
      status: "connected",
      config: updatedConfig,
    });
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/integrations/social-channels
 * Disconnect a specific channel.
 */
export async function DELETE(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel");

  if (!channel) {
    return NextResponse.json({ error: "Missing channel" }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("integrations")
    .select("id, config")
    .eq("agent_id", user.id)
    .eq("provider", "social_channels")
    .single();

  if (!existing) {
    return NextResponse.json({ success: true });
  }

  const existingConfig = (existing.config || {}) as Record<string, any>;
  delete existingConfig[channel];

  const hasAnyEnabled = Object.values(existingConfig).some(
    (c: any) => c?.enabled
  );

  await supabaseAdmin
    .from("integrations")
    .update({
      config: existingConfig,
      status: hasAnyEnabled ? "connected" : "disconnected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  return NextResponse.json({ success: true });
}
