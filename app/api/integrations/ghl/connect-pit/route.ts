import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * POST /api/integrations/ghl/connect-pit
 *
 * Connect CRM via Private Integration Token (PIT).
 *
 * Replaces the OAuth marketplace flow. The agent creates a PIT in their
 * own CRM sub-account ("Settings → Private Integrations → + Create
 * Private Integration"), pastes the resulting API key + Location ID
 * here, and we store it as a long-lived bearer token. PITs do not
 * expire, so there's no refresh token / expires_at field.
 *
 * Body: { apiKey: string, locationId: string }
 * Response: { ok: true, locationId, locationName? }
 */
export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { apiKey?: string; locationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const apiKey = (body.apiKey || "").trim();
  const locationId = (body.locationId || "").trim();

  if (!apiKey) {
    return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
  }
  if (!locationId) {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  }

  // ── Validate the PIT by calling the GHL API ──
  // GET /locations/{id} requires the locations.readonly scope, which any
  // PIT scoped to that location should have. If the token works, we know
  // the apiKey is valid AND has access to the claimed location.
  let locationName: string | undefined;
  try {
    const ghlRes = await fetch(`https://services.leadconnectorhq.com/locations/${locationId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
        Accept: "application/json",
      },
    });

    if (!ghlRes.ok) {
      const errText = await ghlRes.text().catch(() => "");
      let errMsg = `CRM rejected the API key (status ${ghlRes.status})`;
      if (ghlRes.status === 401) {
        errMsg = "CRM rejected the API key. Check that the Private Integration token is correct and not deleted.";
      } else if (ghlRes.status === 403) {
        errMsg =
          "CRM rejected the request — the Private Integration is missing the locations.readonly scope or is not scoped to this Location ID.";
      } else if (ghlRes.status === 404) {
        errMsg = "Location ID not found. Double-check the Location ID in your CRM Business Profile.";
      }
      console.warn("[GHL PIT Connect] Validation failed:", ghlRes.status, errText.slice(0, 300));
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    const data = (await ghlRes.json()) as any;
    locationName = data?.location?.name || data?.name;
  } catch (e: any) {
    return NextResponse.json(
      { error: `Could not reach CRM to validate token: ${e?.message || "network error"}` },
      { status: 502 },
    );
  }

  // ── Persist credentials ──
  // Stored under the same `config.ghl_*` keys the rest of the codebase
  // already reads. `is_pit: true` flag tells getValidGHLConfig to skip
  // the OAuth refresh path (PITs don't expire).
  const config: Record<string, any> = {
    ghl_access_token: apiKey,
    ghl_location_id: locationId,
    is_pit: true,
    connected_at: new Date().toISOString(),
  };

  // Upsert so re-connecting (e.g., agent rotated their PIT) works without
  // a separate disconnect step. The unique key is (agent_id, provider).
  // last_error: null clears any stale error from a previous failed
  // connect so the card no longer shows a red badge.
  const { error: upsertErr } = await supabase
    .from("integrations")
    .upsert(
      {
        agent_id: user.id,
        provider: "ghl",
        status: "connected",
        config,
        last_error: null,
        last_sync_at: new Date().toISOString(),
      },
      { onConflict: "agent_id,provider" },
    );

  if (upsertErr) {
    console.error("[GHL PIT Connect] DB upsert failed:", upsertErr);
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    locationId,
    locationName,
  });
}
