import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/mls/listings — list agent's own listings
 * POST /api/mls/listings — create a new listing
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status"); // optional filter
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = supabase
      .from("agent_listings")
      .select("*", { count: "exact" })
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "All") {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ listings: data || [], totalCount: count || 0 });
  } catch (err) {
    console.error("Error fetching listings:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch listings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Required fields
    if (!body.city || !body.postal_code || !body.list_price) {
      return NextResponse.json(
        { error: "City, postal code, and list price are required" },
        { status: 400 }
      );
    }

    // Build unparsed address
    const addressParts = [body.street_number, body.street_name, body.street_suffix].filter(Boolean);
    const unparsed = addressParts.length > 0
      ? `${addressParts.join(" ")}${body.unit_number ? ` #${body.unit_number}` : ""}, ${body.city}, ${body.state_or_province || "NJ"} ${body.postal_code}`
      : `${body.city}, ${body.state_or_province || "NJ"} ${body.postal_code}`;

    const listing = {
      user_id: userData.user.id,
      status: body.status || "Draft",
      street_number: body.street_number || null,
      street_name: body.street_name || null,
      street_suffix: body.street_suffix || null,
      unit_number: body.unit_number || null,
      city: body.city,
      state_or_province: body.state_or_province || "NJ",
      postal_code: body.postal_code,
      country: body.country || "US",
      unparsed_address: unparsed,
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      property_type: body.property_type || "Residential",
      property_sub_type: body.property_sub_type || null,
      bedrooms_total: body.bedrooms_total || null,
      bathrooms_total: body.bathrooms_total || null,
      living_area: body.living_area || null,
      lot_size_area: body.lot_size_area || null,
      year_built: body.year_built || null,
      stories: body.stories || null,
      garage_spaces: body.garage_spaces || null,
      parking_total: body.parking_total || null,
      list_price: body.list_price,
      original_list_price: body.original_list_price || body.list_price,
      close_price: body.close_price || null,
      public_remarks: body.public_remarks || null,
      private_remarks: body.private_remarks || null,
      list_agent_name: body.list_agent_name || null,
      list_agent_email: body.list_agent_email || null,
      list_agent_phone: body.list_agent_phone || null,
      list_office_name: body.list_office_name || null,
      on_market_date: body.on_market_date || null,
      listing_contract_date: body.listing_contract_date || null,
      close_date: body.close_date || null,
      expiration_date: body.expiration_date || null,
      interior_features: body.interior_features || [],
      exterior_features: body.exterior_features || [],
      appliances: body.appliances || [],
      heating: body.heating || [],
      cooling: body.cooling || [],
      photos: body.photos || [],
    };

    const { data, error } = await supabase
      .from("agent_listings")
      .insert(listing)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ listing: data }, { status: 201 });
  } catch (err) {
    console.error("Error creating listing:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create listing" },
      { status: 500 }
    );
  }
}
