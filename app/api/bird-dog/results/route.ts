import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/bird-dog/results
 * List results for a Bird Dog search, filterable by score
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchId = request.nextUrl.searchParams.get("searchId");
    const score = request.nextUrl.searchParams.get("score"); // hot, warm, cold, or null for all
    const page = Number(request.nextUrl.searchParams.get("page") || "1");
    const limit = Number(request.nextUrl.searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    if (!searchId) return NextResponse.json({ error: "searchId is required" }, { status: 400 });

    let query = supabase
      .from("bird_dog_results")
      .select("*, bird_dog_contacts(id, phones, emails)", { count: "exact" })
      .eq("search_id", searchId)
      .eq("agent_id", user.id)
      .order("lead_score", { ascending: true }) // hot first (alphabetical: cold, hot, warm -- need custom)
      .order("estimated_equity", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (score) {
      query = query.eq("lead_score", score);
    }

    const { data: results, count, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Sort: hot first, then warm, then cold
    const sortOrder = { hot: 0, warm: 1, cold: 2 };
    const sorted = (results || []).sort(
      (a, b) => (sortOrder[a.lead_score as keyof typeof sortOrder] ?? 3) - (sortOrder[b.lead_score as keyof typeof sortOrder] ?? 3),
    );

    return NextResponse.json({
      results: sorted,
      total: count || 0,
      page,
      limit,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/bird-dog/results
 * Toggle star or update result
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, is_starred } = await request.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await supabase
      .from("bird_dog_results")
      .update({ is_starred })
      .eq("id", id)
      .eq("agent_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
