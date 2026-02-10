import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/mls/listings/[id] — get a single listing
 * PUT /api/mls/listings/[id] — update a listing
 * DELETE /api/mls/listings/[id] — delete a listing
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("agent_listings")
      .select("*")
      .eq("id", id)
      .eq("user_id", userData.user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({ listing: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch listing" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Rebuild unparsed address if address fields changed
    if (body.street_name || body.city) {
      const addressParts = [body.street_number, body.street_name, body.street_suffix].filter(Boolean);
      if (addressParts.length > 0) {
        body.unparsed_address = `${addressParts.join(" ")}${body.unit_number ? ` #${body.unit_number}` : ""}, ${body.city}, ${body.state_or_province || "NJ"} ${body.postal_code}`;
      }
    }

    // Remove fields that shouldn't be updated directly
    delete body.id;
    delete body.user_id;
    delete body.created_at;
    delete body.updated_at;

    const { data, error } = await supabase
      .from("agent_listings")
      .update(body)
      .eq("id", id)
      .eq("user_id", userData.user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({ listing: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update listing" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("agent_listings")
      .delete()
      .eq("id", id)
      .eq("user_id", userData.user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete listing" },
      { status: 500 }
    );
  }
}
