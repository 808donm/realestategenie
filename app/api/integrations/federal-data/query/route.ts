import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  FederalDataClient,
  FederalDataConfig,
  createFederalDataClient,
} from "@/lib/integrations/federal-data-client";

/**
 * Helper: get a working Federal Data client (from DB config or env vars)
 */
async function getFederalClient(): Promise<FederalDataClient> {
  // Try DB-stored integration first
  const { data: integration } = await supabaseAdmin
    .from("integrations")
    .select("config")
    .eq("provider", "federal_data")
    .eq("status", "connected")
    .limit(1)
    .maybeSingle();

  if (integration?.config) {
    const config =
      typeof integration.config === "string"
        ? JSON.parse(integration.config)
        : integration.config;

    return new FederalDataClient({
      uspsClientId: config.usps_client_id,
      uspsClientSecret: config.usps_client_secret,
      censusApiKey: config.census_api_key,
      blsApiKey: config.bls_api_key,
    });
  }

  // Fall back to env vars
  return createFederalDataClient();
}

/**
 * GET - Query federal data sources
 *
 * Query params:
 * - endpoint: "supplement" | "fmr" | "census" | "flood" | "disasters" |
 *             "loanlimits" | "employment" | "environmental" | "lending" | "vacancy"
 * - zipCode: ZIP code (required for most)
 * - state: State abbreviation
 * - stateFips: State FIPS code
 * - countyFips: County FIPS code
 * - address: Street address (for USPS vacancy check)
 * - city: City name (for USPS)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get("endpoint") || "supplement";
    const zipCode = searchParams.get("zipCode") || "";
    const state = searchParams.get("state") || "";
    const stateFips = searchParams.get("stateFips") || "";
    const countyFips = searchParams.get("countyFips") || "";
    const address = searchParams.get("address") || "";
    const city = searchParams.get("city") || "";

    const client = await getFederalClient();

    let result;
    switch (endpoint) {
      case "supplement":
        // Full supplement — all sources in parallel
        result = await client.getPropertySupplement({
          zipCode,
          state,
          stateFips,
          countyFips,
          address,
          city,
        });
        break;

      case "fmr":
        result = await client.getFairMarketRents(zipCode);
        break;

      case "census":
        result = await client.getHousingData(stateFips, zipCode);
        break;

      case "flood":
        result = await client.getFloodData(zipCode);
        break;

      case "disasters":
        result = await client.getDisasterDeclarations(
          state || stateFips,
          searchParams.get("county") || undefined
        );
        break;

      case "loanlimits":
        result = await client.getConformingLoanLimits(stateFips, countyFips);
        break;

      case "employment":
        result = await client.getUnemploymentRate(stateFips);
        break;

      case "environmental":
        result = await client.getEnvironmentalSites(zipCode);
        break;

      case "lending":
        result = await client.getMortgageLendingData(stateFips, countyFips);
        break;

      case "vacancy":
        if (!address || !city || !state) {
          return NextResponse.json(
            { error: "address, city, and state are required for vacancy check" },
            { status: 400 }
          );
        }
        result = await client.validateAddress(address, city, state, zipCode);
        break;

      default:
        result = await client.getPropertySupplement({
          zipCode,
          state,
          stateFips,
          countyFips,
          address,
          city,
        });
    }

    return NextResponse.json({
      success: true,
      endpoint,
      ...result,
    });
  } catch (error) {
    console.error("Error fetching federal data:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch federal data",
      },
      { status: 500 }
    );
  }
}
