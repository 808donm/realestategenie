import { NextResponse } from "next/server";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Diagnostic endpoint to check a specific Registration record in GHL
 * Call with: GET /api/debug/check-ghl-registration?registrationId=RECORD_ID&agentId=AGENT_ID
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const registrationId = searchParams.get('registrationId');
    const agentId = searchParams.get('agentId');

    if (!registrationId || !agentId) {
      return NextResponse.json({
        error: "Missing required parameters: registrationId and agentId"
      }, { status: 400 });
    }

    const ghlConfig = await getValidGHLConfig(agentId);

    if (!ghlConfig) {
      return NextResponse.json({
        error: "GHL not connected for this agent"
      }, { status: 400 });
    }

    // Fetch the Registration record
    const registrationResponse = await fetch(
      `https://services.leadconnectorhq.com/objects/custom_objects.registrations/records/${registrationId}?locationId=${ghlConfig.location_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ghlConfig.access_token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    if (!registrationResponse.ok) {
      const error = await registrationResponse.text();
      return NextResponse.json({
        error: "Failed to fetch Registration record",
        details: error
      }, { status: 500 });
    }

    const registrationData = await registrationResponse.json();
    const registration = registrationData.record;

    // Fetch associations for this Registration
    const associationsResponse = await fetch(
      `https://services.leadconnectorhq.com/associations/?locationId=${ghlConfig.location_id}&firstObjectKey=custom_objects.registrations&firstObjectId=${registrationId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ghlConfig.access_token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    let associations = [];
    if (associationsResponse.ok) {
      const assocData = await associationsResponse.json();
      associations = assocData.associations || [];
    }

    // Find the OpenHouse association
    const openHouseAssoc = associations.find((a: any) =>
      a.secondObjectKey === 'custom_objects.openhouses'
    );

    let openHouseData = null;
    if (openHouseAssoc?.secondObjectId) {
      // Fetch the actual OpenHouse record
      const openHouseResponse = await fetch(
        `https://services.leadconnectorhq.com/objects/custom_objects.openhouses/records/${openHouseAssoc.secondObjectId}?locationId=${ghlConfig.location_id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ghlConfig.access_token}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28',
          },
        }
      );

      if (openHouseResponse.ok) {
        openHouseData = await openHouseResponse.json();
      }
    }

    return NextResponse.json({
      success: true,
      registration: {
        id: registration.id,
        properties: registration.properties,
        createdAt: registration.createdAt,
      },
      associations: {
        total: associations.length,
        list: associations.map((a: any) => ({
          secondObjectKey: a.secondObjectKey,
          secondObjectId: a.secondObjectId,
        })),
        hasOpenHouseAssociation: !!openHouseAssoc,
        openHouseId: openHouseAssoc?.secondObjectId,
      },
      openHouse: openHouseData ? {
        id: openHouseData.record?.id,
        properties: openHouseData.record?.properties,
        createdAt: openHouseData.record?.createdAt,
      } : null,
      diagnosis: {
        registrationExists: !!registration,
        associationExists: !!openHouseAssoc,
        openHouseExists: !!openHouseData,
        openHouseHasAddress: !!openHouseData?.record?.properties?.address,
        openHouseHasFlyerUrl: !!openHouseData?.record?.properties?.flyerurl,
        openHouseHasAgentId: !!openHouseData?.record?.properties?.agentid,
      },
      recommendations: generateRecommendations(registration, openHouseAssoc, openHouseData),
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

function generateRecommendations(registration: any, openHouseAssoc: any, openHouseData: any): string[] {
  const recommendations: string[] = [];

  if (!registration) {
    recommendations.push("❌ Registration record not found in GHL");
    return recommendations;
  }

  if (!openHouseAssoc) {
    recommendations.push("❌ No association found between Registration → OpenHouse");
    recommendations.push("💡 Check server logs for association creation errors");
    recommendations.push("💡 Verify association is configured in GHL Settings → Custom Objects → Registrations → Associations");
    return recommendations;
  }

  if (!openHouseData) {
    recommendations.push("❌ OpenHouse record not found (but association exists)");
    recommendations.push("💡 The OpenHouse ID in the association might be invalid");
    return recommendations;
  }

  const props = openHouseData.record?.properties || {};

  if (!props.address) {
    recommendations.push("⚠️ OpenHouse 'address' field is empty");
  }

  if (!props.flyerurl) {
    recommendations.push("⚠️ OpenHouse 'flyerurl' field is empty");
  }

  if (!props.agentid) {
    recommendations.push("⚠️ OpenHouse 'agentid' field is empty");
  }

  if (props.flyerUrl && !props.flyerurl) {
    recommendations.push("❌ Field name mismatch: Found 'flyerUrl' (camelCase) but should be 'flyerurl' (lowercase)");
    recommendations.push("💡 Update field name in GHL custom object to 'flyerurl' (all lowercase)");
  }

  if (props.agentId && !props.agentid) {
    recommendations.push("❌ Field name mismatch: Found 'agentId' (camelCase) but should be 'agentid' (lowercase)");
    recommendations.push("💡 Update field name in GHL custom object to 'agentid' (all lowercase)");
  }

  if (recommendations.length === 0) {
    recommendations.push("✅ Everything looks correct!");
    recommendations.push("✅ Registration exists with proper OpenHouse association");
    recommendations.push("✅ OpenHouse has all required fields populated");
    recommendations.push("💡 Use these merge tags in your GHL email:");
    recommendations.push("   {{registration.openHouses.address}}");
    recommendations.push("   {{registration.openHouses.flyerurl}}");
    recommendations.push("   {{registration.openHouses.agentid}}");
  }

  return recommendations;
}
