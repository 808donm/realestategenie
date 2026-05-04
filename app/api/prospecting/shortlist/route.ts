import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Prospecting Shortlist API
 *
 * Persistent "shopping cart" of properties the agent has cherry-picked
 * across one or more searches. Used to build a curated outreach list
 * before running a single bulk skip trace + export to power dialer.
 *
 * GET    /api/prospecting/shortlist           — list current shortlist
 * POST   /api/prospecting/shortlist           — add (or upsert) a property
 * DELETE /api/prospecting/shortlist?attomId=N — remove one property
 * DELETE /api/prospecting/shortlist?clear=1   — clear entire shortlist
 */

// ── GET: return current shortlist ──────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("prospecting_shortlist")
    .select("*")
    .eq("agent_id", user.id)
    .order("added_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = (data || []).length;
  const skipTraced = (data || []).filter((r) => r.skip_traced_at).length;

  return NextResponse.json({
    items: data || [],
    total,
    skipTraced,
    pending: total - skipTraced,
  });
}

// ── POST: add or upsert a property to the shortlist ────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { property, sourceMode } = body as { property?: any; sourceMode?: string };
  if (!property) return NextResponse.json({ error: "property is required" }, { status: 400 });

  // The frontend sends the full AttomProperty + REAPI extras. Pull out the
  // searchable fields, store the rest as snapshot JSON for later display.
  const attomId =
    property._reapi?.id || property.identifier?.attomId || property.identifier?.Id;
  if (!attomId) {
    return NextResponse.json({ error: "property has no attomId" }, { status: 400 });
  }

  const ownerName =
    property.owner?.owner1?.fullName ||
    property.owner?.owner2?.fullName ||
    property.owner?.owner3?.fullName ||
    property._reapi?.ownerName ||
    null;

  const row = {
    agent_id: user.id,
    attom_id: String(attomId),
    address: property.address?.line1 || property.address?.oneLine || null,
    city: property.address?.locality || null,
    state: property.address?.countrySubd || null,
    zip: property.address?.postal1 || null,
    property_type: property.summary?.propType || property.summary?.propSubType || null,
    owner_name: ownerName,
    source_mode: sourceMode || null,
    lead_score: property._leadScore?.score || null,
    estimated_value: property._reapi?.estimatedValue ?? property.avm?.amount?.value ?? null,
    estimated_equity: property._reapi?.estimatedEquity ?? null,
    years_owned:
      property._reapi?.ownershipLength != null
        ? Math.floor(Number(property._reapi.ownershipLength) / 12)
        : null,
    property_data: property,
  };

  const { data, error } = await supabase
    .from("prospecting_shortlist")
    .upsert(row, { onConflict: "agent_id,attom_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ item: data });
}

// ── DELETE: remove one property OR clear entire shortlist ──────────────────

export async function DELETE(req: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const attomId = params.get("attomId");
  const clear = params.get("clear") === "1";

  if (clear) {
    const { error } = await supabase.from("prospecting_shortlist").delete().eq("agent_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ cleared: true });
  }

  if (!attomId) {
    return NextResponse.json({ error: "attomId or clear=1 is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("prospecting_shortlist")
    .delete()
    .eq("agent_id", user.id)
    .eq("attom_id", attomId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ removed: attomId });
}
