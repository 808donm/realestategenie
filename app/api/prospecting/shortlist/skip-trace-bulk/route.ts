import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getReapiClient, mapReapiSkipTrace } from "@/lib/integrations/reapi-client";
import { logSkipTraceUsage } from "@/lib/billing/skip-trace-billing";

/**
 * POST /api/prospecting/shortlist/skip-trace-bulk
 *
 * Runs skip trace on every shortlist row that hasn't been traced yet.
 * Each call is metered (~$0.05 with REAPI). The result is written back
 * to prospecting_shortlist so the export endpoint can join phones /
 * emails into the XLSX without re-running.
 *
 * Returns the updated counts: { traced, alreadyTraced, failed, total }.
 */
export async function POST(_req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const reapi = getReapiClient();
    if (!reapi) {
      return NextResponse.json({ error: "Property data API not configured" }, { status: 503 });
    }

    // Pull every untraced row in this agent's shortlist.
    const { data: rows, error } = await supabase
      .from("prospecting_shortlist")
      .select("*")
      .eq("agent_id", user.id)
      .is("skip_traced_at", null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!rows || rows.length === 0) {
      return NextResponse.json({ traced: 0, alreadyTraced: 0, failed: 0, total: 0 });
    }

    let traced = 0;
    let failed = 0;

    // Skip trace in small parallel batches to balance throughput vs respect
    // for the REAPI rate limit. 5 concurrent is conservative.
    const BATCH_SIZE = 5;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (row) => {
          const skipParams: any = {};
          if (row.address) skipParams.address = row.address;
          if (row.city) skipParams.city = row.city;
          if (row.state) skipParams.state = row.state;
          if (row.zip) skipParams.zip = row.zip;
          if (row.owner_name) {
            const parts = row.owner_name.split(/\s+/);
            if (parts.length >= 2) {
              skipParams.first_name = parts[0];
              skipParams.last_name = parts[parts.length - 1];
            }
          }

          const raw = (await reapi.skipTrace(skipParams)) as any;
          const persons = raw?.persons || raw?.data || [];
          const personArray = Array.isArray(persons) ? persons : [persons];
          const mapped = personArray.length > 0 ? mapReapiSkipTrace(personArray[0]) : null;

          return { row, mapped, raw };
        }),
      );

      // Persist each successful trace.
      for (const r of results) {
        if (r.status === "rejected") {
          failed++;
          continue;
        }
        const { row, mapped, raw } = r.value;
        if (!mapped) {
          // Mark as traced even with no match so we don't re-pay next time.
          await supabase
            .from("prospecting_shortlist")
            .update({
              skip_traced_at: new Date().toISOString(),
              skip_trace_phones: [],
              skip_trace_emails: [],
              skip_trace_data: { matched: false, raw },
            })
            .eq("id", row.id);
          traced++;
          // Bill the call regardless of match — REAPI charges for the lookup.
          logSkipTraceUsage({
            agentId: user.id,
            address: row.address,
            ownerName: row.owner_name,
            source: "manual",
            cached: false,
          }).catch(() => {});
          continue;
        }

        await supabase
          .from("prospecting_shortlist")
          .update({
            skip_traced_at: new Date().toISOString(),
            skip_trace_phones: mapped.phones || [],
            skip_trace_emails: mapped.emails || [],
            skip_trace_data: mapped,
          })
          .eq("id", row.id);
        traced++;
        logSkipTraceUsage({
          agentId: user.id,
          address: row.address,
          ownerName: row.owner_name,
          source: "manual",
          cached: false,
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      traced,
      failed,
      total: rows.length,
    });
  } catch (error: any) {
    console.error("[Shortlist Skip Trace] Error:", error);
    return NextResponse.json({ error: error.message || "Skip trace failed" }, { status: 500 });
  }
}
