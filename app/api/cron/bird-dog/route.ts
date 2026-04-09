import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runBirdDogSearch } from "@/lib/bird-dog/bird-dog-engine";

/**
 * GET /api/cron/bird-dog
 *
 * Runs Bird Dog searches that are due. Called by:
 * - Daily briefing cron (daily searches)
 * - DOM prospect refresh cron (weekly/monthly searches)
 * - Manual trigger from admin
 *
 * Processes up to 5 searches per invocation to stay within
 * Vercel's 60-second timeout.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret or internal call
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isInternal = request.headers.get("x-internal-call") === "true";

    if (!isInternal && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, key, { auth: { persistSession: false } });

    // Optional schedule filter (e.g., ?schedule=daily)
    const scheduleFilter = request.nextUrl.searchParams.get("schedule");

    // Find active searches that are due to run
    let query = admin
      .from("bird_dog_searches")
      .select("id, name, schedule, agent_id")
      .eq("is_active", true)
      .lte("next_run_at", new Date().toISOString())
      .order("next_run_at", { ascending: true })
      .limit(5); // Max 5 per invocation

    if (scheduleFilter) {
      query = query.eq("schedule", scheduleFilter);
    }

    const { data: dueSearches, error } = await query;

    if (error) {
      console.error("[BirdDog Cron] Query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!dueSearches || dueSearches.length === 0) {
      console.log("[BirdDog Cron] No searches due to run");
      return NextResponse.json({ processed: 0, message: "No searches due" });
    }

    console.log(`[BirdDog Cron] Processing ${dueSearches.length} searches`);

    const summaries = [];
    for (const search of dueSearches) {
      try {
        const summary = await runBirdDogSearch(search.id);
        summaries.push(summary);
        console.log(`[BirdDog Cron] ${search.name}: ${summary.newIds} new (${summary.hot} HOT, ${summary.warm} WARM, ${summary.cold} COLD)`);
      } catch (err: any) {
        console.error(`[BirdDog Cron] Failed: ${search.name}:`, err.message);
        summaries.push({ searchId: search.id, searchName: search.name, errors: [err.message], totalIds: 0, newIds: 0, detailsFetched: 0, hot: 0, warm: 0, cold: 0 });
      }
    }

    const totalNew = summaries.reduce((s, r) => s + r.newIds, 0);
    const totalHot = summaries.reduce((s, r) => s + r.hot, 0);

    return NextResponse.json({
      processed: summaries.length,
      totalNew,
      totalHot,
      summaries,
    });
  } catch (error: any) {
    console.error("[BirdDog Cron] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
