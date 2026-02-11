import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * QuickBooks Test Connection Endpoint
 * Tests the QuickBooks connection by fetching company info
 */
export async function POST() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[QBO Test] Testing QuickBooks connection for agent:", user.id);

    // Get integration
    const { data: integration, error: fetchError } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", user.id)
      .eq("provider", "qbo")
      .eq("status", "connected")
      .single();

    if (fetchError || !integration) {
      console.error("[QBO Test] No connected integration found");
      return NextResponse.json(
        { error: "QuickBooks not connected" },
        { status: 404 }
      );
    }

    const config = integration.config as any;

    if (!config.access_token || !config.realmId) {
      console.error("[QBO Test] Invalid integration config");
      return NextResponse.json(
        { error: "Invalid QuickBooks configuration" },
        { status: 400 }
      );
    }

    // Test connection by fetching company info
    console.log("[QBO Test] Fetching company info for realm:", config.realmId);

    const response = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${config.realmId}/companyinfo/${config.realmId}?minorversion=65`,
      {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${config.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[QBO Test] API request failed:", response.status, errorText);

      // Check if token is expired
      if (response.status === 401) {
        return NextResponse.json(
          { error: "Access token expired. Please reconnect QuickBooks." },
          { status: 401 }
        );
      }

      throw new Error(`QuickBooks API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("[QBO Test] Connection successful");

    return NextResponse.json({
      success: true,
      message: "QuickBooks connection successful",
      companyInfo: {
        CompanyName: data.CompanyInfo?.CompanyName,
        LegalName: data.CompanyInfo?.LegalName,
        Country: data.CompanyInfo?.Country,
      },
    });
  } catch (error: any) {
    console.error("[QBO Test] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to test QuickBooks connection" },
      { status: 500 }
    );
  }
}
