import { createClient } from "@supabase/supabase-js";
import { createTrestleClient, TrestleProperty } from "@/lib/integrations/trestle-client";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// ─── Types ──────────────────────────────────────────────────────────────────

interface FarmArea {
  id: string;
  agent_id: string;
  search_type: "zip" | "radius" | "tmk";
  postal_codes: string[] | null;
  center_lat: number | null;
  center_lng: number | null;
  radius_miles: number;
  tmk_prefix: string | null;
  property_types: string[];
  min_price: number | null;
  max_price: number | null;
  min_beds: number | null;
  min_baths: number | null;
  statuses: string[];
}

interface WatchRule {
  id: string;
  farm_area_id: string;
  agent_id: string;
  trigger_type: string;
  threshold_value: number | null;
  status_triggers: string[];
  notify_push: boolean;
  notify_email: boolean;
  notify_sms: boolean;
  is_active: boolean;
}

interface Snapshot {
  listing_key: string;
  standard_status: string;
  list_price: number;
  original_list_price: number | null;
  days_on_market: number | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  living_area: number | null;
  list_agent_name: string | null;
  list_office_name: string | null;
  photo_url: string | null;
}

interface AlertToCreate {
  agent_id: string;
  watch_rule_id: string;
  farm_area_id: string;
  listing_key: string;
  listing_id: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  alert_type: string;
  alert_title: string;
  alert_details: Record<string, any>;
}

// ─── Oahu TMK zone → zip mapping ───────────────────────────────────────────

const OAHU_ZONE_ZIPS: Record<string, string[]> = {
  "1": ["96813", "96817", "96819"],
  "2": ["96813", "96814", "96826"],
  "3": ["96815", "96816", "96822"],
  "4": ["96816", "96821", "96825"],
  "5": ["96734", "96730"],
  "6": ["96744"],
  "7": ["96762", "96717", "96730"],
  "8": ["96791", "96792"],
  "9": ["96797", "96789"],
};

function resolveTMKToZips(tmkPrefix: string): string[] {
  const parts = tmkPrefix.split("-");
  const zone = parts.length >= 2 ? parts[1] : "";
  return OAHU_ZONE_ZIPS[zone] || [];
}

// ─── Main Engine ────────────────────────────────────────────────────────────

export async function runWatchdogScan(): Promise<{
  farmAreasProcessed: number;
  listingsScanned: number;
  alertsCreated: number;
  errors: string[];
}> {
  const results = {
    farmAreasProcessed: 0,
    listingsScanned: 0,
    alertsCreated: 0,
    errors: [] as string[],
  };

  // 1. Get all active farm areas with active watch rules
  const { data: farmAreas, error: farmError } = await admin
    .from("mls_farm_areas")
    .select("*, mls_watch_rules(*)")
    .eq("is_active", true);

  if (farmError || !farmAreas) {
    results.errors.push(`Failed to load farm areas: ${farmError?.message}`);
    return results;
  }

  // Filter to farm areas that have at least one active watch rule
  const activeFarms = farmAreas.filter((fa: any) => fa.mls_watch_rules?.some((r: any) => r.is_active));

  if (activeFarms.length === 0) {
    return results;
  }

  // 2. Group farm areas by agent (to reuse Trestle connections)
  const agentFarms = new Map<string, typeof activeFarms>();
  for (const farm of activeFarms) {
    const list = agentFarms.get(farm.agent_id) || [];
    list.push(farm);
    agentFarms.set(farm.agent_id, list);
  }

  // 3. Process each agent's farm areas
  for (const [agentId, farms] of agentFarms) {
    try {
      // Get Trestle credentials for this agent
      const { data: integration } = await admin
        .from("integrations")
        .select("config")
        .eq("agent_id", agentId)
        .eq("provider", "trestle")
        .eq("status", "connected")
        .maybeSingle();

      if (!integration) {
        results.errors.push(`Agent ${agentId}: No Trestle connection`);
        continue;
      }

      const config = typeof integration.config === "string" ? JSON.parse(integration.config) : integration.config;

      const client = createTrestleClient(config);

      for (const farm of farms) {
        try {
          const alerts = await processFarmArea(client, farm as FarmArea & { mls_watch_rules: WatchRule[] });
          results.farmAreasProcessed++;
          results.listingsScanned += alerts.listingsScanned;

          if (alerts.newAlerts.length > 0) {
            const { error: insertError } = await admin.from("mls_watchdog_alerts").insert(alerts.newAlerts);

            if (insertError) {
              results.errors.push(`Alert insert error for farm ${farm.id}: ${insertError.message}`);
            } else {
              results.alertsCreated += alerts.newAlerts.length;
            }
          }
        } catch (err: any) {
          results.errors.push(`Farm ${farm.id}: ${err.message}`);
        }
      }
    } catch (err: any) {
      results.errors.push(`Agent ${agentId}: ${err.message}`);
    }
  }

  return results;
}

// ─── Process a Single Farm Area ─────────────────────────────────────────────

async function processFarmArea(
  client: ReturnType<typeof createTrestleClient>,
  farm: FarmArea & { mls_watch_rules: WatchRule[] },
): Promise<{ listingsScanned: number; newAlerts: AlertToCreate[] }> {
  const activeRules = farm.mls_watch_rules.filter((r) => r.is_active);
  if (activeRules.length === 0) return { listingsScanned: 0, newAlerts: [] };

  // Build OData filter for this farm area
  const filters: string[] = [];

  // Status filter
  const statuses = farm.statuses?.length > 0 ? farm.statuses : ["Active"];
  // For status_change rules, we also need to check Expired/Withdrawn/Canceled
  const hasStatusChangeRule = activeRules.some((r) => r.trigger_type === "status_change");
  const allStatuses = hasStatusChangeRule ? [...new Set([...statuses, "Expired", "Withdrawn", "Canceled"])] : statuses;

  if (allStatuses.length === 1) {
    filters.push(`StandardStatus eq '${allStatuses[0]}'`);
  } else {
    filters.push(`(${allStatuses.map((s) => `StandardStatus eq '${s}'`).join(" or ")})`);
  }

  // Geographic filter
  let zipCodes: string[] = [];
  if (farm.search_type === "zip" && farm.postal_codes?.length) {
    zipCodes = farm.postal_codes;
  } else if (farm.search_type === "tmk" && farm.tmk_prefix) {
    zipCodes = resolveTMKToZips(farm.tmk_prefix);
  }

  if (zipCodes.length === 1) {
    filters.push(`PostalCode eq '${zipCodes[0]}'`);
  } else if (zipCodes.length > 1) {
    filters.push(`(${zipCodes.map((z) => `PostalCode eq '${z}'`).join(" or ")})`);
  }

  // Property filters
  if (farm.property_types?.length > 0) {
    if (farm.property_types.length === 1) {
      filters.push(`PropertyType eq '${farm.property_types[0]}'`);
    } else {
      filters.push(`(${farm.property_types.map((t) => `PropertyType eq '${t}'`).join(" or ")})`);
    }
  }
  if (farm.min_price) filters.push(`ListPrice ge ${farm.min_price}`);
  if (farm.max_price) filters.push(`ListPrice le ${farm.max_price}`);
  if (farm.min_beds) filters.push(`BedroomsTotal ge ${farm.min_beds}`);
  if (farm.min_baths) filters.push(`BathroomsTotalInteger ge ${farm.min_baths}`);

  // Fetch current listings from Trestle
  const result = await client.getProperties({
    $filter: filters.join(" and "),
    $orderby: "ModificationTimestamp desc",
    $top: 500,
  });

  const currentListings = result.value || [];

  // Radius filtering (post-fetch)
  let filteredListings = currentListings;
  if (farm.search_type === "radius" && farm.center_lat && farm.center_lng) {
    filteredListings = currentListings.filter((p) => {
      if (!p.Latitude || !p.Longitude) return true;
      return haversineDistance(farm.center_lat!, farm.center_lng!, p.Latitude, p.Longitude) <= farm.radius_miles;
    });
  }

  // Get yesterday's snapshots for comparison
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const listingKeys = filteredListings.map((l) => l.ListingKey);
  const { data: previousSnapshots } = await admin
    .from("mls_listing_snapshots")
    .select("*")
    .in("listing_key", listingKeys.length > 0 ? listingKeys : ["__none__"])
    .eq("snapshot_date", yesterdayStr);

  const prevMap = new Map<string, Snapshot>();
  (previousSnapshots || []).forEach((s: any) => prevMap.set(s.listing_key, s));

  // Save today's snapshots
  const todayStr = new Date().toISOString().split("T")[0];
  const snapshots = filteredListings.map((p) => ({
    listing_key: p.ListingKey,
    listing_id: p.ListingId || null,
    standard_status: p.StandardStatus,
    list_price: p.ListPrice,
    original_list_price: p.OriginalListPrice || null,
    days_on_market: p.DaysOnMarket || null,
    cumulative_days_on_market: p.CumulativeDaysOnMarket || null,
    on_market_date: p.OnMarketDate || null,
    address: p.UnparsedAddress || [p.StreetNumber, p.StreetName, p.StreetSuffix].filter(Boolean).join(" ") || null,
    city: p.City || null,
    postal_code: p.PostalCode || null,
    property_type: p.PropertyType || null,
    bedrooms: p.BedroomsTotal || null,
    bathrooms: p.BathroomsTotalInteger || null,
    living_area: p.LivingArea || null,
    list_agent_name: p.ListAgentFullName || null,
    list_office_name: p.ListOfficeName || null,
    photo_url: p.Media?.[0]?.MediaURL || null,
    snapshot_date: todayStr,
  }));

  if (snapshots.length > 0) {
    await admin.from("mls_listing_snapshots").upsert(snapshots, { onConflict: "listing_key,snapshot_date" });
  }

  // Evaluate rules against each listing
  const newAlerts: AlertToCreate[] = [];

  for (const listing of filteredListings) {
    const prev = prevMap.get(listing.ListingKey);
    const address =
      listing.UnparsedAddress ||
      [listing.StreetNumber, listing.StreetName, listing.StreetSuffix].filter(Boolean).join(" ") ||
      "Unknown address";

    for (const rule of activeRules) {
      const alert = evaluateRule(rule, listing, prev, farm.id, address);
      if (alert) {
        newAlerts.push(alert);
      }
    }
  }

  // Check for new listings (listings in current that weren't in yesterday's snapshot)
  const hasNewListingRule = activeRules.find((r) => r.trigger_type === "new_listing");
  if (hasNewListingRule) {
    for (const listing of filteredListings) {
      if (!prevMap.has(listing.ListingKey) && listing.StandardStatus === "Active") {
        // Could be truly new or just newly matching — check OnMarketDate
        const onMarket = listing.OnMarketDate ? new Date(listing.OnMarketDate) : null;
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        if (onMarket && onMarket >= twoDaysAgo) {
          const address =
            listing.UnparsedAddress ||
            [listing.StreetNumber, listing.StreetName, listing.StreetSuffix].filter(Boolean).join(" ") ||
            "Unknown address";

          newAlerts.push({
            agent_id: hasNewListingRule.agent_id,
            watch_rule_id: hasNewListingRule.id,
            farm_area_id: farm.id,
            listing_key: listing.ListingKey,
            listing_id: listing.ListingId || null,
            address,
            city: listing.City || null,
            postal_code: listing.PostalCode || null,
            alert_type: "new_listing",
            alert_title: `New listing: ${address} — $${listing.ListPrice.toLocaleString()}`,
            alert_details: {
              listPrice: listing.ListPrice,
              propertyType: listing.PropertyType,
              beds: listing.BedroomsTotal,
              baths: listing.BathroomsTotalInteger,
              sqft: listing.LivingArea,
              listAgent: listing.ListAgentFullName,
            },
          });
        }
      }
    }
  }

  return { listingsScanned: filteredListings.length, newAlerts };
}

// ─── Rule Evaluation ────────────────────────────────────────────────────────

function evaluateRule(
  rule: WatchRule,
  listing: TrestleProperty,
  prev: Snapshot | undefined,
  farmAreaId: string,
  address: string,
): AlertToCreate | null {
  const threshold = rule.threshold_value || 0;

  switch (rule.trigger_type) {
    case "dom_threshold": {
      const dom = listing.DaysOnMarket || listing.CumulativeDaysOnMarket || 0;
      const prevDom = prev?.days_on_market || 0;
      // Alert when DOM crosses the threshold (wasn't above yesterday, is today)
      if (dom >= threshold && prevDom < threshold) {
        return {
          agent_id: rule.agent_id,
          watch_rule_id: rule.id,
          farm_area_id: farmAreaId,
          listing_key: listing.ListingKey,
          listing_id: listing.ListingId || null,
          address,
          city: listing.City || null,
          postal_code: listing.PostalCode || null,
          alert_type: "dom_threshold",
          alert_title: `${address} hit ${dom} days on market`,
          alert_details: {
            daysOnMarket: dom,
            threshold,
            listPrice: listing.ListPrice,
            originalListPrice: listing.OriginalListPrice,
          },
        };
      }
      break;
    }

    case "price_drop_amount": {
      if (!prev) break;
      const drop = prev.list_price - listing.ListPrice;
      if (drop >= threshold && drop > 0) {
        const originalPrice = listing.OriginalListPrice || prev.original_list_price || prev.list_price;
        const totalDrop = originalPrice - listing.ListPrice;
        const totalDropPct = originalPrice > 0 ? (totalDrop / originalPrice) * 100 : 0;

        return {
          agent_id: rule.agent_id,
          watch_rule_id: rule.id,
          farm_area_id: farmAreaId,
          listing_key: listing.ListingKey,
          listing_id: listing.ListingId || null,
          address,
          city: listing.City || null,
          postal_code: listing.PostalCode || null,
          alert_type: "price_drop_amount",
          alert_title: `Price dropped $${drop.toLocaleString()} on ${address}`,
          alert_details: {
            previousPrice: prev.list_price,
            currentPrice: listing.ListPrice,
            dropAmount: drop,
            originalPrice,
            totalDrop,
            totalDropPct: Math.round(totalDropPct * 10) / 10,
          },
        };
      }
      break;
    }

    case "price_drop_pct": {
      const originalPrice = listing.OriginalListPrice || listing.ListPrice;
      const totalDrop = originalPrice - listing.ListPrice;
      const totalDropPct = originalPrice > 0 ? (totalDrop / originalPrice) * 100 : 0;

      // Only alert if there's been a recent change (price different from yesterday)
      if (prev && prev.list_price !== listing.ListPrice && totalDropPct >= threshold) {
        return {
          agent_id: rule.agent_id,
          watch_rule_id: rule.id,
          farm_area_id: farmAreaId,
          listing_key: listing.ListingKey,
          listing_id: listing.ListingId || null,
          address,
          city: listing.City || null,
          postal_code: listing.PostalCode || null,
          alert_type: "price_drop_pct",
          alert_title: `${address} now ${totalDropPct.toFixed(1)}% below original price`,
          alert_details: {
            previousPrice: prev.list_price,
            currentPrice: listing.ListPrice,
            originalPrice,
            dropAmount: totalDrop,
            dropPct: Math.round(totalDropPct * 10) / 10,
          },
        };
      }
      break;
    }

    case "status_change": {
      if (!prev) break;
      const prevStatus = prev.standard_status;
      const newStatus = listing.StandardStatus;

      if (prevStatus !== newStatus && rule.status_triggers.includes(newStatus)) {
        // Special case: "Active" in status_triggers means "back on market"
        const isBackOnMarket = newStatus === "Active" && ["Pending", "Withdrawn", "Canceled"].includes(prevStatus);
        const title = isBackOnMarket ? `Back on market: ${address}` : `Status changed to ${newStatus}: ${address}`;

        return {
          agent_id: rule.agent_id,
          watch_rule_id: rule.id,
          farm_area_id: farmAreaId,
          listing_key: listing.ListingKey,
          listing_id: listing.ListingId || null,
          address,
          city: listing.City || null,
          postal_code: listing.PostalCode || null,
          alert_type: "status_change",
          alert_title: title,
          alert_details: {
            previousStatus: prevStatus,
            newStatus,
            isBackOnMarket,
            listPrice: listing.ListPrice,
            daysOnMarket: listing.DaysOnMarket,
          },
        };
      }
      break;
    }

    // new_listing is handled separately in processFarmArea
  }

  return null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
