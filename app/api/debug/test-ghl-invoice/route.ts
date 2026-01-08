import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";

/**
 * Debug: Test GHL Invoice API
 * GET /api/debug/test-ghl-invoice
 *
 * Tests if we can access the GHL invoices API with current token
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

    const ghlClient = new GHLClient(
      integration.config.ghl_access_token,
      integration.config.ghl_location_id
    );

    console.log("\n========================================");
    console.log("🧪 TESTING GHL INVOICE API");
    console.log("========================================");
    console.log("Location ID:", integration.config.ghl_location_id);
    console.log("========================================\n");

    // Try to list invoices first (GET request - should be less restrictive)
    try {
      console.log("📋 Attempting to list invoices...");
      const listResponse = await fetch(
        `https://services.leadconnectorhq.com/invoices/?locationId=${integration.config.ghl_location_id}`,
        {
          headers: {
            "Authorization": `Bearer ${integration.config.ghl_access_token}`,
            "Content-Type": "application/json",
            "Version": "2021-07-28",
          },
        }
      );

      console.log("List invoices status:", listResponse.status, listResponse.statusText);
      const listData = await listResponse.text();
      console.log("List invoices response:", listData);

      if (!listResponse.ok) {
        return NextResponse.json({
          error: "Cannot list invoices",
          status: listResponse.status,
          statusText: listResponse.statusText,
          response: listData,
          message: "Your GHL location may not have the Invoices feature enabled. Please check your GHL account settings."
        });
      }

      // If listing works, try creating a minimal test invoice
      console.log("\n✅ List successful, now testing invoice creation...");

      // Get a test contact first
      const contactsResponse = await fetch(
        `https://services.leadconnectorhq.com/contacts/?locationId=${integration.config.ghl_location_id}&limit=1`,
        {
          headers: {
            "Authorization": `Bearer ${integration.config.ghl_access_token}`,
            "Content-Type": "application/json",
            "Version": "2021-07-28",
          },
        }
      );

      const contactsData = await contactsResponse.json();
      const testContact = contactsData.contacts?.[0];

      if (!testContact) {
        return NextResponse.json({
          success: true,
          message: "Can list invoices but no contacts found to test invoice creation",
          listResponse: JSON.parse(listData)
        });
      }

      console.log("Using test contact:", testContact.id, testContact.email);

      // Try creating a minimal invoice
      const testInvoice = {
        locationId: integration.config.ghl_location_id,
        contactId: testContact.id,
        title: "Test Invoice - API Debug",
        currency: "USD",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 7 days from now
        items: [
          {
            name: "Test Item",
            description: "API connectivity test",
            price: 1.00,
            quantity: 1,
          },
        ],
        status: "draft", // Create as draft so it doesn't get sent
      };

      console.log("Creating test invoice with payload:", JSON.stringify(testInvoice, null, 2));

      const createResponse = await fetch(
        "https://services.leadconnectorhq.com/invoices/",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${integration.config.ghl_access_token}`,
            "Content-Type": "application/json",
            "Version": "2021-07-28",
          },
          body: JSON.stringify(testInvoice),
        }
      );

      console.log("Create invoice status:", createResponse.status, createResponse.statusText);
      const createData = await createResponse.text();
      console.log("Create invoice response:", createData);

      if (!createResponse.ok) {
        return NextResponse.json({
          error: "Cannot create invoice",
          status: createResponse.status,
          statusText: createResponse.statusText,
          response: createData,
          testPayload: testInvoice
        });
      }

      return NextResponse.json({
        success: true,
        message: "Invoice API is working!",
        testInvoice: JSON.parse(createData)
      });

    } catch (error) {
      console.error("Test error:", error);
      return NextResponse.json({
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Error testing GHL invoice:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
