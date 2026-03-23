/**
 * Copilot Executor — Server-side action execution
 *
 * Extracts <execute> tags from AI responses and runs the corresponding action.
 * Same logic as /api/genie/execute but as a callable function (no HTTP overhead).
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CopilotActionResult } from "./types";

/**
 * Extract an <execute> tag from AI text
 */
export function extractExecuteTag(text: string): { action: string; params: Record<string, any> } | null {
  const match = text.match(/<execute>([\s\S]*?)<\/execute>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Strip <execute> tags from text for clean display
 */
export function stripExecuteTags(text: string): string {
  return text.replace(/<execute>[\s\S]*?<\/execute>/g, "").trim();
}

/**
 * Execute a copilot action server-side
 */
export async function executeCopilotAction(
  userId: string,
  action: string,
  params: Record<string, any>
): Promise<CopilotActionResult> {
  try {
    switch (action) {
      // ════════════════════════════════════════════════════════════════
      // LEADS & PIPELINE
      // ════════════════════════════════════════════════════════════════

      case "advance_pipeline": {
        const { leadId, stage, direction } = params;
        if (!leadId) return { action, success: false, error: "leadId is required" };

        const { data: lead } = await supabaseAdmin
          .from("lead_submissions")
          .select("pipeline_stage")
          .eq("id", leadId)
          .eq("agent_id", userId)
          .single();

        if (!lead) return { action, success: false, error: "Lead not found" };

        const { PIPELINE_STAGES } = await import("@/lib/pipeline-stages");
        const currentIdx = PIPELINE_STAGES.indexOf(lead.pipeline_stage as any);
        let newStage = stage;
        if (!newStage) {
          const nextIdx = direction === "backward" ? currentIdx - 1 : currentIdx + 1;
          if (nextIdx < 0 || nextIdx >= PIPELINE_STAGES.length) {
            return { action, success: false, error: "Already at the end of pipeline" };
          }
          newStage = PIPELINE_STAGES[nextIdx];
        }

        await supabaseAdmin
          .from("lead_submissions")
          .update({ pipeline_stage: newStage, updated_at: new Date().toISOString() })
          .eq("id", leadId);

        return { action, success: true, data: { previousStage: lead.pipeline_stage, newStage } };
      }

      case "create_task": {
        const { title } = params;
        if (!title) return { action, success: false, error: "title is required" };

        const { data: task, error } = await supabaseAdmin
          .from("tasks")
          .insert({
            agent_id: userId,
            title,
            description: params.description || null,
            priority: params.priority || "medium",
            due_date: params.dueDate || null,
            task_type: params.taskType || "general",
            linked_lead_id: params.linkedLeadId || null,
            status: "pending",
          })
          .select()
          .single();

        if (error) return { action, success: false, error: error.message };
        return { action, success: true, data: { task } };
      }

      case "create_calendar_event": {
        const { title, startAt, endAt } = params;
        if (!title || !startAt || !endAt) return { action, success: false, error: "title, startAt, and endAt are required" };

        const { data: event, error } = await supabaseAdmin
          .from("calendar_events")
          .insert({
            agent_id: userId,
            title,
            start_at: startAt,
            end_at: endAt,
            description: params.description || null,
            location: params.location || null,
            all_day: params.allDay || false,
            source: "local",
            status: "confirmed",
          })
          .select()
          .single();

        if (error) return { action, success: false, error: error.message };
        return { action, success: true, data: { event } };
      }

      case "create_open_house":
        return { action, success: true, redirect: "/app/open-houses/new" };

      // ════════════════════════════════════════════════════════════════
      // PROPERTY INTELLIGENCE
      // ════════════════════════════════════════════════════════════════

      case "property_lookup": {
        const { address, zipCode } = params;
        if (!address && !zipCode) return { action, success: false, error: "address or zipCode required" };

        // Call the property API server-side
        const searchParams = new URLSearchParams({ endpoint: "expanded" });
        if (address) {
          const parts = address.split(",").map((s: string) => s.trim());
          if (parts.length >= 2) {
            searchParams.set("address1", parts[0]);
            searchParams.set("address2", parts.slice(1).join(", "));
          } else {
            searchParams.set("address1", address);
          }
        } else {
          searchParams.set("postalcode", zipCode);
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/integrations/attom/property?${searchParams}`);
        const data = await res.json();
        const properties = data.property || (data.address ? [data] : []);

        return { action, success: true, data: { properties: Array.isArray(properties) ? properties.slice(0, 5) : [properties], total: Array.isArray(properties) ? properties.length : 1 } };
      }

      case "search_mls": {
        const { zipCodes } = params;
        if (!zipCodes) return { action, success: false, error: "zipCodes required" };

        const searchParams = new URLSearchParams({
          searchType: "zip",
          postalCodes: Array.isArray(zipCodes) ? zipCodes.join(",") : zipCodes,
          status: "Active",
          limit: "10",
        });
        if (params.propertyType) searchParams.set("propertyType", params.propertyType);
        if (params.minPrice) searchParams.set("minPrice", String(params.minPrice));
        if (params.maxPrice) searchParams.set("maxPrice", String(params.maxPrice));

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/mls/farm-search?${searchParams}`);
        const data = await res.json();

        return { action, success: true, data: { properties: (data.properties || []).slice(0, 10), totalCount: data.totalCount || 0 } };
      }

      case "run_calculator": {
        const calcRoutes: Record<string, string> = {
          mortgage: "/app/analyzers/mortgage",
          "net-sheet": "/app/analyzers/net-sheet",
          "cash-to-close": "/app/analyzers/cash-to-close",
          "commission-split": "/app/analyzers/commission-split",
          rental: "/app/analyzers/rental",
          flip: "/app/analyzers/flip",
          brrr: "/app/analyzers/brrr",
          "1031": "/app/analyzers/1031",
          wholesale: "/app/analyzers/wholesale",
          "quick-flip": "/app/analyzers/quick-flip",
          compare: "/app/analyzers/compare",
        };
        const route = calcRoutes[params.calculatorType] || "/app/analyzers";
        return { action, success: true, redirect: route };
      }

      case "generate_property_report":
        return { action, success: true, redirect: "/app/property-data" };

      case "export_calculator_report":
        return { action, success: true, redirect: "/app/analyzers" };

      // ════════════════════════════════════════════════════════════════
      // PROSPECTING
      // ════════════════════════════════════════════════════════════════

      case "search_seller_map": {
        const zips = params.zips || params.zipCodes || "";
        const searchParams = new URLSearchParams({ zips: Array.isArray(zips) ? zips.join(",") : zips, minScore: "40", limit: "10" });
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/seller-map?${searchParams}`);
        const data = await res.json();
        return { action, success: true, data: { properties: (data.properties || []).slice(0, 10), total: data.total || 0 } };
      }

      case "create_dom_search": {
        const zips = params.zipCodes || [];
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/dom-prospecting/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zipCodes: Array.isArray(zips) ? zips : zips.split(",").map((z: string) => z.trim()) }),
        });
        const data = await res.json();
        return { action, success: true, data: { results: (data.results || []).slice(0, 10), summary: data.summary, total: data.total || 0 } };
      }

      case "search_absentee":
      case "search_high_equity":
      case "search_foreclosure":
      case "search_just_sold":
      case "search_investor": {
        const zip = params.zipCode || params.zip || "";
        if (!zip) return { action, success: false, error: "zipCode required" };

        const searchParams = new URLSearchParams({ endpoint: "detailmortgageowner", postalcode: zip, pagesize: "20" });
        if (action === "search_absentee") searchParams.set("absenteeowner", "absentonly");
        if (action === "search_just_sold") {
          searchParams.set("endpoint", "salesnapshot");
          const end = new Date().toISOString().split("T")[0].replace(/-/g, "/");
          const start = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().split("T")[0].replace(/-/g, "/");
          searchParams.set("startSaleSearchDate", start);
          searchParams.set("endSaleSearchDate", end);
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/integrations/attom/property?${searchParams}`);
        const data = await res.json();
        let properties = data.property || [];

        // Apply mode-specific filters
        if (action === "search_high_equity") {
          properties = properties.filter((p: any) => {
            const avm = p.avm?.amount?.value || p.assessment?.market?.mktTtlValue || 0;
            const sale = p.sale?.amount?.saleAmt || 0;
            return avm > 0 && sale > 0 && ((avm - sale) / avm) > 0.3;
          });
        } else if (action === "search_foreclosure") {
          properties = properties.filter((p: any) => p.foreclosure?.actionType || p.foreclosure?.filingDate);
        } else if (action === "search_investor") {
          properties = properties.filter((p: any) => p.owner?.corporateIndicator === "Y" || (p.owner?.absenteeOwnerStatus === "A" && p.owner?.owner1?.fullName));
        }

        return { action, success: true, data: { properties: properties.slice(0, 10), total: properties.length } };
      }

      case "save_seller_search": {
        const { name, centerLat, centerLng } = params;
        if (!name || !centerLat || !centerLng) return { action, success: false, error: "name, centerLat, centerLng required" };
        const { data: search, error } = await supabaseAdmin
          .from("seller_map_saved_searches")
          .insert({ agent_id: userId, name, center_lat: centerLat, center_lng: centerLng, radius_miles: params.radiusMiles || 2, filters: params.filters || {} })
          .select().single();
        if (error) return { action, success: false, error: error.message };
        return { action, success: true, data: { search } };
      }

      case "create_farm_watchdog":
        return { action, success: true, redirect: "/app/farm" };

      // ════════════════════════════════════════════════════════════════
      // DOCUMENTS & COMMUNICATION
      // ════════════════════════════════════════════════════════════════

      case "send_esign_document": {
        const { contactId, templateId } = params;
        if (!contactId || !templateId) return { action, success: false, error: "contactId and templateId required" };

        const { data: ghlInteg } = await supabaseAdmin
          .from("integrations").select("config")
          .eq("agent_id", userId).eq("provider", "ghl").eq("status", "connected").single();

        if (!ghlInteg?.config) return { action, success: false, error: "GoHighLevel not connected" };
        const config = typeof ghlInteg.config === "string" ? JSON.parse(ghlInteg.config) : ghlInteg.config;
        const { GHLClient } = await import("@/lib/integrations/ghl-client");
        const ghl = new GHLClient(config.access_token, config.location_id);

        const docResult = await ghl.sendDocumentTemplate({
          templateId, contactId,
          documentName: params.documentName || "Document for Signature",
          mergeFields: params.mergeFields || {},
          medium: "email",
        });
        return { action, success: true, data: { document: docResult } };
      }

      case "draft_email":
      case "draft_sms": {
        const { generateDraft } = await import("@/lib/genie/draft-generator");
        const { PIPELINE_STAGE_LABELS } = await import("@/lib/pipeline-stages");

        const leadId = params.leadId;
        if (!leadId) return { action, success: false, error: "leadId required" };

        const { data: lead } = await supabaseAdmin
          .from("lead_submissions")
          .select("*, open_house_events!inner(address, start_at)")
          .eq("id", leadId).single();

        if (!lead) return { action, success: false, error: "Lead not found" };

        const { data: agent } = await supabaseAdmin.from("agents").select("display_name").eq("id", userId).single();
        const payload = lead.payload || {};
        const channel = action === "draft_email" ? "email" : "sms";
        const stageLabel = (PIPELINE_STAGE_LABELS as any)[lead.pipeline_stage] || lead.pipeline_stage;

        const draft = await generateDraft(channel as any, {
          agentName: agent?.display_name || "Agent",
          leadName: payload.name || "there",
          pipelineStage: lead.pipeline_stage || "new_lead",
          pipelineStageLabel: stageLabel,
          heatScore: lead.heat_score || 50,
          property: lead.open_house_events?.address || "your property inquiry",
          timeline: payload.timeline,
          financing: payload.financing,
          recentOpenHouse: !!lead.event_id,
        });

        return { action, success: true, data: { draft, channel } };
      }

      case "send_email":
      case "send_sms": {
        const { ghlContactId, body, subject } = params;
        if (!ghlContactId || !body) return { action, success: false, error: "ghlContactId and body required" };

        const { getValidGHLConfig } = await import("@/lib/integrations/ghl-token-refresh");
        const config = await getValidGHLConfig(userId);
        if (!config) return { action, success: false, error: "GoHighLevel not connected" };

        const { GHLClient } = await import("@/lib/integrations/ghl-client");
        const ghl = new GHLClient(config.access_token, config.location_id);

        if (action === "send_email") {
          const result = await ghl.sendEmail({ contactId: ghlContactId, subject: subject || "Follow up", html: body.replace(/\n/g, "<br>") });
          return { action, success: true, data: { messageId: result.messageId } };
        } else {
          const result = await ghl.sendSMS({ contactId: ghlContactId, message: body });
          return { action, success: true, data: { messageId: result.messageId } };
        }
      }

      case "attach_file_to_contact":
      case "create_mls_search_profile":
        return { action, success: true, redirect: "/app/farm" };

      default:
        return { action, success: false, error: `Unknown action: ${action}` };
    }
  } catch (err: any) {
    return { action, success: false, error: err.message || "Action execution failed" };
  }
}
