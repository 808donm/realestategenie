import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";

/**
 * POST /api/mls/agent-leaderboard/export-crm
 *
 * Export leaderboard agents to CRM as contacts with tags.
 * Tags: rank tier, office name, "MLS Agent", property type focus.
 *
 * Body: { agents: [{ name, email, phone, office, rank, totalSales, topPropertyType }] }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const agents: any[] = body.agents || [];

    if (agents.length === 0) return NextResponse.json({ error: "No agents to export" }, { status: 400 });

    // Get GHL integration
    const { data: ghlInteg } = await supabase
      .from("integrations")
      .select("config")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .eq("status", "connected")
      .maybeSingle();

    if (!ghlInteg?.config) {
      return NextResponse.json({ error: "CRM not connected. Go to Settings > Integrations to connect." }, { status: 503 });
    }

    const config = typeof ghlInteg.config === "string" ? JSON.parse(ghlInteg.config) : ghlInteg.config;
    const ghl = new GHLClient(config.access_token, config.location_id);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const agent of agents) {
      try {
        if (!agent.email && !agent.phone) {
          skipped++;
          continue;
        }

        // Build tags
        const tags: string[] = ["MLS Agent"];

        // Rank tier
        if (agent.rank <= 10) tags.push("Top 10 Agent");
        else if (agent.rank <= 25) tags.push("Top 25 Agent");
        else if (agent.rank <= 50) tags.push("Top 50 Agent");
        else if (agent.rank <= 100) tags.push("Top 100 Agent");
        else tags.push("Top 250 Agent");

        // Office
        if (agent.office) tags.push(`Office: ${agent.office}`);

        // Property type focus
        if (agent.topPropertyType) tags.push(`Focus: ${agent.topPropertyType}`);

        // Parse name
        const nameParts = (agent.name || "").trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        // Check if contact already exists
        let existingId: string | null = null;
        if (agent.email) {
          try {
            const searchResult = await ghl.searchContacts({ email: agent.email });
            if (searchResult.contacts?.length > 0) {
              existingId = searchResult.contacts[0].id || null;
            }
          } catch { /* not found */ }
        }

        if (existingId) {
          // Update existing contact and add tags
          await ghl.addTags(existingId, tags);
          updated++;
        } else {
          // Create new contact
          const newContact = await ghl.createContact({
            locationId: config.location_id,
            firstName,
            lastName,
            email: agent.email || undefined,
            phone: agent.phone || undefined,
            tags,
            source: "MLS Agent Leaderboard",
          });

          if (newContact.id) {
            created++;
          }
        }

        // Rate limit: 200ms between calls
        await new Promise((r) => setTimeout(r, 200));
      } catch (err: any) {
        errors.push(`${agent.name}: ${err.message}`);
        if (errors.length >= 5) break; // Stop after 5 errors
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped,
      total: agents.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("[LeaderboardCRM] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
