import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/admin/api-usage
 *
 * Returns API call statistics for the admin dashboard.
 * Includes per-provider totals, daily trends, and active user count
 * for projection calculations.
 *
 * Query params:
 *   days — number of days to look back (default 30)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin
    const { data: agent } = await supabase
      .from("agents")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!agent?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const days = Number(request.nextUrl.searchParams.get("days")) || 30;
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

    // Total calls by provider
    const { data: byProvider } = await supabaseAdmin
      .from("api_call_log")
      .select("provider")
      .gte("created_at", since);

    const providerCounts: Record<string, number> = {};
    for (const row of byProvider || []) {
      providerCounts[row.provider] = (providerCounts[row.provider] || 0) + 1;
    }

    // Calls by provider + endpoint
    const { data: byEndpoint } = await supabaseAdmin
      .from("api_call_log")
      .select("provider, endpoint")
      .gte("created_at", since);

    const endpointCounts: Record<string, Record<string, number>> = {};
    for (const row of byEndpoint || []) {
      if (!endpointCounts[row.provider]) endpointCounts[row.provider] = {};
      endpointCounts[row.provider][row.endpoint] = (endpointCounts[row.provider][row.endpoint] || 0) + 1;
    }

    // Daily totals by provider (for trend charts)
    const { data: dailyRaw } = await supabaseAdmin
      .from("api_call_log")
      .select("provider, created_at")
      .gte("created_at", since)
      .order("created_at");

    const dailyByProvider: Record<string, Record<string, number>> = {};
    for (const row of dailyRaw || []) {
      const date = row.created_at.split("T")[0];
      if (!dailyByProvider[row.provider]) dailyByProvider[row.provider] = {};
      dailyByProvider[row.provider][date] = (dailyByProvider[row.provider][date] || 0) + 1;
    }

    // Cache hit ratio
    const { data: cacheData } = await supabaseAdmin
      .from("api_call_log")
      .select("cache_hit")
      .gte("created_at", since);

    const totalCalls = cacheData?.length || 0;
    const cacheHits = cacheData?.filter(r => r.cache_hit).length || 0;

    // Active user count
    const { count: activeUserCount } = await supabaseAdmin
      .from("agents")
      .select("*", { count: "exact", head: true })
      .eq("account_status", "active");

    // Average response time by provider
    const { data: responseTimesRaw } = await supabaseAdmin
      .from("api_call_log")
      .select("provider, response_time_ms")
      .gte("created_at", since)
      .not("response_time_ms", "is", null);

    const avgResponseByProvider: Record<string, number> = {};
    const responseGroups: Record<string, number[]> = {};
    for (const row of responseTimesRaw || []) {
      if (!responseGroups[row.provider]) responseGroups[row.provider] = [];
      responseGroups[row.provider].push(row.response_time_ms);
    }
    for (const [provider, times] of Object.entries(responseGroups)) {
      avgResponseByProvider[provider] = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    }

    return NextResponse.json({
      period: { days, since },
      activeUsers: activeUserCount || 0,
      totalCalls,
      cacheHits,
      cacheHitRate: totalCalls > 0 ? Math.round((cacheHits / totalCalls) * 100) : 0,
      byProvider: providerCounts,
      byEndpoint: endpointCounts,
      dailyByProvider,
      avgResponseByProvider,
    });
  } catch (error: any) {
    console.error("[Admin API Usage] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
