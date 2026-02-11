import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { generatePDF, generateDOCX, AgentBranding, ProfileData } from "@/lib/documents/neighborhood-profile-generator";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { profileId, format = "pdf" } = body;

    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    if (!["pdf", "docx"].includes(format)) {
      return NextResponse.json({ error: "format must be 'pdf' or 'docx'" }, { status: 400 });
    }

    // Fetch the profile
    const { data: profile, error: profileError } = await supabase
      .from("neighborhood_profiles")
      .select("*")
      .eq("id", profileId)
      .eq("agent_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Fetch agent branding info
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("display_name, email, phone_e164, license_number, photo_url")
      .eq("id", user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent profile not found" }, { status: 404 });
    }

    const agentBranding: AgentBranding = {
      displayName: agent.display_name || agent.email,
      email: agent.email,
      phone: agent.phone_e164,
      licenseNumber: agent.license_number,
      photoUrl: agent.photo_url,
      brokerageName: "Real Estate Genie", // Can be made configurable later
    };

    const profileData: ProfileData = {
      neighborhoodName: profile.neighborhood_name,
      address: profile.address,
      city: profile.city,
      stateProvince: profile.state_province,
      lifestyleVibe: profile.profile_data.lifestyleVibe,
      locationNarrative: profile.profile_data.locationNarrative,
      amenitiesList: profile.profile_data.amenitiesList,
      marketData: profile.profile_data.marketData,
    };

    // Generate document
    let documentBlob: Blob;
    let filename: string;
    let contentType: string;

    if (format === "pdf") {
      documentBlob = generatePDF(profileData, agentBranding);
      filename = `${profile.neighborhood_name.replace(/[^a-zA-Z0-9]/g, "_")}_Profile.pdf`;
      contentType = "application/pdf";
    } else {
      documentBlob = await generateDOCX(profileData, agentBranding);
      filename = `${profile.neighborhood_name.replace(/[^a-zA-Z0-9]/g, "_")}_Profile.docx`;
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    // Update download stats
    await admin
      .from("neighborhood_profiles")
      .update({
        last_downloaded_at: new Date().toISOString(),
        download_count: (profile.download_count || 0) + 1,
      })
      .eq("id", profileId);

    // Convert Blob to Buffer for NextResponse
    const arrayBuffer = await documentBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Error exporting neighborhood profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export profile" },
      { status: 500 }
    );
  }
}
