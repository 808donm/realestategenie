import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { generateOutreach, type ProspectMode, type ProspectProperty, type MarketContext } from "@/lib/ai/prospect-ai";

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { mode, properties, market, agentName, agentPhone } = body as {
      mode: ProspectMode;
      properties: ProspectProperty[];
      market: MarketContext;
      agentName: string;
      agentPhone?: string;
    };

    if (!mode || !properties?.length || !agentName) {
      return NextResponse.json({ error: "mode, properties[], and agentName are required" }, { status: 400 });
    }

    const outreach = await generateOutreach(mode, properties, market || { zipCode: "unknown" }, agentName, agentPhone);

    return NextResponse.json(outreach);
  } catch (err: unknown) {
    console.error("[prospecting-ai/outreach]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Outreach generation failed" },
      { status: 500 }
    );
  }
}
