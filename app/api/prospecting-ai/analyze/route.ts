import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { analyzeProspects, type ProspectMode, type ProspectProperty, type MarketContext } from "@/lib/ai/prospect-ai";

export async function POST(req: NextRequest) {
  try {
    // Allow service-role key for internal server-to-server calls (e.g., Hoku copilot)
    const serviceKey = req.headers.get("x-service-role-key");
    const isServiceCall = serviceKey && serviceKey === process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!isServiceCall) {
      const supabase = await supabaseServer();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();
    const { mode, properties, market } = body as {
      mode: ProspectMode;
      properties: ProspectProperty[];
      market: MarketContext;
    };

    if (!mode || !properties || !Array.isArray(properties) || properties.length === 0) {
      return NextResponse.json({ error: "mode and properties[] are required" }, { status: 400 });
    }

    const analysis = await analyzeProspects(mode, properties, market || { zipCode: "unknown" });

    return NextResponse.json(analysis);
  } catch (err: unknown) {
    console.error("[prospecting-ai/analyze]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI analysis failed" },
      { status: 500 }
    );
  }
}
