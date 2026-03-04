import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(
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
      console.error("Upload error:", uploadError);
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
      console.error("Update error:", updateError);
      // Try to delete the uploaded file if DB update fails
      await supabase.storage.from("property-photos").remove([filePath]);
      return NextResponse.json(
        { error: "Failed to update property", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: any) {
    console.error("Photo upload error:", error);
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
    const supabase = await supabaseServer();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Get the open house to verify ownership and get the photo URL
    const { data: event, error: fetchError } = await supabase
      .from("open_house_events")
      .select("agent_id, property_photo_url, secondary_photo_url, tertiary_photo_url")
      .eq("id", id)
      .single();

    if (fetchError || !event) {
      return NextResponse.json({ error: "Open house not found" }, { status: 404 });
    }

    if ((event as any).agent_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const photoUrl = (event as any)[column];
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
      console.error("Delete error:", deleteError);
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
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update property", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Photo deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete photo", details: error.message },
      { status: 500 }
      );
  }
}
