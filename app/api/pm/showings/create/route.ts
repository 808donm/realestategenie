import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pm_property_id, start_at, end_at, notes, status } = await request.json();

    // Validate required fields
    if (!pm_property_id || !start_at || !end_at) {
      return NextResponse.json(
        { error: "Property ID, start time, and end time are required" },
        { status: 400 }
      );
    }

    // Validate property belongs to agent
    const { data: property, error: propertyError } = await supabase
      .from("pm_properties")
      .select("id")
      .eq("id", pm_property_id)
      .eq("agent_id", user.id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: "Property not found or access denied" },
        { status: 404 }
      );
    }

    // Create showing
    const { data: showing, error: showingError } = await supabase
      .from("pm_showings")
      .insert({
        agent_id: user.id,
        pm_property_id,
        start_at,
        end_at,
        notes,
        status: status || "published",
      })
      .select("id")
      .single();

    if (showingError) {
      console.error("Error creating showing:", showingError);
      return NextResponse.json(
        { error: "Failed to create showing" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        showing_id: showing.id,
        message: "Showing created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in showing creation:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
