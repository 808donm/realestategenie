import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { calculateLiveDom } from "@/lib/prospecting/dom-search-engine";

/**
 * DOM Monitored Properties CRUD
 *
 * GET    — List agent's monitored properties (with live DOM recalculation)
 * POST   — Add a property to the monitor list
 * DELETE — Remove a property from the monitor list
 * PATCH  — Update notes, multipliers, or is_active
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: properties, error } = await supabase
      .from("dom_monitored_properties")
      .select("*")
      .eq("agent_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Recalculate live DOM for each property
    const enriched = (properties || []).map((p) => ({
      ...p,
      live_dom: calculateLiveDom(p.on_market_date, p.latest_dom),
    }));

    return NextResponse.json({ properties: enriched });
  } catch (error: any) {
    console.error("[DomMonitor] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
    if (!body.listingKey || !body.address || !body.zipCode) {
      return NextResponse.json({ error: "listingKey, address, and zipCode are required" }, { status: 400 });
    }

    const { data: property, error } = await supabase
      .from("dom_monitored_properties")
      .upsert(
        {
          agent_id: user.id,
          listing_key: body.listingKey,
          listing_id: body.listingId || null,
          address: body.address,
          city: body.city || null,
          zip_code: body.zipCode,
          property_type: body.propertyType || null,
          list_price: body.listPrice || null,
          on_market_date: body.onMarketDate || null,
          current_tier: body.currentTier || "below",
          previous_tier: "below",
          red_multiplier: body.redMultiplier ?? 2.0,
          orange_multiplier: body.orangeMultiplier ?? 1.5,
          charcoal_multiplier: body.charcoalMultiplier ?? 1.15,
          latest_list_price: body.listPrice || null,
          latest_dom: body.daysOnMarket || null,
          latest_status: "Active",
          is_active: true,
          notes: body.notes || null,
        },
        { onConflict: "agent_id,listing_key" },
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ property });
  } catch (error: any) {
    console.error("[DomMonitor] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");
    const listingKey = request.nextUrl.searchParams.get("listingKey");

    if (!id && !listingKey) {
      return NextResponse.json({ error: "id or listingKey is required" }, { status: 400 });
    }

    let query = supabase.from("dom_monitored_properties").delete().eq("agent_id", user.id);

    if (id) query = query.eq("id", id);
    else if (listingKey) query = query.eq("listing_key", listingKey);

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DomMonitor] DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.isActive !== undefined) updates.is_active = body.isActive;
    if (body.redMultiplier !== undefined) updates.red_multiplier = body.redMultiplier;
    if (body.orangeMultiplier !== undefined) updates.orange_multiplier = body.orangeMultiplier;
    if (body.charcoalMultiplier !== undefined) updates.charcoal_multiplier = body.charcoalMultiplier;

    const { data: property, error } = await supabase
      .from("dom_monitored_properties")
      .update(updates)
      .eq("id", body.id)
      .eq("agent_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ property });
  } catch (error: any) {
    console.error("[DomMonitor] PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
