import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Debug: Test GHL Invoice API with minimal raw request
 * GET /api/debug/test-ghl-invoice-raw
 *
 * Tests the exact raw API call to GHL to see what's wrong
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get GHL integration
    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .single();

    if (!integration?.config?.ghl_access_token) {
      return NextResponse.json({ error: "No GHL integration found" }, { status: 404 });
    }

    const accessToken = integration.config.ghl_access_token;
    const locationId = integration.config.ghl_location_id;

    // First, get a contact to use for testing
    const contactsResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=1`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28",
        },
      }
    );

    if (!contactsResponse.ok) {
      return NextResponse.json({
        error: "Cannot fetch contacts",
        status: contactsResponse.status,
        response: await contactsResponse.text()
      });
    }

    const contactsData = await contactsResponse.json();
    const testContact = contactsData.contacts?.[0];

    if (!testContact) {
      return NextResponse.json({
        error: "No contacts found in your GHL account. Please create a contact first."
      });
    }

    console.log("\n========================================");
    console.log("🧪 RAW GHL INVOICE API TEST");
    console.log("========================================");
    console.log("Location ID:", locationId);
    console.log("Contact ID:", testContact.id);
    console.log("Contact Email:", testContact.email);
    console.log("========================================\n");

    // Test different API versions and endpoints
    const tests = [
      {
        name: "Standard v2021-07-28",
        url: "https://services.leadconnectorhq.com/invoices/",
        version: "2021-07-28",
      },
      {
        name: "Latest version header",
        url: "https://services.leadconnectorhq.com/invoices/",
        version: "2021-04-15", // Older version
      },
      {
        name: "No version header",
        url: "https://services.leadconnectorhq.com/invoices/",
        version: null,
      },
    ];

    const results = [];

    for (const test of tests) {
      console.log(`\nTesting: ${test.name}`);
      console.log(`URL: ${test.url}`);
      console.log(`Version: ${test.version || 'none'}`);

      const payload = {
        locationId: locationId,
        contactId: testContact.id,
        title: "API Test Invoice",
        currency: "USD",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        items: [
          {
            name: "Test Item",
            description: "Testing API connectivity",
            price: 1.00,
            quantity: 1,
          },
        ],
        status: "draft",
      };

      const headers: any = {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };

      if (test.version) {
        headers["Version"] = test.version;
      }

      console.log("Payload:", JSON.stringify(payload, null, 2));
      console.log("Headers:", JSON.stringify(headers, null, 2));

      const response = await fetch(test.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let responseJson;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        responseJson = responseText;
      }

      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log(`Response:`, responseJson);

      results.push({
        test: test.name,
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        response: responseJson,
        headers: Object.fromEntries(response.headers.entries()),
      });

      // If one succeeds, stop testing
      if (response.ok) {
        console.log("✅ SUCCESS! Found working configuration");
        break;
      }
    }

    return NextResponse.json({
      locationId,
      testContact: {
        id: testContact.id,
        email: testContact.email,
      },
      results,
      recommendation: results.some(r => r.success)
        ? "✅ Found a working configuration!"
        : "❌ All attempts failed. This might be a GHL account-level API restriction. Please contact GHL support.",
    });

  } catch (error) {
    console.error("Error testing GHL invoice:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
