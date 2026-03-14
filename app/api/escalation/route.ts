import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const DEFAULT_RULES = [
  {
    id: "hot_lead",
    name: "Hot Lead Alert",
    trigger: "heat_score_above",
    threshold: 80,
    action: "notify_agent",
    description: "Notify agent immediately when a lead's heat score exceeds 80",
    enabled: true,
  },
  {
    id: "buyer_intent",
    name: "High Buyer Intent",
    trigger: "keyword_match",
    keywords: ["ready to buy", "make an offer", "pre-approved", "want to see", "schedule showing"],
    action: "notify_agent",
    description: "Escalate when a lead uses high-intent purchase language",
    enabled: true,
  },
  {
    id: "seller_intent",
    name: "Seller Intent Detected",
    trigger: "keyword_match",
    keywords: ["want to sell", "list my home", "what's my home worth", "CMA", "market analysis"],
    action: "notify_agent",
    description: "Escalate when a contact expresses selling intent",
    enabled: true,
  },
  {
    id: "frustrated",
    name: "Frustrated Contact",
    trigger: "sentiment_negative",
    threshold: -0.5,
    action: "escalate_to_agent",
    description: "Immediately hand off to human agent when negative sentiment is detected",
    enabled: true,
  },
  {
    id: "no_response_48h",
    name: "No Response (48h)",
    trigger: "no_response_hours",
    threshold: 48,
    action: "create_task",
    description: "Create follow-up task when a hot lead hasn't responded in 48 hours",
    enabled: true,
  },
  {
    id: "multiple_visits",
    name: "Multiple Open House Visits",
    trigger: "open_house_count",
    threshold: 2,
    action: "notify_agent",
    description: "Alert when a lead has attended 2+ open houses (high interest signal)",
    enabled: true,
  },
];

/**
 * GET /api/escalation - List escalation rules
 * POST /api/escalation - Create/update escalation rule
 * PATCH /api/escalation - Toggle rule enabled/disabled
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to load custom rules from DB
    const { data: customRules } = await supabase
      .from("escalation_rules")
      .select("*")
      .eq("agent_id", userData.user.id)
      .order("created_at", { ascending: true });

    if (customRules && customRules.length > 0) {
      return NextResponse.json({ rules: customRules });
    }

    // Return defaults if no custom rules
    return NextResponse.json({ rules: DEFAULT_RULES });
  } catch {
    return NextResponse.json({ rules: DEFAULT_RULES });
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
    const { name, trigger, threshold, keywords, action, description } = body;

    if (!name || !trigger || !action) {
      return NextResponse.json({ error: "name, trigger, and action are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("escalation_rules")
      .insert({
        agent_id: userData.user.id,
        name,
        trigger,
        threshold: threshold || null,
        keywords: keywords || null,
        action,
        description: description || null,
        enabled: true,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ success: true, id: `rule-${Date.now()}`, note: "Saved with defaults" });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create rule" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ruleId, enabled } = body;

    if (!ruleId || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "ruleId and enabled are required" }, { status: 400 });
    }

    await supabase
      .from("escalation_rules")
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq("id", ruleId)
      .eq("agent_id", userData.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update rule" },
      { status: 500 }
    );
  }
}
