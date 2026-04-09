import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { runBirdDogSearch, calculateNextRun, summarizeCriteria } from "@/lib/bird-dog/bird-dog-engine";

/**
 * GET /api/bird-dog/searches
 * List agent's Bird Dog saved searches with result counts
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: searches, error } = await supabase
      .from("bird_dog_searches")
      .select("*")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get result counts per search with score breakdown
    const enriched = await Promise.all(
      (searches || []).map(async (s) => {
        const { data: results } = await supabase
          .from("bird_dog_results")
          .select("lead_score")
          .eq("search_id", s.id);

        const hot = results?.filter((r) => r.lead_score === "hot").length || 0;
        const warm = results?.filter((r) => r.lead_score === "warm").length || 0;
        const cold = results?.filter((r) => r.lead_score === "cold").length || 0;

        return {
          ...s,
          criteriaSummary: summarizeCriteria(s.search_criteria),
          resultCounts: { hot, warm, cold, total: hot + warm + cold },
        };
      }),
    );

    return NextResponse.json({ searches: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/bird-dog/searches
 * Create a new Bird Dog search
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, criteria, schedule = "weekly" } = body;

    if (!name || !criteria) {
      return NextResponse.json({ error: "name and criteria are required" }, { status: 400 });
    }

    // Require at least one location filter
    if (!criteria.zip && !criteria.city && !criteria.latitude) {
      return NextResponse.json({ error: "At least one location filter (zip, city, or coordinates) is required" }, { status: 400 });
    }

    const { data: search, error } = await supabase
      .from("bird_dog_searches")
      .insert({
        agent_id: user.id,
        name,
        search_criteria: criteria,
        schedule,
        next_run_at: calculateNextRun(schedule).toISOString(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ search, criteriaSummary: summarizeCriteria(criteria) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/bird-dog/searches?id=xxx
 * Delete a Bird Dog search (cascades to results and contacts)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await supabase
      .from("bird_dog_searches")
      .delete()
      .eq("id", id)
      .eq("agent_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/bird-dog/searches
 * Update a search or trigger immediate run
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, action, ...updates } = body;

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    // "Run Now" action
    if (action === "run") {
      const summary = await runBirdDogSearch(id);
      return NextResponse.json({ summary });
    }

    // Toggle active/inactive
    if (action === "toggle") {
      const { data: current } = await supabase
        .from("bird_dog_searches")
        .select("is_active")
        .eq("id", id)
        .eq("agent_id", user.id)
        .single();

      if (!current) return NextResponse.json({ error: "Search not found" }, { status: 404 });

      const { error } = await supabase
        .from("bird_dog_searches")
        .update({ is_active: !current.is_active, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("agent_id", user.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ is_active: !current.is_active });
    }

    // General update
    const { error } = await supabase
      .from("bird_dog_searches")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("agent_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
