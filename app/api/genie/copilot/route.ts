import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { trackedGenerateText } from "@/lib/ai/ai-call-logger";
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, sessionId, actionContext, currentPage, selectedProperty, selectedLead } = body;

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
    const { data: agent } = await supabase.from("agents").select("display_name").eq("id", user.id).single();

    const agentName = agent?.display_name || "Agent";

    const { data: integrations } = await supabase
      .from("integrations")
      .select("provider, status")
      .eq("agent_id", user.id)
      .eq("status", "connected");

    const connectedIntegrations = (integrations || []).map((i) => i.provider);

    // ── Determine action context (new or persisted from session) ────
    const effectiveActionContext = actionContext || persistedActionContext;

    // ── Enrich property context if needed ──────────────────────────
    // If we have a property address but are missing enriched data (comps,
    // sales history, market stats), fetch it server-side so Hoku has full context
    let enrichedProperty = selectedProperty || null;
    if (enrichedProperty?.address && !enrichedProperty?.comparableSales) {
      try {
        const addr = enrichedProperty.address;
        const zip = enrichedProperty.zip;
        const lat = enrichedProperty.latitude;
        const lng = enrichedProperty.longitude;
        const baseUrl =
          process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000";

        // Fetch comps, sales history, and market stats in parallel
        const [compsRes, salesRes, marketRes] = await Promise.allSettled([
          // Comps
          lat && lng
            ? fetch(
                `${baseUrl}/api/comps?address=${encodeURIComponent(addr)}&latitude=${lat}&longitude=${lng}&compCount=5`,
                {
                  headers: { Cookie: request.headers.get("cookie") || "" },
                },
              )
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null)
            : Promise.resolve(null),
          // Sales history
          fetch(`${baseUrl}/api/mls/sales-history?address=${encodeURIComponent(addr)}`, {
            headers: { Cookie: request.headers.get("cookie") || "" },
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          // Market stats
          zip
            ? fetch(`${baseUrl}/api/rentcast/market-stats?zipCode=${zip}`, {
                headers: { Cookie: request.headers.get("cookie") || "" },
              })
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null)
            : Promise.resolve(null),
        ]);

        // Merge enriched data
        const comps = compsRes.status === "fulfilled" ? compsRes.value : null;
        if (comps?.comparables?.length) {
          enrichedProperty.comparableSales = comps.comparables.slice(0, 5).map((c: any) => ({
            address: c.formattedAddress || c.address?.oneLine || c.UnparsedAddress || "Unknown",
            price: c.price || c.ClosePrice || c.ListPrice,
            beds: c.bedrooms || c.BedroomsTotal,
            baths: c.bathrooms || c.BathroomsTotalInteger,
            sqft: c.squareFootage || c.LivingArea,
            correlation: c.correlation,
          }));
        }

        const sales = salesRes.status === "fulfilled" ? salesRes.value : null;
        if (sales?.unitHistory?.length || sales?.buildingHistory?.length) {
          enrichedProperty.saleHistory = (sales.unitHistory || sales.buildingHistory || [])
            .slice(0, 5)
            .map((s: any) => ({
              date: s.CloseDate || s.date,
              amount: s.ClosePrice || s.amount,
              source: s.ListAgentFullName ? "MLS" : s._source || "public records",
            }));
        }

        const market = marketRes.status === "fulfilled" ? marketRes.value : null;
        if (market?.saleData || market?.rentalData) {
          enrichedProperty.marketStats = {
            medianPrice: market.saleData?.medianPrice,
            avgDOM: market.saleData?.averageDaysOnMarket,
            totalListings: market.saleData?.totalListings,
            pricePerSqft: market.saleData?.averagePricePerSquareFoot,
            medianRent: market.rentalData?.medianPrice,
          };
        }
      } catch (e) {
        console.log("[Copilot] Property enrichment failed (non-fatal):", (e as any)?.message);
      }
    }

    // ── Build system prompt (always pass context so Hoku stays focused) ──
    const systemPrompt = buildCopilotPrompt({
      agentName,
      connectedIntegrations,
      actionContext: effectiveActionContext,
      currentPage: currentPage || null,
      selectedProperty: enrichedProperty,
      selectedLead: selectedLead || null,
    });

    // ── Prepare messages ───────────────────────────────────────────
    // If new session with actionContext, prepend synthetic message
    if (!session && actionContext && !message) {
      const label = ACTION_LABELS[actionContext] || actionContext;
      messages.push({ role: "user", content: `I want to ${label.toLowerCase()}` });
    } else if (message) {
      // Inject action context reminder into user message so the model stays focused
      if (effectiveActionContext) {
        const label = ACTION_LABELS[effectiveActionContext] || effectiveActionContext;
        messages.push({
          role: "user",
          content: `[Context: We are working on "${label}". Stay focused on this task.]\n\n${message}`,
        });
      } else {
        messages.push({ role: "user", content: message });
      }
    }

    // ── Generate AI response ───────────────────────────────────────
    const historyForAI = messages.slice(-MAX_HISTORY);

    const aiResult = await trackedGenerateText({
      model: MODEL,
      system: systemPrompt,
      messages: historyForAI.map((m) => ({ role: m.role as any, content: m.content })),
      temperature: 0.7,
      source: "hoku-copilot",
      agentId: user.id,
    });

    let aiResponse = aiResult.text;

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
        const formatted = props
          .map((p: any, i: number) => {
            const addr = p.address?.oneLine || p.address || "Unknown";
            const beds = p.building?.rooms?.beds || p.beds || "?";
            const baths = p.building?.rooms?.bathsFull || p.baths || "?";
            const avm = p.avm?.amount?.value || p.score ? `Score: ${p.score}` : "";
            const owner = p.owner?.owner1?.fullName || p.ownerName || "";
            const absentee =
              p.owner?.absenteeOwnerStatus === "A" || p.owner?.absenteeOwnerStatus?.includes("Absentee")
                ? "Absentee"
                : "";
            const mailing = p.owner?.mailingAddressOneLine || "";
            const tier = p.tier || "";
            const reasoning = p.reasoning || "";
            return `${i + 1}. ${addr} | ${beds}bd ${baths}ba | ${owner} ${absentee} ${mailing ? `(Mailing: ${mailing})` : ""} ${avm} ${tier} ${reasoning}`.trim();
          })
          .join("\n");
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
      const { text: followUp } = await trackedGenerateText({
        model: MODEL,
        system:
          systemPrompt +
          "\n\nThe action has been executed. Summarize the results briefly — mention total found and top insights. The property cards are already displayed visually below your message, so do NOT list individual properties again. Instead, highlight the key patterns (e.g., 'Most are long-term holds with high equity' or 'Several have out-of-state mailing addresses'). Suggest ONE specific next step. Do NOT include another <execute> tag. Keep response under 60 words.",
        messages: followUpHistory.map((m) => ({ role: m.role as any, content: m.content })),
        temperature: 0.7,
        source: "hoku-copilot-followup",
        agentId: user.id,
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
      } catch {
        /* ignore */
      }
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
