import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHL_LEASE_CUSTOM_FIELDS } from "@/lib/integrations/ghl-lease-fields";
import { getValidGHLToken } from "@/lib/integrations/ghl-token-refresh";

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

    // Get GHL integration with token refresh
    const ghlCredentials = await getValidGHLToken(userData.user.id);

    if (!ghlCredentials?.access_token || !ghlCredentials?.location_id) {
      return NextResponse.json({ error: "GHL not connected or token expired" }, { status: 400 });
    }

    // Fetch custom fields from GHL
    const response = await fetch(
      `https://services.leadconnectorhq.com/locations/${ghlCredentials.location_id}/customFields`,
      {
        headers: {
          'Authorization': `Bearer ${ghlCredentials.access_token}`,
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

    const responseData = await response.json();
    console.log("GHL API Raw Response:", JSON.stringify(responseData, null, 2));

    const { customFields } = responseData;

    // Show ALL custom fields, not just lease_ ones
    const allGHLFields = customFields || [];

    // Check what property names are available on the first field
    console.log("First field keys:", allGHLFields[0] ? Object.keys(allGHLFields[0]) : "No fields");
    console.log("First field full object:", JSON.stringify(allGHLFields[0], null, 2));

    // Try multiple possible property names for the field key
    // GHL uses fieldKey with "contact." prefix (e.g., "contact.lease_property_address")
    const ghlLeaseFields = allGHLFields.filter((f: any) => {
      const rawFieldKey = f.fieldKey || f.key || f.field_key || f.name || '';
      // Strip "contact." prefix if present
      const fieldKey = rawFieldKey.startsWith('contact.')
        ? rawFieldKey.substring('contact.'.length)
        : rawFieldKey;
      return fieldKey.startsWith('lease_');
    });

    // Build expected field keys list
    const expectedKeys = GHL_LEASE_CUSTOM_FIELDS.map(f => f.key);

    // Build actual field keys list from GHL
    const actualKeys = ghlLeaseFields.map((f: any) => {
      const rawFieldKey = f.fieldKey || f.key || f.field_key || f.name;
      // Strip "contact." prefix if present
      return rawFieldKey.startsWith('contact.')
        ? rawFieldKey.substring('contact.'.length)
        : rawFieldKey;
    });

    // Find missing and extra fields
    const missingInGHL = expectedKeys.filter(key => !actualKeys.includes(key));
    const extraInGHL = actualKeys.filter((key: string) => !expectedKeys.includes(key));
    const matchingFields = expectedKeys.filter(key => actualKeys.includes(key));

    // Build detailed comparison
    const fieldComparison = GHL_LEASE_CUSTOM_FIELDS.map(expected => {
      const actual = ghlLeaseFields.find((f: any) => {
        const rawFieldKey = f.fieldKey || f.key || f.field_key || f.name;
        const fieldKey = rawFieldKey.startsWith('contact.')
          ? rawFieldKey.substring('contact.'.length)
          : rawFieldKey;
        return fieldKey === expected.key;
      });
      return {
        key: expected.key,
        expectedName: expected.name,
        expectedType: expected.type,
        actualName: actual?.name || null,
        actualRawKey: actual?.fieldKey || actual?.key || actual?.field_key || null,
        actualKey: actual?.fieldKey?.startsWith('contact.')
          ? actual.fieldKey.substring('contact.'.length)
          : (actual?.key || actual?.fieldKey || actual?.field_key || null),
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
        const field = ghlLeaseFields.find((f: any) => {
          const rawFieldKey = f.fieldKey || f.key || f.field_key || f.name;
          const fieldKey = rawFieldKey.startsWith('contact.')
            ? rawFieldKey.substring('contact.'.length)
            : rawFieldKey;
          return fieldKey === key;
        });
        return {
          key,
          name: field?.name,
          actualRawKey: field?.fieldKey || field?.key || field?.field_key,
          type: field?.dataType,
          id: field?.id,
        };
      }),
      detailedComparison: fieldComparison,
      allGHLLeaseFields: ghlLeaseFields.map((f: any) => {
        const rawFieldKey = f.fieldKey || f.key || f.field_key || f.name;
        const strippedKey = rawFieldKey.startsWith('contact.')
          ? rawFieldKey.substring('contact.'.length)
          : rawFieldKey;
        return {
          id: f.id,
          rawFieldKey: f.fieldKey,
          strippedKey,
          name: f.name,
          type: f.dataType,
        };
      }),
      // NEW: Show all custom fields to help diagnose what's actually in GHL
      allCustomFieldsInGHL: allGHLFields.map((f: any) => ({
        id: f.id,
        key: f.key,
        fieldKey: f.fieldKey,
        field_key: f.field_key,
        name: f.name,
        type: f.dataType,
        // Show ALL properties for first 3 fields to understand structure
        ...( allGHLFields.indexOf(f) < 3 ? { _raw: f } : {} ),
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
