import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";

/**
 * Upload a calculator export file and attach it as a note to a GHL contact.
 * POST /api/ghl/contacts/attach-file
 * Body: FormData with fields: file, contactId, contactName, reportTitle
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const contactId = formData.get("contactId") as string;
    const contactName = formData.get("contactName") as string;
    const reportTitle = formData.get("reportTitle") as string;

    if (!file || !contactId) {
      return NextResponse.json(
        { error: "File and contactId are required" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and Excel files are allowed" },
        { status: 400 }
      );
    }

    // Determine file extension
    const ext = file.type === "application/pdf" ? "pdf" : "xlsx";
    const fileName = `${userData.user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("calculator-exports")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      // Bucket may not exist yet - try creating it
      if (uploadError.message?.includes("not found") || uploadError.message?.includes("Bucket")) {
        // Fallback: use lease-documents bucket with a subfolder
        const fallbackName = `calculator-exports/${fileName}`;
        const { error: fallbackError } = await supabase.storage
          .from("lease-documents")
          .upload(fallbackName, file, {
            contentType: file.type,
            upsert: false,
          });

        if (fallbackError) {
          console.error("Upload fallback error:", fallbackError);
          return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
        }

        const { data: urlData } = supabase.storage
          .from("lease-documents")
          .getPublicUrl(fallbackName);

        // Add note to GHL contact with the file URL
        await addNoteToContact(userData.user.id, contactId, reportTitle, urlData.publicUrl, ext);

        return NextResponse.json({
          success: true,
          url: urlData.publicUrl,
          contactName,
        });
      }

      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("calculator-exports")
      .getPublicUrl(fileName);

    // Add note to GHL contact with the file URL
    await addNoteToContact(userData.user.id, contactId, reportTitle, urlData.publicUrl, ext);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      contactName,
    });
  } catch (error: any) {
    console.error("Error in attach-file route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

async function addNoteToContact(
  userId: string,
  contactId: string,
  reportTitle: string,
  fileUrl: string,
  fileType: string
) {
  const ghlConfig = await getValidGHLConfig(userId);

  if (!ghlConfig) {
    throw new Error("GHL not connected. Please connect your GHL integration first.");
  }

  const client = new GHLClient(ghlConfig.access_token, ghlConfig.location_id);

  const noteBody = [
    `📊 **${reportTitle || "Calculator Export"}**`,
    ``,
    `A ${fileType.toUpperCase()} report has been generated and attached to this contact.`,
    ``,
    `📎 File: ${fileUrl}`,
    ``,
    `Generated on ${new Date().toLocaleDateString()} via RealEstateGenie`,
  ].join("\n");

  await client.addNote({
    contactId,
    body: noteBody,
  });
}
