/**
 * Bi-Directional Open House Sync Engine
 *
 * Pull: Fetches open houses from Trestle MLS and creates matching events in our app.
 * Push: When agents create open houses locally, prepares data for MLS submission.
 */
import { SupabaseClient } from "@supabase/supabase-js";
import type { TrestleClient, TrestleOpenHouse, TrestleProperty } from "@/lib/integrations/trestle-client";

export interface SyncResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  details: { address: string; action: string; openHouseKey: string }[];
}

/**
 * Pull open houses from MLS and create/update local events.
 */
export async function pullOpenHousesFromMLS(
  client: TrestleClient,
  supabase: SupabaseClient,
  agentId: string,
  options?: { daysAhead?: number; listingKey?: string }
): Promise<SyncResult> {
  const result: SyncResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  try {
    // Fetch upcoming open houses from MLS
    const ohResult = await client.getUpcomingOpenHouses({
      daysAhead: options?.daysAhead || 30,
      listingKey: options?.listingKey,
      limit: 50,
    });

    if (ohResult.value.length === 0) {
      return result;
    }

    // Get associated property details for addresses
    const listingKeys = [...new Set(ohResult.value.map((oh) => oh.ListingKey))];
    const propertyMap = new Map<string, TrestleProperty>();

    // Fetch properties in batches
    for (const key of listingKeys) {
      try {
        const prop = await client.getProperty(key);
        propertyMap.set(key, prop);
      } catch {
        // Skip properties we can't fetch
      }
    }

    // Check which open houses already exist locally
    const ohKeys = ohResult.value.map((oh) => oh.OpenHouseKey);
    const { data: existingEvents } = await supabase
      .from("open_house_events")
      .select("id, mls_open_house_key")
      .eq("agent_id", agentId)
      .in("mls_open_house_key", ohKeys);

    const existingKeyMap = new Map(
      (existingEvents || []).map((e) => [e.mls_open_house_key, e.id])
    );

    for (const oh of ohResult.value) {
      const property = propertyMap.get(oh.ListingKey);
      if (!property) {
        result.skipped++;
        continue;
      }

      const address = property.UnparsedAddress ||
        [property.StreetNumber, property.StreetName, property.StreetSuffix].filter(Boolean).join(" ") +
        `, ${property.City}, ${property.StateOrProvince} ${property.PostalCode}`;

      // Parse date and times
      const startAt = parseOpenHouseDateTime(oh.OpenHouseDate, oh.OpenHouseStartTime);
      const endAt = parseOpenHouseDateTime(oh.OpenHouseDate, oh.OpenHouseEndTime);

      if (!startAt || !endAt) {
        result.errors.push(`Invalid date/time for OH ${oh.OpenHouseKey}`);
        continue;
      }

      const existingId = existingKeyMap.get(oh.OpenHouseKey);

      if (existingId) {
        // Update existing event
        const { error } = await supabase
          .from("open_house_events")
          .update({
            start_at: startAt,
            end_at: endAt,
            mls_synced_at: new Date().toISOString(),
          })
          .eq("id", existingId);

        if (error) {
          result.errors.push(`Update failed for ${address}: ${error.message}`);
        } else {
          result.updated++;
          result.details.push({ address, action: "updated", openHouseKey: oh.OpenHouseKey });
        }
      } else {
        // Create new event
        const { error } = await supabase.from("open_house_events").insert({
          agent_id: agentId,
          address,
          start_at: startAt,
          end_at: endAt,
          status: "draft",
          beds: property.BedroomsTotal || null,
          baths: property.BathroomsTotalInteger || null,
          sqft: property.LivingArea || null,
          price: property.ListPrice || null,
          listing_description: property.PublicRemarks || null,
          property_photo_url: property.Media?.[0]?.MediaURL || null,
          latitude: property.Latitude || null,
          longitude: property.Longitude || null,
          mls_listing_key: property.ListingKey,
          mls_listing_id: property.ListingId,
          mls_open_house_key: oh.OpenHouseKey,
          mls_synced_at: new Date().toISOString(),
          mls_source: "mls",
        });

        if (error) {
          result.errors.push(`Import failed for ${address}: ${error.message}`);
        } else {
          result.imported++;
          result.details.push({ address, action: "imported", openHouseKey: oh.OpenHouseKey });
        }
      }
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : "Unknown sync error");
  }

  return result;
}

/**
 * Get local open houses that haven't been synced to MLS yet.
 * These are candidates for pushing to MLS.
 */
export async function getUnsyncedLocalEvents(
  supabase: SupabaseClient,
  agentId: string
): Promise<{ id: string; address: string; startAt: string; endAt: string }[]> {
  const { data } = await supabase
    .from("open_house_events")
    .select("id, address, start_at, end_at")
    .eq("agent_id", agentId)
    .eq("status", "published")
    .is("mls_open_house_key", null)
    .gte("start_at", new Date().toISOString());

  return (data || []).map((e) => ({
    id: e.id,
    address: e.address,
    startAt: e.start_at,
    endAt: e.end_at,
  }));
}

/** Parse Trestle date + time into ISO timestamp */
function parseOpenHouseDateTime(date: string, time: string): string | null {
  try {
    // Date: "2026-03-15", Time: "10:00:00" or "10:00 AM"
    const dateStr = date.split("T")[0]; // Handle ISO dates
    if (time.includes("AM") || time.includes("PM")) {
      return new Date(`${dateStr} ${time}`).toISOString();
    }
    return new Date(`${dateStr}T${time}`).toISOString();
  } catch {
    return null;
  }
}
