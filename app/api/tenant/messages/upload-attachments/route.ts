import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify this is a tenant account
    const userMetadata = user.user_metadata;
    if (userMetadata?.role !== "tenant") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Validate file count (max 5)
    if (files.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 files allowed" },
        { status: 400 }
      );
    }

    const uploadedAttachments = [];

    for (const file of files) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds 10MB limit` },
          { status: 400 }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const extension = file.name.split(".").pop();
      const filename = `${timestamp}-${randomString}.${extension}`;
      const filePath = `message-attachments/${user.id}/${filename}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from("message-attachments")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        return NextResponse.json(
          { error: `Failed to upload ${file.name}` },
          { status: 500 }
        );
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("message-attachments").getPublicUrl(filePath);

      uploadedAttachments.push({
        filename: file.name,
        url: publicUrl,
        size: file.size,
        type: file.type,
      });
    }

    return NextResponse.json({ attachments: uploadedAttachments });
  } catch (error) {
    console.error("Error in POST /api/tenant/messages/upload-attachments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
