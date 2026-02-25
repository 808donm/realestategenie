import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrestleClient, updateTrestleSyncTime } from "@/lib/mls/trestle-helpers";
import { pullOpenHousesFromMLS, getUnsyncedLocalEvents } from "@/lib/mls/open-house-sync";

/**
 * POST /api/mls/sync-open-houses
 *
 * Feature 4: Bi-Directional Open House Schedule Sync
 *
 * Pull: Import open houses from MLS into the app (as draft events).
 * Push: List local events that could be pushed to MLS.
 *
 * Body: {
 *   direction: "pull" | "push" | "both"
 *   daysAhead?: number (default 30)
 *   listingKey?: string (optional - sync for specific listing only)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const direction = body.direction || "pull";
    const daysAhead = body.daysAhead || 30;
    const listingKey = body.listingKey;

    const client = await getTrestleClient(supabase, user.id);
    if (!client) {
      return NextResponse.json({ error: "Trestle MLS not connected" }, { status: 400 });
    }

    const response: {
      pull?: Awaited<ReturnType<typeof pullOpenHousesFromMLS>>;
      push?: { unsyncedCount: number; events: Awaited<ReturnType<typeof getUnsyncedLocalEvents>> };
    } = {};

    if (direction === "pull" || direction === "both") {
      response.pull = await pullOpenHousesFromMLS(client, supabase, user.id, {
        daysAhead,
        listingKey,
      });
    }

    if (direction === "push" || direction === "both") {
      const unsynced = await getUnsyncedLocalEvents(supabase, user.id);
      response.push = {
        unsyncedCount: unsynced.length,
        events: unsynced,
      };
    }

    await updateTrestleSyncTime(supabase, user.id);

    return NextResponse.json({ success: true, ...response });
  } catch (error) {
    console.error("Error syncing open houses:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mls/sync-open-houses - Get sync status
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Count synced vs unsynced events
    const { data: allEvents } = await supabase
      .from("open_house_events")
      .select("id, mls_open_house_key, mls_synced_at, mls_source, status, address, start_at")
      .eq("agent_id", user.id)
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true });

    const events = allEvents || [];
    const synced = events.filter((e) => e.mls_open_house_key);
    const local = events.filter((e) => !e.mls_open_house_key && e.status === "published");

    // Get last sync time
    const { data: integration } = await supabase
      .from("integrations")
      .select("last_sync_at")
      .eq("agent_id", user.id)
      .eq("provider", "trestle")
      .maybeSingle();

    return NextResponse.json({
      totalUpcoming: events.length,
      syncedFromMLS: synced.length,
      localOnly: local.length,
      lastSyncAt: integration?.last_sync_at || null,
      events: events.map((e) => ({
        id: e.id,
        address: e.address,
        startAt: e.start_at,
        isSynced: !!e.mls_open_house_key,
        source: e.mls_source || "local",
        status: e.status,
      })),
    });
  } catch (error) {
    console.error("Error getting sync status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get status" },
      { status: 500 }
    );
  }
}
