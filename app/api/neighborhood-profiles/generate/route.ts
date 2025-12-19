import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { generateNeighborhoodProfile, NeighborhoodProfileRequest } from "@/lib/ai/openai-client";
import { logError } from "@/lib/error-logging";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get agent profile
    const { data: agent } = await supabase
      .from("agents")
      .select("account_status")
      .eq("id", user.id)
      .single();

    if (!agent || agent.account_status !== "active") {
      return NextResponse.json({ error: "Account not active" }, { status: 403 });
    }

    const body = await request.json();
    const {
      neighborhoodName,
      address,
      city,
      stateProvince,
      country = "USA",
      architecturalStyle,
      nearbyAmenities,
      additionalContext,
    } = body;

    // Validation
    if (!neighborhoodName || !address || !city || !stateProvince) {
      return NextResponse.json(
        { error: "Missing required fields: neighborhoodName, address, city, stateProvince" },
        { status: 400 }
      );
    }

    console.log(`Generating neighborhood profile for ${neighborhoodName}, ${city}`);

    // Generate profile using GPT-4
    const profileRequest: NeighborhoodProfileRequest = {
      neighborhoodName,
      address,
      city,
      stateProvince,
      country,
      architecturalStyle,
      nearbyAmenities,
      additionalContext,
    };

    const aiResponse = await generateNeighborhoodProfile(profileRequest);

    // Check compliance
    if (!aiResponse.complianceCheck.passed) {
      console.warn("AI generated non-compliant content:", aiResponse.complianceCheck.warnings);
      await logError({
        agentId: user.id,
        endpoint: "/api/neighborhood-profiles/generate",
        errorMessage: `Compliance check failed: ${aiResponse.complianceCheck.warnings.join(", ")}`,
        severity: "warning",
      });

      return NextResponse.json(
        {
          error: "Generated content failed compliance check. Please try again or contact support.",
          warnings: aiResponse.complianceCheck.warnings,
        },
        { status: 400 }
      );
    }

    // Store the profile in database
    const { data: savedProfile, error: saveError } = await admin
      .from("neighborhood_profiles")
      .insert({
        agent_id: user.id,
        neighborhood_name: neighborhoodName,
        address,
        city,
        state_province: stateProvince,
        profile_data: {
          lifestyleVibe: aiResponse.lifestyleVibe,
          locationNarrative: aiResponse.locationNarrative,
          amenitiesList: aiResponse.amenitiesList,
          generatedAt: new Date().toISOString(),
          inputData: {
            architecturalStyle,
            nearbyAmenities,
            additionalContext,
          },
        },
      })
      .select()
      .single();

    if (saveError || !savedProfile) {
      console.error("Failed to save profile:", saveError);
      await logError({
        agentId: user.id,
        endpoint: "/api/neighborhood-profiles/generate",
        errorMessage: saveError?.message || "Failed to save profile",
        severity: "error",
      });

      return NextResponse.json(
        { error: "Failed to save generated profile" },
        { status: 500 }
      );
    }

    console.log(`Successfully generated profile ${savedProfile.id} for ${user.id}`);

    return NextResponse.json({
      success: true,
      profile: savedProfile,
      aiResponse,
    });
  } catch (error: any) {
    console.error("Error generating neighborhood profile:", error);
    await logError({
      endpoint: "/api/neighborhood-profiles/generate",
      errorMessage: error.message,
      stackTrace: error.stack,
      severity: "error",
    });

    return NextResponse.json(
      { error: error.message || "Failed to generate neighborhood profile" },
      { status: 500 }
    );
  }
}
