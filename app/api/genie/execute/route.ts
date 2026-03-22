import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { QuickActionType } from "@/lib/genie/types";

/**
 * POST /api/genie/execute
 *
 * Unified execution route for Genie quick actions.
 * Each action type dispatches to the appropriate handler using existing APIs.
 *
 * Body:
 *   action: QuickActionType (required)
 *   params: Record<string, any> (action-specific parameters)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, params } = await request.json();
    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    let result: any;

    switch (action as QuickActionType) {
      // ════════════════════════════════════════════════════════════════════
      // LEADS & PIPELINE
      // ════════════════════════════════════════════════════════════════════

      case "advance_pipeline": {
        const { leadId, stage, direction } = params;
        if (!leadId) return NextResponse.json({ error: "leadId is required" }, { status: 400 });

        const body: any = {};
        if (stage) body.stage = stage;
        else body.direction = direction || "forward";

        const { data: lead, error: leadErr } = await supabase
          .from("lead_submissions")
          .select("pipeline_stage")
          .eq("id", leadId)
          .eq("agent_id", user.id)
          .single();

        if (leadErr || !lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

        // Use the advance stage logic inline
        const { PIPELINE_STAGES } = await import("@/lib/pipeline-stages");
        const currentIdx = PIPELINE_STAGES.indexOf(lead.pipeline_stage as any);
        let newStage = stage;
        if (!newStage) {
          const nextIdx = direction === "backward" ? currentIdx - 1 : currentIdx + 1;
          if (nextIdx < 0 || nextIdx >= PIPELINE_STAGES.length) {
            return NextResponse.json({ error: "Already at the end of pipeline" }, { status: 400 });
          }
          newStage = PIPELINE_STAGES[nextIdx];
        }

        const { error: updateErr } = await supabase
          .from("lead_submissions")
          .update({ pipeline_stage: newStage, updated_at: new Date().toISOString() })
          .eq("id", leadId)
          .eq("agent_id", user.id);

        if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

        result = { success: true, previousStage: lead.pipeline_stage, newStage };
        break;
      }

      case "create_task": {
        const { title, description, priority, dueDate, dueTime, taskType, linkedLeadId, linkedContactId, linkedOpenHouseId } = params;
        if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

        const { data: task, error: taskErr } = await supabase
          .from("tasks")
          .insert({
            agent_id: user.id,
            title,
            description: description || null,
            priority: priority || "medium",
            due_date: dueDate || null,
            due_time: dueTime || null,
            task_type: taskType || "general",
            linked_lead_id: linkedLeadId || null,
            linked_contact_id: linkedContactId || null,
            linked_open_house_id: linkedOpenHouseId || null,
            status: "pending",
          })
          .select()
          .single();

        if (taskErr) return NextResponse.json({ error: taskErr.message }, { status: 500 });
        result = { success: true, task };
        break;
      }

      case "create_calendar_event": {
        const { title, startAt, endAt, description, location, allDay } = params;
        if (!title || !startAt || !endAt) {
          return NextResponse.json({ error: "title, startAt, and endAt are required" }, { status: 400 });
        }

        const { data: event, error: eventErr } = await supabase
          .from("calendar_events")
          .insert({
            agent_id: user.id,
            title,
            start_at: startAt,
            end_at: endAt,
            description: description || null,
            location: location || null,
            all_day: allDay || false,
            source: "local",
            status: "confirmed",
          })
          .select()
          .single();

        if (eventErr) return NextResponse.json({ error: eventErr.message }, { status: 500 });
        result = { success: true, event };
        break;
      }

      case "create_open_house": {
        // Return link — open house creation has a complex form
        result = { success: true, redirect: "/app/open-houses/new", message: "Redirecting to open house creation form" };
        break;
      }

      // ════════════════════════════════════════════════════════════════════
      // PROPERTY INTELLIGENCE
      // ════════════════════════════════════════════════════════════════════

      case "property_lookup": {
        const { address, zipCode } = params;
        if (!address && !zipCode) {
          return NextResponse.json({ error: "address or zipCode is required" }, { status: 400 });
        }

        const searchParams = new URLSearchParams();
        if (address) {
          searchParams.set("endpoint", "expanded");
          const parts = address.split(",").map((s: string) => s.trim());
          if (parts.length >= 2) {
            searchParams.set("address1", parts[0]);
            searchParams.set("address2", parts.slice(1).join(", "));
          } else {
            searchParams.set("address1", address);
          }
        } else {
          searchParams.set("endpoint", "expanded");
          searchParams.set("postalcode", zipCode);
        }

        result = { success: true, redirect: `/app/property-data?${searchParams}`, message: "Redirecting to property search" };
        break;
      }

      case "generate_property_report": {
        // Return link to property data page where report can be generated
        result = { success: true, redirect: "/app/property-data", message: "Open Property Intel, search a property, then click 'Generate Report'" };
        break;
      }

      case "search_mls": {
        const { zipCodes, propertyType, minPrice, maxPrice, minDOM } = params;
        if (!zipCodes) {
          return NextResponse.json({ error: "zipCodes is required" }, { status: 400 });
        }

        const searchParams = new URLSearchParams({
          searchType: "zip",
          postalCodes: Array.isArray(zipCodes) ? zipCodes.join(",") : zipCodes,
        });
        if (propertyType) searchParams.set("propertyType", propertyType);
        if (minPrice) searchParams.set("minPrice", String(minPrice));
        if (maxPrice) searchParams.set("maxPrice", String(maxPrice));
        if (minDOM) searchParams.set("minDOM", String(minDOM));

        result = { success: true, redirect: `/app/farm?${searchParams}`, message: "Redirecting to MLS search" };
        break;
      }

      case "run_calculator": {
        const { calculatorType } = params;
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
        const route = calcRoutes[calculatorType] || "/app/analyzers";
        result = { success: true, redirect: route, message: `Opening ${calculatorType || "calculator"} tool` };
        break;
      }

      case "export_calculator_report": {
        result = { success: true, redirect: "/app/analyzers", message: "Open a calculator, run the analysis, then use the Export button to generate and email the report" };
        break;
      }

      // ════════════════════════════════════════════════════════════════════
      // PROSPECTING
      // ════════════════════════════════════════════════════════════════════

      case "search_seller_map": {
        const { zips, propertyType: propType } = params;
        const searchParams = new URLSearchParams();
        if (zips) searchParams.set("zips", Array.isArray(zips) ? zips.join(",") : zips);
        if (propType) searchParams.set("propertyType", propType);
        result = { success: true, redirect: `/app/seller-map?${searchParams}`, message: "Opening Seller Opportunity Map" };
        break;
      }

      case "save_seller_search": {
        const { name, centerLat, centerLng, radiusMiles, filters } = params;
        if (!name || !centerLat || !centerLng) {
          return NextResponse.json({ error: "name, centerLat, and centerLng are required" }, { status: 400 });
        }

        const { data: search, error: searchErr } = await supabase
          .from("seller_map_saved_searches")
          .insert({
            agent_id: user.id,
            name,
            center_lat: centerLat,
            center_lng: centerLng,
            radius_miles: radiusMiles || 2,
            filters: filters || {},
          })
          .select()
          .single();

        if (searchErr) return NextResponse.json({ error: searchErr.message }, { status: 500 });
        result = { success: true, search };
        break;
      }

      case "create_dom_search": {
        const { zipCodes: domZips, redMultiplier, orangeMultiplier, charcoalMultiplier, propertyTypes } = params;
        if (!domZips?.length) {
          return NextResponse.json({ error: "zipCodes is required" }, { status: 400 });
        }

        const { data: domSearch, error: domErr } = await supabase
          .from("dom_prospect_searches")
          .insert({
            agent_id: user.id,
            name: `DOM Search: ${domZips.join(", ")}`,
            zip_codes: domZips,
            red_multiplier: redMultiplier ?? 2.0,
            orange_multiplier: orangeMultiplier ?? 1.5,
            charcoal_multiplier: charcoalMultiplier ?? 1.15,
            property_types: propertyTypes || null,
            is_active: true,
            notify_email: true,
            next_run_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          })
          .select()
          .single();

        if (domErr) return NextResponse.json({ error: domErr.message }, { status: 500 });
        result = { success: true, search: domSearch, redirect: "/app/seller-map/dom-prospecting" };
        break;
      }

      case "create_farm_watchdog": {
        result = { success: true, redirect: "/app/farm", message: "Opening Farm & Watchdog to create a new farm area" };
        break;
      }

      // ════════════════════════════════════════════════════════════════════
      // DOCUMENTS
      // ════════════════════════════════════════════════════════════════════

      case "send_esign_document": {
        const { contactId, templateId, documentName, mergeFields } = params;
        if (!contactId || !templateId) {
          return NextResponse.json({ error: "contactId and templateId are required" }, { status: 400 });
        }

        // Get GHL client
        const { data: ghlInteg } = await supabase
          .from("integrations")
          .select("config")
          .eq("agent_id", user.id)
          .eq("provider", "ghl")
          .eq("status", "connected")
          .single();

        if (!ghlInteg?.config) {
          return NextResponse.json({ error: "GoHighLevel is not connected" }, { status: 503 });
        }

        const config = typeof ghlInteg.config === "string" ? JSON.parse(ghlInteg.config) : ghlInteg.config;
        const { GHLClient } = await import("@/lib/integrations/ghl-client");
        const ghl = new GHLClient({ accessToken: config.access_token, locationId: config.location_id });

        try {
          const docResult = await ghl.sendDocumentTemplate({
            templateId,
            contactId,
            documentName: documentName || "Document for Signature",
            mergeFields: mergeFields || {},
            medium: "email",
          });
          result = { success: true, document: docResult };
        } catch (err: any) {
          return NextResponse.json({ error: err.message || "Failed to send document" }, { status: 500 });
        }
        break;
      }

      case "attach_file_to_contact": {
        // Redirect to the file attach workflow
        result = { success: true, message: "Use the calculator or report export to attach files to contacts" };
        break;
      }

      case "create_mls_search_profile": {
        result = { success: true, redirect: "/app/farm", message: "Use Farm Search to create an MLS search profile for a client's criteria" };
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Log the action
    await supabaseAdmin.from("genie_action_log").insert({
      agent_id: user.id,
      lead_id: params?.leadId || null,
      action_type: action,
      action_detail: { params, result },
      status: result?.success ? "completed" : "failed",
    }).catch(() => {});

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Genie Execute] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
