import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Debug: Check which invoice-related endpoints exist
 * GET /api/debug/check-invoice-endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

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

    // Try different possible invoice endpoint URLs
    const endpoints = [
      { name: "POST /invoices/", method: "POST", url: "https://services.leadconnectorhq.com/invoices/" },
      { name: "GET /invoices/", method: "GET", url: `https://services.leadconnectorhq.com/invoices/?locationId=${locationId}` },
      { name: "GET /invoices/templates", method: "GET", url: `https://services.leadconnectorhq.com/invoices/templates?locationId=${locationId}` },
      { name: "GET /payments/invoices/", method: "GET", url: `https://services.leadconnectorhq.com/payments/invoices/?locationId=${locationId}` },
    ];

    const results = [];

    for (const endpoint of endpoints) {
      const options: any = {
        method: endpoint.method,
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28",
        },
      };

      // For POST, add minimal body
      if (endpoint.method === "POST") {
        options.body = JSON.stringify({
          locationId: locationId,
          contactId: "test",
          title: "test",
          currency: "USD",
          items: []
        });
      }

      try {
        const response = await fetch(endpoint.url, options);
        const text = await response.text();

        results.push({
          endpoint: endpoint.name,
          method: endpoint.method,
          url: endpoint.url,
          status: response.status,
          statusText: response.statusText,
          response: text.substring(0, 200), // First 200 chars
        });
      } catch (error) {
        results.push({
          endpoint: endpoint.name,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return NextResponse.json({
      message: "Check which endpoints return what status codes",
      locationId,
      results,
      analysis: {
        "404": "Endpoint doesn't exist or URL is wrong",
        "403": "Endpoint exists but access is forbidden (scope or feature issue)",
        "401": "Authentication failed",
        "400": "Bad request (payload issue)",
        "200/201": "Success!"
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
