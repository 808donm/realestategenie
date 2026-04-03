import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * POST /api/integrations/idx-broker/save
 *
 * Saves the agent's IDX Broker API key for Hoku Web Assistant MLS search.
 * Body: { apiKey: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { apiKey } = await request.json();
    if (!apiKey) return NextResponse.json({ error: "apiKey is required" }, { status: 400 });

    // Upsert the IDX Broker integration
    await supabase.from("integrations").upsert(
      {
        agent_id: user.id,
        provider: "idx_broker",
        status: "connected",
        config: { api_key: apiKey },
      },
      { onConflict: "agent_id,provider" },
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}
