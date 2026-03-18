/**
 * GHL Custom Objects Auto-Setup
 * Automatically creates the OpenHouse and Registration custom object schemas
 * in a GHL sub-account after OAuth connection.
 */

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

interface GHLCustomObjectField {
  name: string;
  key: string;
  dataType: string;
  description?: string;
  isPrimary?: boolean;
}

function ghlHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Version: GHL_API_VERSION,
  };
}

/**
 * List existing custom objects for a location
 */
async function listCustomObjects(
  accessToken: string,
  locationId: string
): Promise<any[]> {
  const response = await fetch(
    `${GHL_BASE_URL}/objects/custom-objects?locationId=${locationId}`,
    { headers: ghlHeaders(accessToken) }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("[GHL Setup] Failed to list custom objects:", error);
    return [];
  }

  const data = await response.json();
  return data.customObjects || [];
}

/**
 * Create a custom object schema in GHL
 */
async function createCustomObjectSchema(
  accessToken: string,
  locationId: string,
  schema: {
    labels: { singular: string; plural: string };
    key: string;
    description?: string;
    primaryDisplayProperty: string;
    properties: Array<{
      name: string;
      key: string;
      dataType: string;
      isPrimary?: boolean;
      isRequired?: boolean;
      description?: string;
    }>;
  }
): Promise<{ success: boolean; objectKey?: string; error?: string }> {
  try {
    console.log(
      `[GHL Setup] Creating custom object: ${schema.labels.singular}...`
    );

    const response = await fetch(`${GHL_BASE_URL}/objects/custom-objects`, {
      method: "POST",
      headers: ghlHeaders(accessToken),
      body: JSON.stringify({
        locationId,
        labels: schema.labels,
        key: schema.key,
        description: schema.description || "",
        primaryDisplayProperty: schema.primaryDisplayProperty,
        properties: schema.properties,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[GHL Setup] Failed to create ${schema.labels.singular}:`,
        response.status,
        errorText
      );

      // Check if it already exists (conflict/duplicate error)
      if (response.status === 409 || response.status === 422) {
        try {
          const errorData = JSON.parse(errorText);
          if (
            errorData.message?.includes("already exists") ||
            errorData.message?.includes("duplicate") ||
            errorData.error?.includes("already exists")
          ) {
            console.log(
              `[GHL Setup] ${schema.labels.singular} already exists (this is fine)`
            );
            return { success: true, objectKey: schema.key };
          }
        } catch {
          // Not JSON
        }
      }

      return { success: false, error: errorText };
    }

    const data = await response.json();
    console.log(
      `[GHL Setup] Created ${schema.labels.singular}:`,
      data.customObject?.key || data.key
    );
    return {
      success: true,
      objectKey: data.customObject?.key || data.key || schema.key,
    };
  } catch (error: any) {
    console.error(
      `[GHL Setup] Error creating ${schema.labels.singular}:`,
      error.message
    );
    return { success: false, error: error.message };
  }
}

/**
 * Ensure the OpenHouse custom object exists in the GHL sub-account.
 * Creates it if missing.
 */
async function ensureOpenHouseObject(
  accessToken: string,
  locationId: string,
  existingObjects: any[]
): Promise<{ success: boolean; alreadyExisted: boolean; error?: string }> {
  const existing = existingObjects.find(
    (obj: any) =>
      obj.key === "custom_objects.openhouses" ||
      obj.objectKey === "custom_objects.openhouses" ||
      obj.name?.toLowerCase() === "openhouse" ||
      obj.name?.toLowerCase() === "openhouses"
  );

  if (existing) {
    console.log("[GHL Setup] OpenHouse object already exists");
    return { success: true, alreadyExisted: true };
  }

  const result = await createCustomObjectSchema(accessToken, locationId, {
    labels: { singular: "OpenHouse", plural: "OpenHouses" },
    key: "custom_objects.openhouses",
    description:
      "Open house events managed by Real Estate Genie. Each record represents a single open house event at a property.",
    primaryDisplayProperty: "address",
    properties: [
      {
        name: "Open House ID",
        key: "openhouseid",
        dataType: "TEXT",
        isPrimary: true,
        isRequired: true,
        description: "Unique ID from Real Estate Genie",
      },
      {
        name: "Address",
        key: "address",
        dataType: "TEXT",
        isRequired: true,
        description: "Full property address",
      },
      {
        name: "Start Date/Time",
        key: "startdatetime",
        dataType: "TEXT",
        description: "Open house start date and time (ISO format)",
      },
      {
        name: "End Date/Time",
        key: "enddatetime",
        dataType: "TEXT",
        description: "Open house end date and time (ISO format)",
      },
      {
        name: "Flyer URL",
        key: "flyerurl",
        dataType: "TEXT",
        description: "Link to the property flyer PDF",
      },
      {
        name: "Agent ID",
        key: "agentid",
        dataType: "TEXT",
        description: "Listing agent's UUID",
      },
      {
        name: "Beds",
        key: "beds",
        dataType: "TEXT",
        description: "Number of bedrooms",
      },
      {
        name: "Baths",
        key: "baths",
        dataType: "TEXT",
        description: "Number of bathrooms",
      },
      {
        name: "Sqft",
        key: "sqft",
        dataType: "TEXT",
        description: "Square footage",
      },
      {
        name: "Price",
        key: "price",
        dataType: "TEXT",
        description: "Listing price",
      },
    ],
  });

  return { success: result.success, alreadyExisted: false, error: result.error };
}

/**
 * Ensure the Registration custom object exists in the GHL sub-account.
 * Creates it if missing.
 */
async function ensureRegistrationObject(
  accessToken: string,
  locationId: string,
  existingObjects: any[]
): Promise<{ success: boolean; alreadyExisted: boolean; error?: string }> {
  const existing = existingObjects.find(
    (obj: any) =>
      obj.key === "custom_objects.registrations" ||
      obj.objectKey === "custom_objects.registrations" ||
      obj.name?.toLowerCase() === "registration" ||
      obj.name?.toLowerCase() === "registrations"
  );

  if (existing) {
    console.log("[GHL Setup] Registration object already exists");
    return { success: true, alreadyExisted: true };
  }

  const result = await createCustomObjectSchema(accessToken, locationId, {
    labels: { singular: "Registration", plural: "Registrations" },
    key: "custom_objects.registrations",
    description:
      "Open house check-in registrations managed by Real Estate Genie. Links a contact to an open house event.",
    primaryDisplayProperty: "registrationid",
    properties: [
      {
        name: "Registration ID",
        key: "registrationid",
        dataType: "TEXT",
        isPrimary: true,
        isRequired: true,
        description: "Unique registration identifier",
      },
      {
        name: "Contact ID",
        key: "contactid",
        dataType: "TEXT",
        description: "GHL contact ID of the registrant",
      },
      {
        name: "Open House ID",
        key: "openhouseid",
        dataType: "TEXT",
        description: "Event ID linking to the OpenHouse object",
      },
      {
        name: "Registered At",
        key: "registerdat",
        dataType: "TEXT",
        description: "Registration timestamp (ISO format)",
      },
      {
        name: "Flyer Status",
        key: "flyerstatus",
        dataType: "MULTISELECT",
        description: "Status of flyer delivery: pending, offered, sent",
      },
    ],
  });

  return { success: result.success, alreadyExisted: false, error: result.error };
}

/**
 * Main entry point: ensure both custom objects exist for a GHL sub-account.
 * Called automatically after OAuth callback.
 *
 * This is idempotent - safe to call multiple times.
 */
export async function ensureGHLCustomObjects(
  accessToken: string,
  locationId: string
): Promise<{
  success: boolean;
  openHouse: { success: boolean; alreadyExisted: boolean; error?: string };
  registration: { success: boolean; alreadyExisted: boolean; error?: string };
}> {
  console.log("[GHL Setup] Ensuring custom objects exist for location:", locationId);

  // List existing objects first to avoid unnecessary API calls
  const existingObjects = await listCustomObjects(accessToken, locationId);
  console.log(
    "[GHL Setup] Found existing custom objects:",
    existingObjects.map((o: any) => o.name || o.key)
  );

  // Create both objects (idempotent - skips if already exists)
  const openHouseResult = await ensureOpenHouseObject(
    accessToken,
    locationId,
    existingObjects
  );
  const registrationResult = await ensureRegistrationObject(
    accessToken,
    locationId,
    existingObjects
  );

  const allSuccess = openHouseResult.success && registrationResult.success;

  console.log("[GHL Setup] Custom objects setup complete:", {
    success: allSuccess,
    openHouse: openHouseResult,
    registration: registrationResult,
  });

  return {
    success: allSuccess,
    openHouse: openHouseResult,
    registration: registrationResult,
  };
}
