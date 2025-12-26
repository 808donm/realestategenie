import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * PM Properties API
 *
 * GET: List all properties for agent
 * POST: Create new property
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: properties, error } = await supabase
      .from("pm_properties")
      .select("*")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching properties:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ properties });
  } catch (error) {
    console.error("Error in properties GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      address,
      city,
      state_province,
      zip_postal_code,
      property_type,
      units_count,
      monthly_rent,
      security_deposit,
      pet_deposit,
      pet_policy,
      amenities,
      property_photo_url,
      status,
    } = body;

    // Validation
    if (!address || !city || !state_province) {
      return NextResponse.json(
        { error: "Address, city, and state are required" },
        { status: 400 }
      );
    }

    if (!property_type || !["single_family", "condo", "townhome", "duplex", "multi_unit"].includes(property_type)) {
      return NextResponse.json(
        { error: "Invalid property type" },
        { status: 400 }
      );
    }

    if (!status || !["available", "rented", "maintenance", "unavailable"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Create property
    const { data: property, error: insertError } = await supabase
      .from("pm_properties")
      .insert({
        agent_id: user.id,
        address,
        city,
        state_province,
        zip_postal_code,
        property_type,
        units_count: units_count || 1,
        monthly_rent,
        security_deposit,
        pet_deposit,
        pet_policy,
        amenities,
        property_photo_url,
        status,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating property:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    console.error("Error in properties POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
