import { NextRequest, NextResponse } from "next/server";
import { getEffectiveClient, getEventWithAdminFallback } from "@/lib/supabase/effective-client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let supabase;
    let userId: string;
    let isImpersonating: boolean;

    try {
      const client = await getEffectiveClient();
      supabase = client.supabase;
      userId = client.userId;
      isImpersonating = client.isImpersonating;
    } catch (authError: any) {
      console.error("[Property Details] Auth error:", authError.message);
      return NextResponse.json(
        { error: "Authentication failed. Please refresh the page and try again." },
        { status: 401 }
      );
    }

    // Verify access to the event (with admin fallback)
    const access = await getEventWithAdminFallback(supabase, userId, isImpersonating, id);

    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Use the (possibly escalated) client for the update
    supabase = access.supabase;

    // Parse request body
    const body = await request.json();
    const {
      beds,
      baths,
      sqft,
      price,
      listing_description,
      key_features,
      flyer_description,
      flyer_features,
    } = body;

    console.log('[Property Details] Update request:', {
      eventId: id,
      userId,
      isImpersonating,
      isElevated: access.isElevated,
      beds,
      baths,
      sqft,
      price,
      priceType: typeof price,
      hasDescription: !!listing_description,
      hasFlyerDescription: !!flyer_description,
      featuresCount: key_features?.length || 0,
      flyerFeaturesCount: flyer_features?.length || 0,
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
        flyer_description,
        flyer_features,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("[Property Details] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update property details", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Property Details] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to update property details", details: error.message },
      { status: 500 }
    );
  }
}
