import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrestleClient, updateTrestleSyncTime } from "@/lib/mls/trestle-helpers";
import { matchLeadsToListings, type LeadCriteria } from "@/lib/mls/matching-engine";

/**
 * GET /api/mls/lead-matches
 *
 * Feature 2: Smart Lead-to-Listing Matching
 *
 * Runs the matching engine against all active pipeline leads
 * and current MLS inventory. Returns scored matches.
 *
 * Query params:
 *   ?leadId=xxx - Only match a specific lead
 *   ?save=true  - Persist matches to lead_listing_matches table
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getTrestleClient(supabase, user.id);
    if (!client) {
      return NextResponse.json({ error: "Trestle MLS not connected" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const specificLeadId = searchParams.get("leadId");
    const shouldSave = searchParams.get("save") === "true";

    // 1. Fetch pipeline leads
    let leadQuery = supabase
      .from("lead_submissions")
      .select("id, payload, heat_score, pipeline_stage, event_id")
      .eq("agent_id", user.id)
      .not("pipeline_stage", "in", '("closed_and_followup","review_request")');

    if (specificLeadId) {
      leadQuery = leadQuery.eq("id", specificLeadId);
    }

    const { data: leads } = await leadQuery;

    if (!leads || leads.length === 0) {
      return NextResponse.json({ matches: [], message: "No active pipeline leads" });
    }

    // 2. Build lead criteria
    const leadCriteria: LeadCriteria[] = leads.map((l) => ({
      leadId: l.id,
      name: l.payload?.name || "Unknown",
      neighborhoods: l.payload?.neighborhoods || null,
      mustHaves: l.payload?.must_haves || null,
      timeline: l.payload?.timeline || null,
      financing: l.payload?.financing || null,
      heatScore: l.heat_score,
      pipelineStage: l.pipeline_stage,
    }));

    // 3. Fetch active MLS listings
    // Use the lead neighborhoods to determine search areas
    const allNeighborhoods = new Set<string>();
    leadCriteria.forEach((l) => {
      if (l.neighborhoods) {
        l.neighborhoods.split(/[,;]+/).forEach((n) => {
          const trimmed = n.trim();
          if (trimmed.length > 1) allNeighborhoods.add(trimmed);
        });
      }
    });

    // Get listings from Trestle — search by city/zip or get recent active
    let allListings: import("@/lib/integrations/trestle-client").TrestleProperty[] = [];

    if (allNeighborhoods.size > 0) {
      // Search each unique area
      const areas = [...allNeighborhoods].slice(0, 5); // Limit to 5 areas
      const results = await Promise.all(
        areas.map((area) => {
          // Check if it looks like a zip code
          const isZip = /^\d{5}$/.test(area);
          return client.searchProperties({
            status: ["Active"],
            postalCode: isZip ? area : undefined,
            city: isZip ? undefined : area,
            limit: 50,
            includeMedia: true,
            skipCount: true,
          });
        })
      );
      // Deduplicate by ListingKey
      const seen = new Set<string>();
      for (const r of results) {
        for (const p of r.value) {
          if (!seen.has(p.ListingKey)) {
            seen.add(p.ListingKey);
            allListings.push(p);
          }
        }
      }
    } else {
      // No neighborhood preferences — get latest active listings
      const result = await client.searchProperties({
        status: ["Active"],
        limit: 100,
        includeMedia: true,
        skipCount: true,
      });
      allListings = result.value;
    }

    // 4. Run matching engine
    const matches = matchLeadsToListings(leadCriteria, allListings, 5, 20);

    // 5. Optionally persist matches
    if (shouldSave && matches.length > 0) {
      const rows = matches.map((m) => ({
        lead_id: m.leadId,
        agent_id: user.id,
        listing_key: m.listingKey,
        listing_id: m.listingId,
        address: `${m.address}, ${m.city}`,
        city: m.city,
        postal_code: m.postalCode,
        list_price: m.listPrice,
        bedrooms: m.bedrooms,
        bathrooms: m.bathrooms,
        living_area: m.livingArea,
        property_type: m.propertyType,
        match_score: m.matchScore,
        match_reasons: m.matchReasons,
        status: "new",
      }));

      await supabase.from("lead_listing_matches").insert(rows);
    }

    await updateTrestleSyncTime(supabase, user.id);

    return NextResponse.json({
      matches,
      totalLeads: leadCriteria.length,
      totalListings: allListings.length,
      matchCount: matches.length,
    });
  } catch (error) {
    console.error("Error running lead-listing matching:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Matching failed" },
      { status: 500 }
    );
  }
}
