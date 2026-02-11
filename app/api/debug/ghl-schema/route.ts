import { NextResponse } from "next/server";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Diagnostic endpoint to fetch GHL custom object schema
 * Call with: GET /api/debug/ghl-schema?agentId=YOUR_AGENT_ID
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      // Try to get first agent
      const { data: agents } = await admin
        .from("agents")
        .select("id")
        .limit(1)
        .single();

      if (!agents) {
        return NextResponse.json({
          error: "No agent found. Provide agentId parameter."
        }, { status: 400 });
      }
    }

    const ghlConfig = await getValidGHLConfig(agentId!);

    if (!ghlConfig) {
      return NextResponse.json({
        error: "GHL not connected for this agent"
      }, { status: 400 });
    }

    // Fetch custom objects list
    const listResponse = await fetch(
      `https://services.leadconnectorhq.com/objects/custom-objects?locationId=${ghlConfig.location_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ghlConfig.access_token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    if (!listResponse.ok) {
      const error = await listResponse.text();
      return NextResponse.json({
        error: "Failed to fetch custom objects list",
        details: error
      }, { status: 500 });
    }

    const listData = await listResponse.json();
    const customObjects = listData.customObjects || [];

    // Find openhouses and registrations objects
    const openHousesObj = customObjects.find((obj: any) =>
      obj.name?.toLowerCase().includes('openhouse') ||
      obj.objectKey?.toLowerCase().includes('openhouse')
    );

    const registrationsObj = customObjects.find((obj: any) =>
      obj.name?.toLowerCase().includes('registration') ||
      obj.objectKey?.toLowerCase().includes('registration')
    );

    if (!openHousesObj) {
      return NextResponse.json({
        error: "OpenHouses custom object not found in GHL",
        availableObjects: customObjects.map((obj: any) => ({
          name: obj.name,
          objectKey: obj.objectKey,
          id: obj.id,
        })),
        recommendation: "Create a custom object for open houses in GHL Settings → Custom Objects"
      }, { status: 404 });
    }

    if (!registrationsObj) {
      return NextResponse.json({
        error: "Registrations custom object not found in GHL",
        availableObjects: customObjects.map((obj: any) => ({
          name: obj.name,
          objectKey: obj.objectKey,
          id: obj.id,
        })),
        recommendation: "Create a custom object for registrations in GHL Settings → Custom Objects"
      }, { status: 404 });
    }

    // Fetch detailed schema for each object
    const openHousesSchemaResponse = await fetch(
      `https://services.leadconnectorhq.com/objects/custom-objects/${openHousesObj.id}?locationId=${ghlConfig.location_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ghlConfig.access_token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    const registrationsSchemaResponse = await fetch(
      `https://services.leadconnectorhq.com/objects/custom-objects/${registrationsObj.id}?locationId=${ghlConfig.location_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ghlConfig.access_token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    const openHousesSchema = openHousesSchemaResponse.ok
      ? await openHousesSchemaResponse.json()
      : null;

    const registrationsSchema = registrationsSchemaResponse.ok
      ? await registrationsSchemaResponse.json()
      : null;

    return NextResponse.json({
      success: true,
      locationId: ghlConfig.location_id,
      openHouses: {
        name: openHousesObj.name,
        objectKey: openHousesObj.objectKey,
        id: openHousesObj.id,
        fields: openHousesSchema?.customObject?.fields?.map((field: any) => ({
          name: field.name,
          key: field.key,
          type: field.type,
          required: field.required,
        })) || [],
      },
      registrations: {
        name: registrationsObj.name,
        objectKey: registrationsObj.objectKey,
        id: registrationsObj.id,
        fields: registrationsSchema?.customObject?.fields?.map((field: any) => ({
          name: field.name,
          key: field.key,
          type: field.type,
          required: field.required,
        })) || [],
      },
      currentCodeUsing: {
        openHouses: {
          openhouseid: "Text field",
          address: "Text field",
          startdatetime: "DateTime field",
          enddatetime: "DateTime field",
          flyerUrl: "Text field ❌ FAILING",
          agentId: "Text field",
          beds: "Text/Number field",
          baths: "Text/Number field",
          sqft: "Text/Number field",
          price: "Text/Number field",
        },
        registrations: {
          registrationid: "Text field",
          contactid: "Text field",
          openhouseid: "Text field",
          registerdat: "DateTime field",
          flyerstatus: "Multi-Select field",
        },
      },
      nextSteps: [
        "Compare 'fields.key' in the schema above with 'currentCodeUsing' field names",
        "Update /home/user/realestategenie/src/lib/notifications/ghl-service.ts with the correct field keys",
        "Field names are case-sensitive - they must match exactly",
      ],
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
