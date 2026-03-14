import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/integrations/epa/ejscreen?address=xxx
 * Fetches EPA EJScreen environmental justice data for a given address.
 * Uses the EPA EJScreen API (publicly available).
 *
 * EJScreen: https://www.epa.gov/ejscreen
 * API: https://ejscreen.epa.gov/mapper/ejscreenRESTbroker.aspx
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const address = request.nextUrl.searchParams.get("address");
    const lat = request.nextUrl.searchParams.get("lat");
    const lng = request.nextUrl.searchParams.get("lng");

    if (!address && (!lat || !lng)) {
      return NextResponse.json({ error: "address or lat/lng parameters are required" }, { status: 400 });
    }

    // Step 1: Geocode address to lat/lng if needed
    let latitude = lat ? parseFloat(lat) : 0;
    let longitude = lng ? parseFloat(lng) : 0;

    if (address && (!lat || !lng)) {
      // Use Census geocoder (free, no API key needed)
      try {
        const geocodeUrl = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
        const geoRes = await fetch(geocodeUrl);
        const geoData = await geoRes.json();
        const match = geoData?.result?.addressMatches?.[0];
        if (match) {
          latitude = match.coordinates.y;
          longitude = match.coordinates.x;
        } else {
          return NextResponse.json({
            error: "Could not geocode address. Try providing lat/lng directly.",
            ejIndex: null,
          }, { status: 404 });
        }
      } catch {
        return NextResponse.json({ error: "Geocoding service unavailable" }, { status: 502 });
      }
    }

    // Step 2: Query EPA EJScreen API
    // The EJScreen REST broker provides environmental indicators for a point location
    try {
      const ejUrl = `https://ejscreen.epa.gov/mapper/ejscreenRESTbroker.aspx?namestr=&geometry=${longitude}%2C${latitude}&distance=1&unit=9035&aession=&f=json`;
      const ejRes = await fetch(ejUrl, {
        headers: { "Accept": "application/json" },
      });

      if (!ejRes.ok) {
        // EJScreen API might be down or rate-limited
        return NextResponse.json({
          note: "EPA EJScreen API is temporarily unavailable. Data shown is illustrative.",
          latitude,
          longitude,
          ejIndex: "N/A - API unavailable",
          airToxicsCancer: null,
          respiratoryHazard: null,
          leadPaint: null,
          superfundProximity: null,
          wastewater: null,
          pm25: null,
          ozone: null,
          dieselPM: null,
          trafficProximity: null,
        });
      }

      const ejData = await ejRes.json();

      // Parse EJScreen response
      // The API returns data in various formats depending on version
      const raw = ejData?.data || ejData?.results || ejData;

      return NextResponse.json({
        latitude,
        longitude,
        // Environmental indicators (percentiles)
        ejIndex: raw?.ejIndex || raw?.EJ_INDEX || raw?.T_EJINDEX,
        airToxicsCancer: raw?.airToxicsCancer || raw?.D_CANCR_2 || raw?.T_CANCER,
        respiratoryHazard: raw?.respiratoryHazard || raw?.D_RESP_2 || raw?.T_RESP,
        leadPaint: raw?.leadPaint || raw?.D_LDPNT_2 || raw?.T_LDPNT,
        superfundProximity: raw?.superfundProximity || raw?.D_PNPL_2 || raw?.T_PNPL,
        wastewater: raw?.wastewater || raw?.D_PWDIS_2 || raw?.T_PWDIS,
        pm25: raw?.pm25 || raw?.D_PM25_2 || raw?.T_PM25,
        ozone: raw?.ozone || raw?.D_OZONE_2 || raw?.T_OZONE,
        dieselPM: raw?.dieselPM || raw?.D_DSLPM_2 || raw?.T_DSLPM,
        trafficProximity: raw?.trafficProximity || raw?.D_PTRAF_2 || raw?.T_PTRAF,
        hazardousWaste: raw?.hazardousWaste || raw?.D_PRMP_2 || raw?.T_PRMP,
        underground: raw?.underground || raw?.D_PTSDF_2 || raw?.T_PTSDF,
        // Demographics
        minorityPct: raw?.MINORPCT || raw?.minorityPct,
        lowIncomePct: raw?.LOWINCPCT || raw?.lowIncomePct,
        lessThanHSPct: raw?.LESSHSPCT || raw?.lessThanHSPct,
        linguistIsolPct: raw?.LINGISOPCT || raw?.linguisticIsolation,
        under5Pct: raw?.UNDER5PCT || raw?.under5Pct,
        over64Pct: raw?.OVER64PCT || raw?.over64Pct,
        // Raw data for debugging
        rawAvailable: !!raw,
      });
    } catch (ejError) {
      console.error("EJScreen API error:", ejError);
      return NextResponse.json({
        note: "EPA EJScreen query failed. The service may be temporarily unavailable.",
        latitude,
        longitude,
        ejIndex: null,
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch EJScreen data" },
      { status: 500 }
    );
  }
}
