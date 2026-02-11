import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the open house to verify ownership
    const { data: event, error: fetchError } = await supabase
      .from("open_house_events")
      .select("agent_id")
      .eq("id", id)
      .single();

    if (fetchError || !event) {
      return NextResponse.json({ error: "Open house not found" }, { status: 404 });
    }

    if (event.agent_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const {
      beds,
      baths,
      sqft,
      price,
      listing_description,
      key_features,
    } = body;

    console.log('[Property Details] Update request:', {
      eventId: id,
      beds,
      baths,
      sqft,
      price,
      priceType: typeof price,
      hasDescription: !!listing_description,
      featuresCount: key_features?.length || 0,
    });

    // Update property details
    const { error: updateError } = await supabase
      .from("open_house_events")
      .update({
        beds,
        baths,
        sqft,
        price,
        listing_description,
        key_features,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update property details", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Property details update error:", error);
    return NextResponse.json(
      { error: "Failed to update property details", details: error.message },
      { status: 500 }
    );
  }
}
