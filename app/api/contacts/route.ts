import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient, type GHLContact } from "@/lib/integrations/ghl-client";
import { refreshGHLToken } from "@/lib/integrations/ghl-token-refresh";

// GET - Fetch contacts from GHL
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get search query from URL params
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "100");

    // Get GHL integration
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: "GHL integration not found. Please connect GoHighLevel first." },
        { status: 404 }
      );
    }

    // Refresh token if needed
    const refreshedIntegration = await refreshGHLToken(integration, supabase);
    const config = refreshedIntegration.config as Record<string, string>;

    if (!config.ghl_access_token || !config.ghl_location_id) {
      return NextResponse.json(
        { error: "GHL not properly configured" },
        { status: 400 }
      );
    }

    const client = new GHLClient(config.ghl_access_token, config.ghl_location_id);

    // Fetch contacts from GHL
    // GHL API: GET /contacts with locationId and optional query
    const params = new URLSearchParams();
    params.append("locationId", config.ghl_location_id);
    params.append("limit", limit.toString());
    if (search) {
      params.append("query", search);
    }

    const response = await fetch(
      `https://services.leadconnectorhq.com/contacts?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.ghl_access_token}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GHL API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch contacts from GHL" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const contacts: GHLContact[] = data.contacts || [];

    // Sort alphabetically by name or lastName
    contacts.sort((a, b) => {
      const nameA = (a.name || `${a.firstName || ""} ${a.lastName || ""}`).toLowerCase().trim();
      const nameB = (b.name || `${b.firstName || ""} ${b.lastName || ""}`).toLowerCase().trim();
      return nameA.localeCompare(nameB);
    });

    return NextResponse.json({ contacts, total: data.total || contacts.length });
  } catch (error: unknown) {
    console.error("Contacts API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new contact in GHL
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, email, phone, address1, city, state, postalCode, tags } = body;

    if (!firstName && !lastName && !email && !phone) {
      return NextResponse.json(
        { error: "At least one of firstName, lastName, email, or phone is required" },
        { status: 400 }
      );
    }

    // Get GHL integration
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: "GHL integration not found. Please connect GoHighLevel first." },
        { status: 404 }
      );
    }

    // Refresh token if needed
    const refreshedIntegration = await refreshGHLToken(integration, supabase);
    const config = refreshedIntegration.config as Record<string, string>;

    if (!config.ghl_access_token || !config.ghl_location_id) {
      return NextResponse.json(
        { error: "GHL not properly configured" },
        { status: 400 }
      );
    }

    const client = new GHLClient(config.ghl_access_token, config.ghl_location_id);

    // Create contact in GHL
    const newContact: GHLContact = {
      locationId: config.ghl_location_id,
      firstName,
      lastName,
      email,
      phone,
      address1,
      city,
      state,
      postalCode,
      tags: tags || [],
      source: "Real Estate Genie",
    };

    const createdContact = await client.createContact(newContact);

    return NextResponse.json({ contact: createdContact });
  } catch (error: unknown) {
    console.error("Create contact error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create contact" },
      { status: 500 }
    );
  }
}
