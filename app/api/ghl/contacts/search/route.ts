import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";

/**
 * Search GHL contacts by name, email, or phone
 * GET /api/ghl/contacts/search?q=searchterm
 */
export async function GET(req: NextRequest) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchQuery = req.nextUrl.searchParams.get("q");

  if (!searchQuery || searchQuery.length < 2) {
    return NextResponse.json({ contacts: [] });
  }

  try {
    // Get valid GHL config (auto-refreshes token if needed)
    const ghlConfig = await getValidGHLConfig(user.id);

    if (!ghlConfig) {
      return NextResponse.json(
        { error: "GHL not connected", contacts: [] },
        { status: 200 }
      );
    }

    const client = new GHLClient(ghlConfig.access_token, ghlConfig.location_id);

    // Search contacts using GHL API
    // The GHL API uses a "query" parameter that searches across name, email, phone
    const result = await client.searchContacts({ email: searchQuery });

    // Map to simplified contact format
    const contacts = (result.contacts || []).map((contact) => ({
      id: contact.id,
      name: contact.name || `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Unknown",
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      tags: contact.tags,
    }));

    return NextResponse.json({ contacts });
  } catch (error: any) {
    console.error("GHL contact search error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed", contacts: [] },
      { status: 200 }
    );
  }
}
