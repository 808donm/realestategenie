import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Upload agent headshot photo
 * POST /api/agents/headshot
 */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Delete old headshot if it exists
    const { data: agent } = await supabase
      .from("agents")
      .select("headshot_url")
      .eq("id", user.id)
      .single();

    if (agent?.headshot_url) {
      const oldPath = agent.headshot_url.split("/").pop();
      if (oldPath) {
        await supabase.storage
          .from("agent-photos")
          .remove([`headshots/${oldPath}`]);
      }
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `headshots/${fileName}`;

    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("agent-photos")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("agent-photos").getPublicUrl(filePath);

    // Update agent record
    const { error: updateError } = await supabase
      .from("agents")
      .update({ headshot_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      console.error("Database update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error("Agent headshot upload error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}

/**
 * Delete agent headshot photo
 * DELETE /api/agents/headshot
 */
export async function DELETE(request: NextRequest) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get current headshot
    const { data: agent } = await supabase
      .from("agents")
      .select("headshot_url")
      .eq("id", user.id)
      .single();

    if (agent?.headshot_url) {
      const filePath = agent.headshot_url.split("/").pop();
      if (filePath) {
        await supabase.storage
          .from("agent-photos")
          .remove([`headshots/${filePath}`]);
      }
    }

    // Remove from database
    await supabase
      .from("agents")
      .update({ headshot_url: null })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete headshot error:", error);
    return NextResponse.json(
      { error: error.message || "Delete failed" },
      { status: 500 }
    );
  }
}
