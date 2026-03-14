import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchTerm = `%${q}%`;

  // Search leads
  const { data: leads } = await supabase
    .from("lead_submissions")
    .select("id, event_id, payload, heat_score, pipeline_stage, created_at")
    .eq("agent_id", user.id)
    .or(`payload->>name.ilike.${searchTerm},payload->>email.ilike.${searchTerm},payload->>phone_e164.ilike.${searchTerm}`)
    .order("created_at", { ascending: false })
    .limit(5);

  // Search open house events
  const { data: events } = await supabase
    .from("open_house_events")
    .select("id, address, start_at, status")
    .eq("agent_id", user.id)
    .ilike("address", searchTerm)
    .order("created_at", { ascending: false })
    .limit(5);

  // Search contacts (GHL) - use existing endpoint pattern
  // We'll search contacts via the GHL contacts search API if available
  let contacts: any[] = [];
  try {
    // Try internal GHL contact search
    const contactRes = await fetch(`${req.nextUrl.origin}/api/ghl/contacts/search?q=${encodeURIComponent(q)}`, {
      headers: { cookie: req.headers.get("cookie") || "" },
    });
    if (contactRes.ok) {
      const contactData = await contactRes.json();
      contacts = (contactData.contacts || []).slice(0, 5);
    }
  } catch {
    // GHL not connected - skip contacts
  }

  const results = [
    ...(leads || []).map((l: any) => ({
      type: "lead" as const,
      id: l.id,
      title: l.payload?.name || "Unknown Lead",
      subtitle: l.payload?.email || l.payload?.phone_e164 || "",
      href: "/app/leads",
      meta: `Score: ${l.heat_score}`,
    })),
    ...(events || []).map((e: any) => ({
      type: "listing" as const,
      id: e.id,
      title: e.address,
      subtitle: new Date(e.start_at).toLocaleDateString(),
      href: `/app/open-houses/${e.id}`,
      meta: e.status,
    })),
    ...contacts.map((c: any) => ({
      type: "contact" as const,
      id: c.id,
      title: c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim(),
      subtitle: c.email || c.phone || "",
      href: `/app/contacts/${c.id}`,
      meta: "Contact",
    })),
  ];

  return NextResponse.json({ results });
}
