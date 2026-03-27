import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * DOM Prospecting Saved Searches CRUD
 *
 * GET  — List agent's saved DOM prospect searches (with latest result counts)
 * POST — Create a new saved search
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

    const { data: searches, error } = await supabase
      .from("dom_prospect_searches")
      .select("*")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get result counts for each search
    const searchesWithCounts = await Promise.all(
      (searches || []).map(async (s) => {
        const { count: redCount } = await supabase
          .from("dom_prospect_results")
          .select("*", { count: "exact", head: true })
          .eq("search_id", s.id)
          .eq("tier", "red");

        const { count: orangeCount } = await supabase
          .from("dom_prospect_results")
          .select("*", { count: "exact", head: true })
          .eq("search_id", s.id)
          .eq("tier", "orange");

        const { count: charcoalCount } = await supabase
          .from("dom_prospect_results")
          .select("*", { count: "exact", head: true })
          .eq("search_id", s.id)
          .eq("tier", "charcoal");

        return {
          ...s,
          resultCounts: {
            red: redCount || 0,
            orange: orangeCount || 0,
            charcoal: charcoalCount || 0,
            total: (redCount || 0) + (orangeCount || 0) + (charcoalCount || 0),
          },
        };
      }),
    );

    return NextResponse.json({ searches: searchesWithCounts });
  } catch (error: any) {
    console.error("[DomSearches] GET error:", error);
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

    if (!body.zipCodes?.length) {
      return NextResponse.json({ error: "zipCodes is required" }, { status: 400 });
    }

    const { data: search, error } = await supabase
      .from("dom_prospect_searches")
      .insert({
        agent_id: user.id,
        name: body.name || "DOM Prospect Search",
        zip_codes: body.zipCodes,
        red_multiplier: body.redMultiplier ?? 2.0,
        orange_multiplier: body.orangeMultiplier ?? 1.5,
        charcoal_multiplier: body.charcoalMultiplier ?? 1.15,
        property_types: body.propertyTypes || null,
        min_price: body.minPrice || null,
        max_price: body.maxPrice || null,
        is_active: true,
        notify_email: body.notifyEmail ?? true,
        next_run_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ search });
  } catch (error: any) {
    console.error("[DomSearches] POST error:", error);
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

    const searchId = request.nextUrl.searchParams.get("id");
    if (!searchId) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase.from("dom_prospect_searches").delete().eq("id", searchId).eq("agent_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DomSearches] DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
