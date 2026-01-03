import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHL_LEASE_CUSTOM_FIELDS } from "@/lib/integrations/ghl-lease-fields";

/**
 * Debug endpoint to compare expected vs actual GHL custom fields
 * GET /api/debug/ghl-custom-fields
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get GHL integration
    const { data: ghlIntegration } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", userData.user.id)
      .eq("provider", "ghl")
      .single();

    if (!ghlIntegration?.config?.ghl_access_token || !ghlIntegration?.config?.ghl_location_id) {
      return NextResponse.json({ error: "GHL not connected" }, { status: 400 });
    }

    // Fetch custom fields from GHL
    const response = await fetch(
      `https://services.leadconnectorhq.com/locations/${ghlIntegration.config.ghl_location_id}/customFields`,
      {
        headers: {
          'Authorization': `Bearer ${ghlIntegration.config.ghl_access_token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: `Failed to fetch GHL fields: ${JSON.stringify(error)}` },
        { status: response.status }
      );
    }

    const { customFields } = await response.json();

    // Show ALL custom fields, not just lease_ ones
    const allGHLFields = customFields || [];

    // Filter to only lease-related fields (starting with "lease_")
    const ghlLeaseFields = allGHLFields.filter((f: any) =>
      f.key && f.key.startsWith('lease_')
    );

    // Build expected field keys list
    const expectedKeys = GHL_LEASE_CUSTOM_FIELDS.map(f => f.key);

    // Build actual field keys list from GHL
    const actualKeys = ghlLeaseFields.map((f: any) => f.key);

    // Find missing and extra fields
    const missingInGHL = expectedKeys.filter(key => !actualKeys.includes(key));
    const extraInGHL = actualKeys.filter((key: string) => !expectedKeys.includes(key));
    const matchingFields = expectedKeys.filter(key => actualKeys.includes(key));

    // Build detailed comparison
    const fieldComparison = GHL_LEASE_CUSTOM_FIELDS.map(expected => {
      const actual = ghlLeaseFields.find((f: any) => f.key === expected.key);
      return {
        key: expected.key,
        expectedName: expected.name,
        expectedType: expected.type,
        actualName: actual?.name || null,
        actualType: actual?.dataType || null,
        actualId: actual?.id || null,
        status: actual ? '✅ Found' : '❌ Missing',
      };
    });

    return NextResponse.json({
      summary: {
        totalExpected: expectedKeys.length,
        totalInGHL: ghlLeaseFields.length,
        totalAllFieldsInGHL: allGHLFields.length,
        matching: matchingFields.length,
        missing: missingInGHL.length,
        extra: extraInGHL.length,
      },
      missingInGHL,
      extraInGHL: extraInGHL.map((key: string) => {
        const field = ghlLeaseFields.find((f: any) => f.key === key);
        return {
          key,
          name: field?.name,
          type: field?.dataType,
          id: field?.id,
        };
      }),
      detailedComparison: fieldComparison,
      allGHLLeaseFields: ghlLeaseFields.map((f: any) => ({
        id: f.id,
        key: f.key,
        name: f.name,
        type: f.dataType,
      })),
      // NEW: Show all custom fields to help diagnose what's actually in GHL
      allCustomFieldsInGHL: allGHLFields.map((f: any) => ({
        id: f.id,
        key: f.key,
        name: f.name,
        type: f.dataType,
      })),
    }, { status: 200 });
  } catch (error: any) {
    console.error("GHL custom fields debug error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
