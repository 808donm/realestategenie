import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { generatePDF, generateDOCX, type ProfileData } from "@/lib/documents/neighborhood-profile-generator";
import { fetchImageAsDataUri, fetchStaticMapImage, type AgentBranding } from "@/lib/documents/pdf-report-utils";
import { createFederalDataClient } from "@/lib/integrations/federal-data-client";
import { getCountyByZip } from "@/lib/hawaii-zip-county";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

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
      .select("display_name, email, phone_e164, license_number, photo_url, headshot_url, company_logo_url, brokerage_name")
      .eq("id", user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent profile not found" }, { status: 404 });
    }

    // Fetch headshot & logo in parallel
    const photoSrc = agent.headshot_url || agent.photo_url;
    const logoSrc = agent.company_logo_url;
    const [headshotData, brokerLogoData] = await Promise.all([
      photoSrc ? fetchImageAsDataUri(photoSrc) : Promise.resolve(null),
      logoSrc ? fetchImageAsDataUri(logoSrc) : Promise.resolve(null),
    ]);

    const agentBranding: AgentBranding = {
      displayName: agent.display_name || agent.email,
      email: agent.email,
      phone: agent.phone_e164,
      licenseNumber: agent.license_number,
      photoUrl: agent.photo_url,
      brokerageName: agent.brokerage_name || "Real Estate Genie",
      brokerLogoUrl: agent.company_logo_url,
      headshotData,
      brokerLogoData,
    };

    // Build profile data from stored profile
    const profileData: ProfileData = {
      neighborhoodName: profile.neighborhood_name,
      address: profile.address,
      city: profile.city,
      stateProvince: profile.state_province,
      zipCode: profile.profile_data?.inputData?.zipCode || profile.address?.match(/\d{5}/)?.[0],
      countyName: profile.profile_data?.inputData?.countyName,
      lifestyleVibe: profile.profile_data.lifestyleVibe,
      locationNarrative: profile.profile_data.locationNarrative,
      amenitiesList: profile.profile_data.amenitiesList,
      marketData: profile.profile_data.marketData,
      schoolsDetail: profile.profile_data.schoolsDetail,
      walkScore: profile.profile_data.walkScore,
    };

    // Enrich with Census detailed demographics (if not already cached in profile)
    if (!profile.profile_data.demographics && profileData.zipCode && format === "pdf") {
      try {
        const fedClient = createFederalDataClient();
        // Resolve state/county FIPS -- for Hawaii, use known FIPS codes
        const hiCounty = getCountyByZip(profileData.zipCode);
        const hiCountyFips: Record<string, string> = { HONOLULU: "003", HAWAII: "001", MAUI: "009", KAUAI: "007" };
        const stateFips = profile.state_province === "HI" ? "15" : undefined; // Extend for other states as needed
        const countyFips = hiCounty ? hiCountyFips[hiCounty] : undefined;

        if (stateFips) {
          // Fetch both housing data and detailed demographics at all geo levels
          const [multiGeo, zipHousing, countyHousing, stateHousing, natHousing] = await Promise.allSettled([
            fedClient.getMultiGeoDemo({ zipCode: profileData.zipCode, stateFips, countyFips: countyFips || "" }),
            fedClient.getHousingData(stateFips, profileData.zipCode),
            countyFips ? fedClient.getHousingData(stateFips, undefined, countyFips) : Promise.resolve({ success: false }),
            fedClient.getHousingData(stateFips),
            Promise.resolve({ success: false } as any), // national housing -- use getDetailedDemographics instead
          ]);

          const geoData = multiGeo.status === "fulfilled" ? multiGeo.value : {};
          const zipH = zipHousing.status === "fulfilled" && zipHousing.value.success ? zipHousing.value.data : undefined;
          const countyH = countyHousing.status === "fulfilled" && (countyHousing.value as any).success ? (countyHousing.value as any).data : undefined;
          const stateH = stateHousing.status === "fulfilled" && stateHousing.value.success ? stateHousing.value.data : undefined;
          const natH = natHousing.status === "fulfilled" && natHousing.value.success ? natHousing.value.data : undefined;

          profileData.demographics = {
            zip: geoData.zip ? { ...geoData.zip, ...zipH } : zipH ? { ...zipH } as any : undefined,
            county: geoData.county ? { ...geoData.county, ...countyH } : countyH ? { ...countyH } as any : undefined,
            state: geoData.state ? { ...geoData.state, ...stateH } : stateH ? { ...stateH } as any : undefined,
            national: geoData.national ? { ...geoData.national, ...natH } : natH ? { ...natH } as any : undefined,
          };

          // Set county name from Census geography if not set
          if (!profileData.countyName && countyH?.geography) {
            profileData.countyName = String(countyH.geography).replace(/, .*$/, "");
          }
        }
      } catch (err) {
        console.warn("[neighborhood-export] Census enrichment failed:", err);
      }
    } else if (profile.profile_data.demographics) {
      profileData.demographics = profile.profile_data.demographics;
    }

    // Fetch static map for cover page
    if (!profileData.mapImageData && profile.profile_data?.inputData?.latitude && profile.profile_data?.inputData?.longitude) {
      const mapData = await fetchStaticMapImage(
        profile.profile_data.inputData.latitude,
        profile.profile_data.inputData.longitude,
        600, 400, 13,
      );
      if (mapData) profileData.mapImageData = mapData;
    }

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
    return NextResponse.json({ error: error.message || "Failed to export profile" }, { status: 500 });
  }
}
