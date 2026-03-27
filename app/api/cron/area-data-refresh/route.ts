import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getNeighborhoodProfile } from "@/lib/integrations/free-data";
import { FederalDataClient, createFederalDataClient } from "@/lib/integrations/federal-data-client";
import { RentcastClient, createRentcastClient } from "@/lib/integrations/rentcast-client";

/**
 * Area Data Refresh Cron Job
 *
 * Runs monthly — pre-fetches neighborhood, federal, and market stats data
 * for all Oahu zip codes and caches them in area_data_cache.
 *
 * Vercel cron schedule: "0 10 1 * *"  (1st of each month at 10:00 UTC / midnight HST)
 * Required header: Authorization: Bearer [CRON_SECRET]
 */

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// All Oahu zip codes (residential + PO Box/admin)
const OAHU_ZIPS = [
  "96701",
  "96706",
  "96707",
  "96709",
  "96712",
  "96717",
  "96730",
  "96731",
  "96734",
  "96744",
  "96759",
  "96762",
  "96782",
  "96786",
  "96789",
  "96791",
  "96792",
  "96795",
  "96797",
  "96801",
  "96802",
  "96803",
  "96804",
  "96805",
  "96806",
  "96807",
  "96808",
  "96809",
  "96810",
  "96811",
  "96812",
  "96813",
  "96814",
  "96815",
  "96816",
  "96817",
  "96818",
  "96819",
  "96820",
  "96821",
  "96822",
  "96823",
  "96824",
  "96825",
  "96826",
  "96827",
  "96828",
  "96830",
  "96835",
  "96836",
  "96837",
  "96838",
  "96839",
  "96840",
  "96841",
  "96842",
  "96843",
  "96844",
  "96846",
  "96847",
  "96848",
  "96849",
  "96850",
  "96853",
  "96854",
  "96857",
  "96858",
  "96859",
  "96860",
  "96861",
  "96862",
  "96863",
  "96898",
];

// Hawaii FIPS: state=15, Honolulu county=003
const HAWAII_STATE = "HI";
const HAWAII_STATE_FIPS = "15";
const HONOLULU_COUNTY_FIPS = "003";

async function getFederalClient(): Promise<FederalDataClient | null> {
  try {
    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("provider", "federal_data")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();

    if (integration?.config) {
      const config = typeof integration.config === "string" ? JSON.parse(integration.config) : integration.config;

      return new FederalDataClient({
        uspsClientId: config.usps_client_id,
        uspsClientSecret: config.usps_client_secret,
        hudToken: config.hud_api_token,
        censusApiKey: config.census_api_key,
        blsApiKey: config.bls_api_key,
      });
    }

    return createFederalDataClient();
  } catch {
    return null;
  }
}

async function getRentcastClient(): Promise<RentcastClient | null> {
  try {
    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("provider", "rentcast")
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();

    if (integration?.config) {
      const config = typeof integration.config === "string" ? JSON.parse(integration.config) : integration.config;
      if (config.api_key) return new RentcastClient({ apiKey: config.api_key });
    }

    return createRentcastClient();
  } catch {
    return null;
  }
}

async function upsertCache(zipCode: string, dataType: string, data: any): Promise<void> {
  const { error } = await supabase.from("area_data_cache").upsert(
    {
      zip_code: zipCode,
      data_type: dataType,
      data,
      fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "zip_code,data_type" },
  );

  if (error) {
    console.error(`[AreaCache] Failed to upsert ${dataType} for ${zipCode}:`, error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[AreaCache] Starting monthly area data refresh for Oahu...");

    const federalClient = await getFederalClient();
    const rentcastClient = await getRentcastClient();

    const stats = {
      total: OAHU_ZIPS.length,
      neighborhood: { success: 0, failed: 0, skipped: 0 },
      federal: { success: 0, failed: 0, skipped: 0 },
      market_stats: { success: 0, failed: 0, skipped: 0 },
    };

    // Process zips in batches of 5 to avoid overwhelming APIs
    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES_MS = 2000;

    for (let i = 0; i < OAHU_ZIPS.length; i += BATCH_SIZE) {
      const batch = OAHU_ZIPS.slice(i, i + BATCH_SIZE);
      console.log(
        `[AreaCache] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(OAHU_ZIPS.length / BATCH_SIZE)}: ${batch.join(", ")}`,
      );

      await Promise.all(
        batch.map(async (zip) => {
          // 1. Neighborhood data
          try {
            const neighborhood = await getNeighborhoodProfile({
              postalCode: zip,
              state: HAWAII_STATE,
              fips: `${HAWAII_STATE_FIPS}${HONOLULU_COUNTY_FIPS}`,
            });

            if (neighborhood) {
              await upsertCache(zip, "neighborhood", neighborhood);
              stats.neighborhood.success++;
            } else {
              stats.neighborhood.skipped++;
            }
          } catch (err: any) {
            console.warn(`[AreaCache] Neighborhood failed for ${zip}:`, err.message);
            stats.neighborhood.failed++;
          }

          // 2. Federal data
          if (federalClient) {
            try {
              const federal = await federalClient.getPropertySupplement({
                zipCode: zip,
                state: HAWAII_STATE,
                stateFips: HAWAII_STATE_FIPS,
                countyFips: HONOLULU_COUNTY_FIPS,
              });

              if (federal) {
                await upsertCache(zip, "federal", federal);
                stats.federal.success++;
              } else {
                stats.federal.skipped++;
              }
            } catch (err: any) {
              console.warn(`[AreaCache] Federal failed for ${zip}:`, err.message);
              stats.federal.failed++;
            }
          } else {
            stats.federal.skipped++;
          }

          // 3. Market stats (RentCast)
          if (rentcastClient) {
            try {
              const marketData = await rentcastClient.getMarketData({
                zipCode: zip,
                dataType: "All",
                historyRange: 12,
              });

              if (marketData) {
                await upsertCache(zip, "market_stats", marketData);
                stats.market_stats.success++;
              } else {
                stats.market_stats.skipped++;
              }
            } catch (err: any) {
              console.warn(`[AreaCache] Market stats failed for ${zip}:`, err.message);
              stats.market_stats.failed++;
            }
          } else {
            stats.market_stats.skipped++;
          }
        }),
      );

      // Rate limit between batches
      if (i + BATCH_SIZE < OAHU_ZIPS.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
      }
    }

    console.log("[AreaCache] Monthly refresh complete:", stats);

    return NextResponse.json({
      success: true,
      message: "Area data refresh complete",
      stats,
    });
  } catch (error: any) {
    console.error("[AreaCache] Cron error:", error);
    return NextResponse.json({ error: error.message || "Area data refresh failed" }, { status: 500 });
  }
}
