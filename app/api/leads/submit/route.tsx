import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateHeatScore } from "@/lib/lead-scoring";
import { syncLeadToGHL } from "@/lib/integrations/ghl-sync";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eventId = String(body?.eventId || "");
    const payload = body?.payload;

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    // Validate event exists + is published (use the view for published-only)
    const { data: published, error: pubErr } = await admin
      .from("public_open_house_event")
      .select("id")
      .eq("id", eventId)
      .single();

    if (pubErr || !published) {
      return NextResponse.json({ error: "Event not available" }, { status: 404 });
    }

    // We also need agent_id for lead_submissions. Fetch from open_house_events directly.
    // Service role bypasses RLS so this is safe server-side.
    const { data: evt, error: evtErr } = await admin
      .from("open_house_events")
      .select("id,agent_id,address")
      .eq("id", eventId)
      .single();

    if (evtErr || !evt) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Calculate heat score
    const heatScore = calculateHeatScore(payload);

    // Insert lead
    const { data: lead, error: insErr } = await admin
      .from("lead_submissions")
      .insert({
        event_id: eventId,
        agent_id: evt.agent_id,
        payload,
        heat_score: heatScore,
        pushed_to_ghl: false,
      })
      .select()
      .single();

    if (insErr || !lead) {
      return NextResponse.json({ error: insErr?.message || "Failed to create lead" }, { status: 400 });
    }

    // Write audit record
    await admin.from("audit_log").insert({
      agent_id: evt.agent_id,
      event_id: eventId,
      action: "lead_submitted",
      details: { source: "open_house_qr", heat_score: heatScore },
    });

    // Trigger async integrations (non-blocking)
    Promise.all([
      // Sync to GHL
      syncLeadToGHL(lead.id).catch((err) =>
        console.error("GHL sync failed:", err)
      ),
      // Dispatch webhook for lead.submitted
      dispatchWebhook(evt.agent_id, "lead.submitted", {
        lead_id: lead.id,
        event_id: eventId,
        property_address: evt.address,
        heat_score: heatScore,
        payload,
      }).catch((err) => console.error("Webhook dispatch failed:", err)),
      // If hot lead, dispatch lead.hot_scored webhook
      heatScore >= 80
        ? dispatchWebhook(evt.agent_id, "lead.hot_scored", {
            lead_id: lead.id,
            event_id: eventId,
            property_address: evt.address,
            heat_score: heatScore,
            payload,
          }).catch((err) => console.error("Hot lead webhook failed:", err))
        : Promise.resolve(),
    ]).catch((err) => console.error("Integration errors:", err));

    return NextResponse.json({ ok: true, heat_score: heatScore });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
