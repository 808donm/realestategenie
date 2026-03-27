import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/seller-map/saved-searches — List saved searches
 * POST /api/seller-map/saved-searches — Create a saved search
 * DELETE /api/seller-map/saved-searches?id=UUID — Delete a saved search
 */

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("seller_map_saved_searches")
      .select("*")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false });

    // Table may not exist yet — return empty rather than 500
    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn("[SavedSearches] Table not found — run migration 20260310300000");
        return NextResponse.json({ searches: [] });
      }
      throw error;
    }
    return NextResponse.json({ searches: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, center_lat, center_lng, radius_miles, filters } = body;

    if (!name?.trim() || center_lat == null || center_lng == null) {
      return NextResponse.json({ error: "name, center_lat, center_lng are required" }, { status: 400 });
    }

    // Get team_id from agents table
    const { data: agent } = await supabase.from("agents").select("team_id").eq("id", user.id).single();

    const { data, error } = await supabase
      .from("seller_map_saved_searches")
      .insert({
        agent_id: user.id,
        team_id: agent?.team_id || null,
        name: name.trim(),
        center_lat,
        center_lng,
        radius_miles: radius_miles || 2,
        filters: filters || {},
      })
      .select()
      .single();

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json(
          { error: "Saved searches not available — run migration 20260310300000" },
          { status: 503 },
        );
      }
      throw error;
    }
    return NextResponse.json({ search: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await supabase.from("seller_map_saved_searches").delete().eq("id", id).eq("agent_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
