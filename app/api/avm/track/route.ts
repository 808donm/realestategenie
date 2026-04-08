import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/avm/track
 *
 * Records a Genie AVM prediction for accuracy tracking.
 * Called silently in the background whenever a property's AVM is computed.
 * Data is stored in avm_sale_outcomes for admin reporting.
 *
 * When a listing eventually closes, the MLS watchdog can compare
 * our prediction to the actual sale price.
 */
export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ ok: true });

    const body = await request.json();
    const {
      address,
      genieAvm,
      genieAvmConfidence,
      listPrice,
      propertyType,
      zipCode,
      beds,
      baths,
      sqft,
      yearBuilt,
      subdivision,
    } = body;

    if (!address || !genieAvm || !zipCode) {
      return NextResponse.json({ ok: true }); // Silently skip incomplete data
    }

    const { createHash } = await import("crypto");
    const addressHash = createHash("md5")
      .update(address.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40))
      .digest("hex");

    const sb = createClient(url, key, { auth: { persistSession: false } });

    // Upsert into a predictions tracking table
    // We use avm_sale_outcomes with sale_price = 0 to indicate "prediction only, no close yet"
    // When the listing closes, the watchdog updates sale_price and computes error_pct
    await sb.from("avm_sale_outcomes").upsert(
      {
        address,
        address_hash: addressHash,
        genie_avm: Math.round(genieAvm),
        genie_avm_confidence: genieAvmConfidence,
        list_price: listPrice ? Math.round(listPrice) : null,
        sale_price: 0, // 0 = prediction only, updated when listing closes
        close_date: new Date().toISOString().split("T")[0],
        error_pct: null,
        abs_error_pct: null,
        property_type: propertyType,
        zip_code: zipCode,
        beds: beds || null,
        baths: baths || null,
        sqft: sqft || null,
        year_built: yearBuilt || null,
        subdivision: subdivision || null,
      },
      { onConflict: "address_hash,close_date" },
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Never fail -- this is fire-and-forget
  }
}
