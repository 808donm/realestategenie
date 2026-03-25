import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { buildCopilotPrompt, ACTION_LABELS } from "@/lib/genie/copilot-prompt";
import { extractExecuteTag, stripExecuteTags, executeCopilotAction } from "@/lib/genie/copilot-executor";

const MODEL = process.env.COPILOT_AI_MODEL || "openai/gpt-4o-mini";
const SESSION_TTL_MS = 24 * 3600 * 1000; // 24 hours
const MAX_HISTORY = 20; // messages sent to AI

/**
 * POST /api/genie/copilot
 *
 * Conversational AI copilot that executes tasks through dialogue.
 *
 * Body:
 *   message: string (required)
 *   sessionId?: string (resume session)
 *   actionContext?: string (QuickActionType that triggered the popup)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, sessionId, actionContext } = body;

    if (!message && !actionContext) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    // ── Load or create session ─────────────────────────────────────
    let session: any = null;
    let messages: Array<{ role: string; content: string }> = [];
    let persistedActionContext: string | null = null;

    if (sessionId) {
      const { data } = await supabaseAdmin
        .from("genie_copilot_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("agent_id", user.id)
        .single();

      if (data) {
        const age = Date.now() - new Date(data.updated_at).getTime();
        if (age < SESSION_TTL_MS) {
          session = data;
          messages = data.messages || [];
          // Restore action context from session
          persistedActionContext = (data as any).last_action_context || null;
        }
      }
    }

    // ── Get agent info and integrations ─────────────────────────────
    const { data: agent } = await supabase
      .from("agents")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const agentName = agent?.display_name || "Agent";

    const { data: integrations } = await supabase
      .from("integrations")
      .select("provider, status")
      .eq("agent_id", user.id)
      .eq("status", "connected");

    const connectedIntegrations = (integrations || []).map(i => i.provider);

    // ── Determine action context (new or persisted from session) ────
    const effectiveActionContext = actionContext || persistedActionContext;

    // ── Build system prompt (always pass context so Hoku stays focused) ──
    const systemPrompt = buildCopilotPrompt({
      agentName,
      connectedIntegrations,
      actionContext: effectiveActionContext,
    });

    // ── Prepare messages ───────────────────────────────────────────
    // If new session with actionContext, prepend synthetic message
    if (!session && actionContext && !message) {
      const label = ACTION_LABELS[actionContext] || actionContext;
      messages.push({ role: "user", content: `I want to ${label.toLowerCase()}` });
    } else if (message) {
      messages.push({ role: "user", content: message });
    }

    // ── Generate AI response ───────────────────────────────────────
    const historyForAI = messages.slice(-MAX_HISTORY);

    const aiParams: any = {
      model: gateway(MODEL),
      system: systemPrompt,
      messages: historyForAI.map(m => ({ role: m.role as any, content: m.content })),
      temperature: 0.7,
    };

    let { text: aiResponse } = await generateText(aiParams);

    // ── Check for <execute> tag ────────────────────────────────────
    let actionResult = null;
    const executeIntent = extractExecuteTag(aiResponse);

    if (executeIntent) {
      // Execute the action
      actionResult = await executeCopilotAction(user.id, executeIntent.action, executeIntent.params);

      // Add the action result as context for the AI
      let resultSummary: string;
      if (!actionResult.success) {
        resultSummary = `Action "${executeIntent.action}" failed: ${actionResult.error}`;
      } else if (actionResult.data?.properties?.length) {
        // Format property results clearly for the AI
        const props = actionResult.data.properties.slice(0, 15);
        const formatted = props.map((p: any, i: number) => {
          const addr = p.address?.oneLine || p.address || "Unknown";
          const beds = p.building?.rooms?.beds || p.beds || "?";
          const baths = p.building?.rooms?.bathsFull || p.baths || "?";
          const avm = p.avm?.amount?.value || p.score ? `Score: ${p.score}` : "";
          const owner = p.owner?.owner1?.fullName || p.ownerName || "";
          const absentee = p.owner?.absenteeOwnerStatus === "A" || p.owner?.absenteeOwnerStatus?.includes("Absentee") ? "Absentee" : "";
          const mailing = p.owner?.mailingAddressOneLine || "";
          const tier = p.tier || "";
          const reasoning = p.reasoning || "";
          return `${i + 1}. ${addr} | ${beds}bd ${baths}ba | ${owner} ${absentee} ${mailing ? `(Mailing: ${mailing})` : ""} ${avm} ${tier} ${reasoning}`.trim();
        }).join("\n");
        const total = actionResult.data.total || props.length;
        const aiScored = actionResult.data.aiScored ? " (AI-scored by seller likelihood)" : "";
        const summary = actionResult.data.summary || actionResult.data.topInsight || "";
        resultSummary = `Action "${executeIntent.action}" found ${total} properties${aiScored}.\n${summary ? `Summary: ${summary}\n` : ""}Results:\n${formatted}`;
      } else {
        resultSummary = `Action "${executeIntent.action}" executed successfully. Result: ${JSON.stringify(actionResult.data || actionResult.redirect || {}).substring(0, 1000)}`;
      }

      // Append assistant response (with execute tag) and result
      messages.push({ role: "assistant", content: aiResponse });
      messages.push({ role: "user", content: `[System: ${resultSummary}]` });

      // Call AI again to summarize the result
      const followUpHistory = messages.slice(-MAX_HISTORY);
      const { text: followUp } = await generateText({
        model: gateway(MODEL),
        system: systemPrompt + "\n\nThe action has been executed. Summarize the results briefly — mention total found and top insights. The property cards are already displayed visually below your message, so do NOT list individual properties again. Instead, highlight the key patterns (e.g., 'Most are long-term holds with high equity' or 'Several have out-of-state mailing addresses'). Suggest ONE specific next step. Do NOT include another <execute> tag. Keep response under 60 words.",
        messages: followUpHistory.map(m => ({ role: m.role as any, content: m.content })),
        temperature: 0.7,
      });

      aiResponse = stripExecuteTags(followUp);
    } else {
      aiResponse = stripExecuteTags(aiResponse);
    }

    // ── Append AI response to messages ─────────────────────────────
    messages.push({ role: "assistant", content: aiResponse });

    // ── Save session ───────────────────────────────────────────────
    const now = new Date().toISOString();

    if (session) {
      await supabaseAdmin
        .from("genie_copilot_sessions")
        .update({
          messages,
          message_count: messages.length,
          last_message_at: now,
          updated_at: now,
          last_action_context: effectiveActionContext || null,
        })
        .eq("id", session.id);
    } else {
      const { data: newSession } = await supabaseAdmin
        .from("genie_copilot_sessions")
        .insert({
          agent_id: user.id,
          messages,
          message_count: messages.length,
          last_message_at: now,
          last_action_context: effectiveActionContext || null,
        })
        .select("id")
        .single();

      session = newSession;
    }

    // ── Log to action log ──────────────────────────────────────────
    if (actionResult) {
      try {
        await supabaseAdmin.from("genie_action_log").insert({
          agent_id: user.id,
          action_type: `copilot_${executeIntent?.action || "unknown"}`,
          action_detail: {
            action: executeIntent?.action,
            params: executeIntent?.params,
            success: actionResult.success,
          },
          status: actionResult.success ? "completed" : "failed",
        });
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      reply: aiResponse,
      sessionId: session?.id,
      actionResult,
    });
  } catch (error: any) {
    console.error("[Genie Copilot] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
