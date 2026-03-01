import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { HonoluluTaxClient } from "@/lib/integrations/honolulu-tax-client";

/**
 * GET - Query Honolulu (CCHNL) public tax & ownership data via ArcGIS
 *
 * Endpoints:
 *   ?endpoint=owners&tmk=...         — Get all owners for a TMK
 *   ?endpoint=owners&name=...        — Search owners by name
 *   ?endpoint=parcel&tmk=...         — Get tax parcel by TMK
 *   ?endpoint=record&tmk=...         — Get full tax record (owners + parcel)
 *   ?endpoint=search&address=...     — Search parcels by address
 *   ?endpoint=test                   — Test ArcGIS endpoint connectivity
 *
 * No API key required — this is public open data from the
 * City & County of Honolulu's ArcGIS Open Geospatial Data portal.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get("endpoint") || "record";
    const tmk = searchParams.get("tmk");
    const name = searchParams.get("name");
    const address = searchParams.get("address");
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : undefined;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!, 10)
      : undefined;

    const client = new HonoluluTaxClient();

    switch (endpoint) {
      case "owners": {
        if (tmk) {
          const owners = await client.getOwnersByTMK(tmk);
          return NextResponse.json({ success: true, tmk, owners });
        }
        if (name) {
          const owners = await client.searchOwnersByName(name, {
            limit,
            offset,
          });
          return NextResponse.json({ success: true, name, owners });
        }
        return NextResponse.json(
          { error: "Provide tmk or name parameter" },
          { status: 400 }
        );
      }

      case "parcel": {
        if (!tmk) {
          return NextResponse.json(
            { error: "tmk parameter required" },
            { status: 400 }
          );
        }
        const parcel = await client.getTaxParcelByTMK(tmk);
        return NextResponse.json({ success: true, tmk, parcel });
      }

      case "record": {
        if (!tmk) {
          return NextResponse.json(
            { error: "tmk parameter required" },
            { status: 400 }
          );
        }
        const record = await client.getTaxRecord(tmk);
        return NextResponse.json({ success: true, ...record });
      }

      case "search": {
        if (!address) {
          return NextResponse.json(
            { error: "address parameter required" },
            { status: 400 }
          );
        }
        const parcels = await client.searchParcelsByAddress(address, {
          limit,
          offset,
        });
        return NextResponse.json({ success: true, address, parcels });
      }

      case "test": {
        const results = await client.testConnection();
        return NextResponse.json({ success: true, endpoints: results });
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown endpoint: ${endpoint}. Use: owners, parcel, record, search, test`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error fetching Honolulu tax data:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Honolulu tax data",
      },
      { status: 500 }
    );
  }
}
