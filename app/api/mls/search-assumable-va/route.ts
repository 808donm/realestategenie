import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMlsClient, updateMlsSyncTime } from "@/lib/mls/provider-factory";
import { searchAssumableVa } from "@/lib/mls/search-assumable-va";

/**
 * GET /api/mls/search-assumable-va
 *
 * Returns active listings where the buyer can potentially assume an existing
 * VA mortgage from the seller. Three-tier confidence:
 *   - tier1Explicit: AssumableYN=true AND ListingTerms includes 'VA'
 *   - tier2Remarks: PublicRemarks mentions VA + assumable
 *   - tier3Unspecified: AssumableYN=true but loan type unclear
 *
 * Query params (all optional, but at least one geographic narrowing recommended):
 *   city            — case-insensitive substring match
 *   zip             — startswith match
 *   minPrice        — integer
 *   maxPrice        — integer
 *   minBeds         — integer
 *   limit           — per-tier max (default 50, max 250)
 *   provider        — explicit MLS provider override ("trestle" | "rmls")
 *
 * Auth: agent must be signed in and have an active MLS connection (via
 * getMlsClient). Returns 401 if not authed, 503 if MLS not connected.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = request.nextUrl.searchParams;
    const providerOverride = params.get("provider") as "trestle" | "rmls" | null;

    const client = await getMlsClient(supabase, user.id, providerOverride ? { provider: providerOverride } : undefined);
    if (!client) {
      return NextResponse.json(
        { error: "No MLS integration connected for this agent." },
        { status: 503 },
      );
    }

    const cityRaw = params.get("city")?.trim();
    const zipRaw = params.get("zip")?.trim();
    const minPriceRaw = params.get("minPrice");
    const maxPriceRaw = params.get("maxPrice");
    const minBedsRaw = params.get("minBeds");
    const limitRaw = params.get("limit");

    const result = await searchAssumableVa(client, {
      city: cityRaw || undefined,
      postalCode: zipRaw || undefined,
      minPrice: minPriceRaw ? Number(minPriceRaw) : undefined,
      maxPrice: maxPriceRaw ? Number(maxPriceRaw) : undefined,
      minBeds: minBedsRaw ? Number(minBedsRaw) : undefined,
      limit: limitRaw ? Number(limitRaw) : undefined,
    });

    // Fire-and-forget last_sync_at bump on the active provider.
    void updateMlsSyncTime(supabase, user.id, client.provider);

    return NextResponse.json({
      provider: client.provider,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[search-assumable-va] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
