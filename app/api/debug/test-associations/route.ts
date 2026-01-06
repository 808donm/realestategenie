import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Test GHL associations API to see what schemas exist
 * GET /api/debug/test-associations?agentId=xxx
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let agentId = searchParams.get('agentId');

    if (!agentId) {
      const { data: agent } = await admin
        .from("agents")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      if (agent) agentId = agent.id;
    }

    if (!agentId) {
      return NextResponse.json({ error: "No agent found" }, { status: 400 });
    }

    // Get integration
    const { data: integration } = await admin
      .from("integrations")
      .select("*")
      .eq("agent_id", agentId)
      .eq("provider", "ghl")
      .single();

    if (!integration) {
      return NextResponse.json({ error: "No GHL integration" }, { status: 404 });
    }

    const config = integration.config as any;
    const accessToken = config.ghl_access_token || config.access_token;
    const locationId = config.ghl_location_id || config.location_id;

    // Test 1: Get association schemas
    console.log('[Associations Test] Fetching association schemas...');
    const schemasResponse = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}/customObjects/schemas`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    const schemasData = schemasResponse.ok ? await schemasResponse.json() : await schemasResponse.text();

    // Test 2: Try to get existing relations for the registrations object
    console.log('[Associations Test] Fetching existing relations...');
    const relationsResponse = await fetch(
      `https://services.leadconnectorhq.com/associations/relations?locationId=${locationId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    const relationsData = relationsResponse.ok ? await relationsResponse.json() : await relationsResponse.text();

    // Test 3: Try creating a test association with minimal payload
    console.log('[Associations Test] Attempting minimal association creation...');
    const testPayload = {
      locationId: locationId,
      associationLabel: 'Registrant',
      firstObjectKey: 'custom_objects.registrations',
      firstObjectId: 'test-registration-id',
      secondObjectKey: 'contact',
      secondObjectId: 'test-contact-id',
    };

    const testResponse = await fetch(
      `https://services.leadconnectorhq.com/associations/relations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
        body: JSON.stringify(testPayload),
      }
    );

    const testData = testResponse.ok ? await testResponse.json() : await testResponse.text();

    return NextResponse.json({
      success: true,
      locationId,
      tests: {
        schemas: {
          status: schemasResponse.status,
          statusText: schemasResponse.statusText,
          data: schemasData,
        },
        relations: {
          status: relationsResponse.status,
          statusText: relationsResponse.statusText,
          data: relationsData,
        },
        testCreate: {
          status: testResponse.status,
          statusText: testResponse.statusText,
          payload: testPayload,
          response: testData,
        },
      },
      analysis: {
        canReadSchemas: schemasResponse.ok,
        canReadRelations: relationsResponse.ok,
        canCreateRelations: testResponse.ok,
      },
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
