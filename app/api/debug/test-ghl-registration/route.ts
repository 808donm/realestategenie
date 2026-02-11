import { NextResponse } from "next/server";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";
import { createOrUpdateGHLContact, createGHLOpenHouseRecord, createGHLRegistrationRecord } from "@/lib/notifications/ghl-service";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Diagnostic endpoint to test GHL registration creation
 * Call with: POST /api/debug/test-ghl-registration
 * Body: { "eventId": "your-open-house-event-id" }
 */
export async function POST(req: Request) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    steps: [],
    errors: [],
    success: false,
  };

  try {
    const body = await req.json();
    const eventId = body.eventId;

    if (!eventId) {
      return NextResponse.json({
        error: "Missing eventId in request body",
        diagnostics,
      }, { status: 400 });
    }

    diagnostics.steps.push(`Testing with eventId: ${eventId}`);

    // Step 1: Fetch event details
    diagnostics.steps.push("Step 1: Fetching open house event...");
    const { data: evt, error: evtErr } = await admin
      .from("open_house_events")
      .select("id,agent_id,address,start_at,end_at,beds,baths,sqft,price")
      .eq("id", eventId)
      .single();

    if (evtErr || !evt) {
      diagnostics.errors.push(`Event not found: ${evtErr?.message || 'Unknown error'}`);
      return NextResponse.json({ error: "Event not found", diagnostics }, { status: 404 });
    }

    diagnostics.steps.push(`✓ Event found: ${evt.address}`);
    diagnostics.event = evt;

    // Step 2: Check GHL integration
    diagnostics.steps.push("Step 2: Checking GHL integration...");
    const ghlConfig = await getValidGHLConfig(evt.agent_id);

    if (!ghlConfig) {
      diagnostics.errors.push("GHL integration not connected or token invalid");
      return NextResponse.json({
        error: "GHL not connected for this agent",
        diagnostics,
        recommendation: "Ensure the agent has connected their GHL account at /app/integrations"
      }, { status: 400 });
    }

    diagnostics.steps.push("✓ GHL integration active");
    diagnostics.ghlConfig = {
      hasAccessToken: !!ghlConfig.access_token,
      locationId: ghlConfig.location_id,
      hasPipeline: !!ghlConfig.ghl_pipeline_id,
    };

    // Step 3: Create test contact
    diagnostics.steps.push("Step 3: Creating test contact in GHL...");
    const testEmail = `test+${Date.now()}@example.com`;
    const testPhone = `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`;

    try {
      const contact = await createOrUpdateGHLContact({
        locationId: ghlConfig.location_id,
        accessToken: ghlConfig.access_token,
        email: testEmail,
        phone: testPhone,
        firstName: "Test",
        lastName: "User",
        source: "Diagnostic Test",
        tags: ["Test"],
      });

      const contactId = (contact as { id?: string })?.id;

      if (!contactId) {
        diagnostics.errors.push("Contact created but no ID returned");
        return NextResponse.json({
          error: "Contact creation failed - no ID returned",
          diagnostics,
        }, { status: 500 });
      }

      diagnostics.steps.push(`✓ Test contact created: ${contactId}`);
      diagnostics.contactId = contactId;

      // Step 4: Create OpenHouse custom object
      diagnostics.steps.push("Step 4: Creating OpenHouse custom object...");
      const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.realestategenie.app';
      const flyerUrl = `${origin}/api/open-houses/${eventId}/flyer`;

      let openHouseRecordId: string;
      try {
        openHouseRecordId = await createGHLOpenHouseRecord({
          locationId: ghlConfig.location_id,
          accessToken: ghlConfig.access_token,
          eventId: eventId,
          address: evt.address || '',
          startDateTime: evt.start_at,
          endDateTime: evt.end_at,
          flyerUrl,
          agentId: evt.agent_id,
          beds: evt.beds,
          baths: evt.baths,
          sqft: evt.sqft,
          price: evt.price,
        });

        diagnostics.steps.push(`✓ OpenHouse custom object created: ${openHouseRecordId}`);
        diagnostics.openHouseRecordId = openHouseRecordId;
      } catch (openHouseError: any) {
        diagnostics.errors.push(`OpenHouse creation failed: ${openHouseError.message}`);
        return NextResponse.json({
          error: "OpenHouse custom object creation failed",
          diagnostics,
          recommendation: "Verify that 'openhouses' custom object exists in GHL at Settings > Custom Objects. Field names must match exactly: openhouseid, address, startdatetime, enddatetime, flyerUrl, agentId, beds, baths, sqft, price",
        }, { status: 500 });
      }

      // Step 5: Create Registration custom object
      diagnostics.steps.push("Step 5: Creating Registration custom object...");
      try {
        const registrationId = await createGHLRegistrationRecord({
          locationId: ghlConfig.location_id,
          accessToken: ghlConfig.access_token,
          eventId: eventId,
          contactId: contactId,
          openHouseRecordId: openHouseRecordId,
        });

        diagnostics.steps.push(`✓ Registration custom object created: ${registrationId}`);
        diagnostics.registrationId = registrationId;
        diagnostics.success = true;

        return NextResponse.json({
          success: true,
          message: "All GHL objects created successfully!",
          diagnostics,
          nextSteps: [
            "Check GHL to verify the custom objects were created",
            "Verify associations are visible: Registration → Contact and Registration → OpenHouse",
            "Test email merge tags in a GHL workflow: {{registration.openHouses.address}}, {{registration.openHouses.flyerUrl}}",
          ],
        });
      } catch (registrationError: any) {
        diagnostics.errors.push(`Registration creation failed: ${registrationError.message}`);
        return NextResponse.json({
          error: "Registration custom object creation failed",
          diagnostics,
          recommendation: "Verify that 'registrations' custom object exists in GHL at Settings > Custom Objects. Field names must match: registrationid, contactid, openhouseid, registerdat, flyerstatus. Also verify associations are configured: registrations → contact and registrations → openhouses",
        }, { status: 500 });
      }
    } catch (contactError: any) {
      diagnostics.errors.push(`Contact creation failed: ${contactError.message}`);
      return NextResponse.json({
        error: "Contact creation failed",
        diagnostics,
        recommendation: "Verify GHL access token has 'contacts.write' permission. Check GHL API logs for more details.",
      }, { status: 500 });
    }
  } catch (error: any) {
    diagnostics.errors.push(`Unexpected error: ${error.message}`);
    return NextResponse.json({
      error: error.message,
      diagnostics,
    }, { status: 500 });
  }
}
