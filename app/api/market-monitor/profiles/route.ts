import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { runMonitorProfile, summarizeMonitorCriteria } from "@/lib/market-monitor/market-monitor-engine";

/**
 * GET /api/market-monitor/profiles
 * List agent's Market Monitor client profiles with alert counts
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profiles, error } = await supabase
      .from("market_monitor_profiles")
      .select("*")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Enrich with alert counts per type
    const enriched = await Promise.all(
      (profiles || []).map(async (p) => {
        const { data: alerts } = await supabase
          .from("market_monitor_alerts")
          .select("alert_type")
          .eq("profile_id", p.id);

        const counts: Record<string, number> = {};
        for (const a of alerts || []) {
          counts[a.alert_type] = (counts[a.alert_type] || 0) + 1;
        }

        return {
          ...p,
          criteriaSummary: summarizeMonitorCriteria(p.search_criteria),
          alertCounts: {
            new_listing: counts.new_listing || 0,
            price_drop: counts.price_drop || 0,
            back_on_market: counts.back_on_market || 0,
            expired_withdrawn: counts.expired_withdrawn || 0,
            pending: counts.pending || 0,
            total: (alerts || []).length,
          },
        };
      }),
    );

    return NextResponse.json({ profiles: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/market-monitor/profiles
 * Create a new monitor profile for a client
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { clientName, clientEmail, clientPhone, clientCrmContactId, searchCriteria, notifyEmail, notifySms, notifyCrm, alertNewListing, alertPriceDrop, alertBackOnMarket, alertExpiredWithdrawn, alertPending } = body;

    if (!clientName) return NextResponse.json({ error: "clientName is required" }, { status: 400 });

    const criteria = searchCriteria || {};
    if (!criteria.zip_codes?.length && !criteria.city) {
      return NextResponse.json({ error: "At least one location filter (zip_codes or city) is required" }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from("market_monitor_profiles")
      .insert({
        agent_id: user.id,
        client_name: clientName,
        client_email: clientEmail || null,
        client_phone: clientPhone || null,
        client_crm_contact_id: clientCrmContactId || null,
        search_criteria: criteria,
        notify_email: notifyEmail ?? true,
        notify_sms: notifySms ?? false,
        notify_crm: notifyCrm ?? false,
        alert_new_listing: alertNewListing ?? true,
        alert_price_drop: alertPriceDrop ?? true,
        alert_back_on_market: alertBackOnMarket ?? true,
        alert_expired_withdrawn: alertExpiredWithdrawn ?? false,
        alert_pending: alertPending ?? false,
        next_scan_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      profile,
      criteriaSummary: summarizeMonitorCriteria(criteria),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/market-monitor/profiles
 * Update a profile, toggle active, or trigger immediate scan
 *
 * Body: { id, action?: "run" | "toggle", ...fields }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, action, ...updates } = body;

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Verify ownership
    const { data: existing } = await supabase
      .from("market_monitor_profiles")
      .select("id, is_active")
      .eq("id", id)
      .eq("agent_id", user.id)
      .single();

    if (!existing) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    if (action === "run") {
      const summary = await runMonitorProfile(id);
      return NextResponse.json({ summary });
    }

    if (action === "toggle") {
      const { error } = await supabase
        .from("market_monitor_profiles")
        .update({ is_active: !existing.is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ toggled: true, is_active: !existing.is_active });
    }

    // General update
    const updateFields: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.clientName) updateFields.client_name = updates.clientName;
    if (updates.clientEmail !== undefined) updateFields.client_email = updates.clientEmail || null;
    if (updates.clientPhone !== undefined) updateFields.client_phone = updates.clientPhone || null;
    if (updates.clientCrmContactId !== undefined) updateFields.client_crm_contact_id = updates.clientCrmContactId || null;
    if (updates.searchCriteria) updateFields.search_criteria = updates.searchCriteria;
    if (updates.notifyEmail !== undefined) updateFields.notify_email = updates.notifyEmail;
    if (updates.notifySms !== undefined) updateFields.notify_sms = updates.notifySms;
    if (updates.notifyCrm !== undefined) updateFields.notify_crm = updates.notifyCrm;
    if (updates.alertNewListing !== undefined) updateFields.alert_new_listing = updates.alertNewListing;
    if (updates.alertPriceDrop !== undefined) updateFields.alert_price_drop = updates.alertPriceDrop;
    if (updates.alertBackOnMarket !== undefined) updateFields.alert_back_on_market = updates.alertBackOnMarket;
    if (updates.alertExpiredWithdrawn !== undefined) updateFields.alert_expired_withdrawn = updates.alertExpiredWithdrawn;
    if (updates.alertPending !== undefined) updateFields.alert_pending = updates.alertPending;

    const { error } = await supabase
      .from("market_monitor_profiles")
      .update(updateFields)
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ updated: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/market-monitor/profiles?id=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await supabase
      .from("market_monitor_profiles")
      .delete()
      .eq("id", id)
      .eq("agent_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
