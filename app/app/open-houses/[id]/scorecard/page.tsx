import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import ScorecardClient from "./scorecard.client";

export default async function OpenHouseScorecardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  // Get event details
  const { data: event, error: eventErr } = await supabase
    .from("open_house_events")
    .select("id,address,start_at,end_at,status")
    .eq("id", id)
    .single();

  if (eventErr || !event) {
    return (
      <div style={{ padding: 24, color: "crimson" }}>
        {eventErr?.message ?? "Open house not found"}
      </div>
    );
  }

  // Get all leads for this event with contact info
  // Try with contact columns first, fall back to basic columns if they don't exist
  let leads;
  let contactTrackingEnabled = true;

  const { data: leadsWithContact, error: leadsErr } = await supabase
    .from("lead_submissions")
    .select("id,created_at,payload,contacted_at,contact_method,contact_notes")
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  if (leadsErr?.message?.includes("contacted_at") || leadsErr?.message?.includes("does not exist")) {
    // Contact columns don't exist yet, fetch without them
    contactTrackingEnabled = false;
    const { data: basicLeads, error: basicErr } = await supabase
      .from("lead_submissions")
      .select("id,created_at,payload")
      .eq("event_id", id)
      .order("created_at", { ascending: true });

    if (basicErr) {
      return (
        <div style={{ padding: 24, color: "crimson" }}>
          Error loading leads: {basicErr.message}
        </div>
      );
    }
    // Add null contact fields to match expected shape
    leads = (basicLeads ?? []).map(l => ({
      ...l,
      contacted_at: null,
      contact_method: null,
      contact_notes: null,
    }));
  } else if (leadsErr) {
    return (
      <div style={{ padding: 24, color: "crimson" }}>
        Error loading leads: {leadsErr.message}
      </div>
    );
  } else {
    leads = leadsWithContact;
  }

  return (
    <div style={{ maxWidth: 1000, margin: "40px auto", padding: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Link
            href={`/app/open-houses/${id}`}
            style={{ fontSize: 14, opacity: 0.7 }}
          >
            &larr; Back to Open House
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 0 0" }}>
            Open House Scorecard
          </h1>
          <p style={{ opacity: 0.75, marginTop: 4 }}>{event.address}</p>
          <p style={{ opacity: 0.6, fontSize: 14 }}>
            {new Date(event.start_at).toLocaleDateString()} {new Date(event.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href={`/app/open-houses/${id}/attendees`}>View Attendees</Link>
          <Link href="/app/open-houses">All Open Houses</Link>
        </div>
      </div>

      <ScorecardClient eventId={id} leads={leads ?? []} contactTrackingEnabled={contactTrackingEnabled} />
    </div>
  );
}
