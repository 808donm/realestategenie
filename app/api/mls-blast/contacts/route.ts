import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";

/**
 * GET /api/mls-blast/contacts?q=search
 * Search CRM contacts for email blast recipient selection
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const query = request.nextUrl.searchParams.get("q") || "";
    if (!query || query.length < 2) return NextResponse.json({ contacts: [] });

    // Get agent's GHL integration
    const { data: ghlInteg } = await supabase
      .from("integrations")
      .select("config")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .eq("status", "connected")
      .maybeSingle();

    if (!ghlInteg?.config) {
      return NextResponse.json({ error: "CRM not connected" }, { status: 503 });
    }

    const config = typeof ghlInteg.config === "string" ? JSON.parse(ghlInteg.config) : ghlInteg.config;
    const ghl = new GHLClient(config.access_token, config.location_id);

    const result = await ghl.searchContacts({ email: query });
    const contacts = (result.contacts || []).map((c: any) => ({
      id: c.id,
      name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.name || "",
      email: c.email || "",
      phone: c.phone || "",
      tags: c.tags || [],
    }));

    return NextResponse.json({ contacts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
