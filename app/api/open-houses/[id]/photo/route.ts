import { NextRequest, NextResponse } from "next/server";
import { getEffectiveClient, getEventWithAdminFallback } from "@/lib/supabase/effective-client";

export async function POST(
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
      console.error("[Photo Upload] Auth error:", authError.message);
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

    supabase = access.supabase;

    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get("photo") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Determine which photo slot to update
    const url = new URL(request.url);
    const slot = url.searchParams.get("slot") || "primary";
    const validSlots = ["primary", "secondary", "tertiary"];
    if (!validSlots.includes(slot)) {
      return NextResponse.json(
        { error: "Invalid slot. Must be primary, secondary, or tertiary." },
        { status: 400 }
      );
    }

    const columnMap: Record<string, string> = {
      primary: "property_photo_url",
      secondary: "secondary_photo_url",
      tertiary: "tertiary_photo_url",
    };

    // Create a unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${id}-${slot}-${Date.now()}.${fileExt}`;
    const filePath = `property-photos/${fileName}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("property-photos")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[Photo Upload] Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file", details: uploadError.message },
        { status: 500 }
      );
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("property-photos").getPublicUrl(filePath);

    // Update the open house event with the photo URL
    const { error: updateError } = await supabase
      .from("open_house_events")
      .update({
        [columnMap[slot]]: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("[Photo Upload] Update error:", updateError);
      // Try to delete the uploaded file if DB update fails
      await supabase.storage.from("property-photos").remove([filePath]);
      return NextResponse.json(
        { error: "Failed to update property", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: any) {
    console.error("[Photo Upload] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to upload photo", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
      console.error("[Photo Delete] Auth error:", authError.message);
      return NextResponse.json(
        { error: "Authentication failed. Please refresh the page and try again." },
        { status: 401 }
      );
    }

    // Determine which photo slot to delete
    const url = new URL(request.url);
    const slot = url.searchParams.get("slot") || "primary";
    const validSlots = ["primary", "secondary", "tertiary"];
    if (!validSlots.includes(slot)) {
      return NextResponse.json(
        { error: "Invalid slot. Must be primary, secondary, or tertiary." },
        { status: 400 }
      );
    }

    const columnMap: Record<string, string> = {
      primary: "property_photo_url",
      secondary: "secondary_photo_url",
      tertiary: "tertiary_photo_url",
    };
    const column = columnMap[slot];

    // Verify access to the event (with admin fallback)
    const selectColumns = "agent_id, property_photo_url, secondary_photo_url, tertiary_photo_url";
    const access = await getEventWithAdminFallback(supabase, userId, isImpersonating, id, selectColumns);

    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    supabase = access.supabase;
    const event = access.event;

    const photoUrl = event[column];
    if (!photoUrl) {
      return NextResponse.json({ error: "No photo to delete" }, { status: 404 });
    }

    // Extract the file path from the URL
    const urlParts = photoUrl.split("/property-photos/");
    if (urlParts.length < 2) {
      return NextResponse.json({ error: "Invalid photo URL" }, { status: 400 });
    }
    const filePath = `property-photos/${urlParts[1]}`;

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from("property-photos")
      .remove([filePath]);

    if (deleteError) {
      console.error("[Photo Delete] Storage delete error:", deleteError);
      // Continue even if delete fails - maybe file doesn't exist
    }

    // Update the database to remove the URL
    const { error: updateError } = await supabase
      .from("open_house_events")
      .update({
        [column]: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("[Photo Delete] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update property", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Photo Delete] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to delete photo", details: error.message },
      { status: 500 }
    );
  }
}
