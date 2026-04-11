/**
 * Market Monitor Engine
 *
 * Automated MLS alert system for buyer/seller clients. Scans
 * MLS listings daily via Trestle, detects changes (new listings,
 * price drops, status changes), and sends alerts via email, SMS,
 * and CRM to the agent's clients.
 *
 * Alert types:
 *   - new_listing:       Listing matches client criteria, not seen before
 *   - price_drop:        List price decreased since last snapshot
 *   - back_on_market:    Pending -> Active (fell out of escrow)
 *   - expired_withdrawn: Active -> Expired/Withdrawn/Canceled
 *   - pending:           Active -> Pending (under contract)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";
import { TrestleProperty } from "@/lib/integrations/trestle-client";
import { parseTMKInput, getZipsForTMKSection } from "@/lib/hawaii-tmk-zip";

// ── Types ────────────────────────────────────────────────────────

export interface MonitorSearchCriteria {
  zip_codes?: string[];
  city?: string;
  tmk?: string; // Hawaii TMK (e.g., "1-2-9") -- resolved to ZIPs, post-filtered by ParcelNumber
  beds_min?: number;
  beds_max?: number;
  baths_min?: number;
  baths_max?: number;
  price_min?: number;
  price_max?: number;
  property_types?: string[];
}

export interface MonitorRunSummary {
  profileId: string;
  clientName: string;
  newListings: number;
  priceDrops: number;
  backOnMarket: number;
  expiredWithdrawn: number;
  pending: number;
  notificationsSent: number;
  errors: string[];
}

interface DetectedAlert {
  listingKey: string;
  listingId?: string;
  address: string;
  city: string;
  postalCode: string;
  photoUrl?: string;
  propertyType?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  listPrice: number;
  alertType: "new_listing" | "price_drop" | "back_on_market" | "expired_withdrawn" | "pending";
  alertTitle: string;
  alertDetails: Record<string, any>;
}

// ── Supabase Admin ───────────────────────────────────────────────

let _admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}

// ── Main Engine ─────────────────────────────────────────────────

export async function runMonitorProfile(profileId: string): Promise<MonitorRunSummary> {
  const admin = getAdmin();

  const summary: MonitorRunSummary = {
    profileId,
    clientName: "",
    newListings: 0,
    priceDrops: 0,
    backOnMarket: 0,
    expiredWithdrawn: 0,
    pending: 0,
    notificationsSent: 0,
    errors: [],
  };

  // 1. Load profile
  const { data: profile, error: profileErr } = await admin
    .from("market_monitor_profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (profileErr || !profile) {
    summary.errors.push(`Profile not found: ${profileErr?.message}`);
    return summary;
  }

  summary.clientName = profile.client_name;
  const criteria = profile.search_criteria as MonitorSearchCriteria;
  const previousKeys = new Set<string>(profile.watched_listing_keys || []);

  // 2. Get agent's Trestle client
  const trestle = await getTrestleClient(admin, profile.agent_id);
  if (!trestle) {
    summary.errors.push("MLS not connected for this agent");
    return summary;
  }

  // 3. Build OData filter from criteria
  const filterResult = buildODataFilter(criteria);
  if (!filterResult) {
    summary.errors.push("Invalid search criteria - no location filter");
    return summary;
  }

  try {
    // 4. Query MLS for matching listings (all statuses for change detection)
    const result = await trestle.getProperties({
      $filter: filterResult.filter,
      $select: [
        "ListingKey", "ListingId", "StandardStatus", "PropertyType",
        "ListPrice", "OriginalListPrice", "UnparsedAddress",
        "StreetNumber", "StreetName", "StreetSuffix",
        "City", "StateOrProvince", "PostalCode",
        "BedroomsTotal", "BathroomsTotalInteger", "LivingArea", "YearBuilt",
        "DaysOnMarket", "OnMarketDate",
        "ParcelNumber",
        "Media",
      ].join(","),
      $orderby: "ModificationTimestamp desc",
      $top: 500,
      $count: true,
      $expand: "Media($select=MediaURL,Order;$top=1;$orderby=Order)",
    });

    // Post-filter by TMK ParcelNumber prefix if TMK search
    let currentListings = result.value || [];
    if (filterResult.tmkPrefix) {
      const prefix = filterResult.tmkPrefix;
      currentListings = currentListings.filter((l: any) =>
        l.ParcelNumber && String(l.ParcelNumber).startsWith(prefix),
      );
    }

    const currentKeys = new Set<string>();
    const currentByKey = new Map<string, TrestleProperty>();

    for (const l of currentListings) {
      if (l.ListingKey) {
        currentKeys.add(l.ListingKey);
        currentByKey.set(l.ListingKey, l);
      }
    }

    // 5. Load yesterday's snapshots for the same postal codes
    const zipCodes = criteria.zip_codes || [];
    const snapshotsByKey = new Map<string, any>();

    if (zipCodes.length > 0) {
      const { data: snapshots } = await admin
        .from("mls_listing_snapshots")
        .select("*")
        .in("postal_code", zipCodes)
        .gte("snapshot_date", new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0])
        .order("snapshot_date", { ascending: false });

      if (snapshots) {
        for (const s of snapshots) {
          if (!snapshotsByKey.has(s.listing_key)) {
            snapshotsByKey.set(s.listing_key, s);
          }
        }
      }
    }

    // 6. Detect changes
    const alerts: DetectedAlert[] = [];

    for (const [key, listing] of currentByKey) {
      const address = listing.UnparsedAddress ||
        [listing.StreetNumber, listing.StreetName, listing.StreetSuffix].filter(Boolean).join(" ") ||
        "Unknown Address";
      const city = listing.City || "";
      const postalCode = listing.PostalCode?.substring(0, 5) || "";
      const photoUrl = (listing as any).Media?.[0]?.MediaURL || undefined;
      const listPrice = listing.ListPrice || 0;

      const base: Omit<DetectedAlert, "alertType" | "alertTitle" | "alertDetails"> = {
        listingKey: key,
        listingId: listing.ListingId,
        address,
        city,
        postalCode,
        photoUrl,
        propertyType: listing.PropertyType,
        beds: listing.BedroomsTotal,
        baths: listing.BathroomsTotalInteger,
        sqft: listing.LivingArea,
        yearBuilt: listing.YearBuilt,
        listPrice,
      };

      const snapshot = snapshotsByKey.get(key);
      const status = listing.StandardStatus || "Active";

      // New Listing: Active, not in previous watched keys
      if (status === "Active" && !previousKeys.has(key) && profile.alert_new_listing) {
        alerts.push({
          ...base,
          alertType: "new_listing",
          alertTitle: `New listing: ${address}`,
          alertDetails: { listPrice, beds: listing.BedroomsTotal, baths: listing.BathroomsTotalInteger, sqft: listing.LivingArea, propertyType: listing.PropertyType },
        });
        summary.newListings++;
      }

      // Price Drop: price decreased from snapshot
      if (snapshot && listPrice > 0 && snapshot.list_price > 0 && listPrice < Number(snapshot.list_price) && profile.alert_price_drop) {
        const dropAmount = Number(snapshot.list_price) - listPrice;
        const dropPct = Math.round((dropAmount / Number(snapshot.list_price)) * 1000) / 10;
        alerts.push({
          ...base,
          alertType: "price_drop",
          alertTitle: `Price drop: ${address} (-$${dropAmount.toLocaleString()})`,
          alertDetails: { previousPrice: Number(snapshot.list_price), currentPrice: listPrice, dropAmount, dropPct },
        });
        summary.priceDrops++;
      }

      // Back on Market: was Pending, now Active
      if (snapshot && snapshot.standard_status === "Pending" && status === "Active" && profile.alert_back_on_market) {
        alerts.push({
          ...base,
          alertType: "back_on_market",
          alertTitle: `Back on market: ${address}`,
          alertDetails: { previousStatus: "Pending", listPrice },
        });
        summary.backOnMarket++;
      }

      // Expired/Withdrawn: was Active, now Expired/Withdrawn/Canceled
      if (snapshot && snapshot.standard_status === "Active" && ["Expired", "Withdrawn", "Canceled"].includes(status) && profile.alert_expired_withdrawn) {
        alerts.push({
          ...base,
          alertType: "expired_withdrawn",
          alertTitle: `${status}: ${address}`,
          alertDetails: { previousStatus: "Active", newStatus: status },
        });
        summary.expiredWithdrawn++;
      }

      // Pending: was Active, now Pending
      if (snapshot && snapshot.standard_status === "Active" && status === "Pending" && profile.alert_pending) {
        alerts.push({
          ...base,
          alertType: "pending",
          alertTitle: `Pending: ${address}`,
          alertDetails: { listPrice },
        });
        summary.pending++;
      }
    }

    // 7. Insert alerts (skip duplicates via unique index)
    if (alerts.length > 0) {
      const rows = alerts.map((a) => ({
        profile_id: profileId,
        agent_id: profile.agent_id,
        listing_key: a.listingKey,
        listing_id: a.listingId,
        address: a.address,
        city: a.city,
        postal_code: a.postalCode,
        photo_url: a.photoUrl,
        property_type: a.propertyType,
        beds: a.beds,
        baths: a.baths,
        sqft: a.sqft,
        year_built: a.yearBuilt,
        list_price: a.listPrice,
        alert_type: a.alertType,
        alert_title: a.alertTitle,
        alert_details: a.alertDetails,
      }));

      const { error: insertErr } = await admin
        .from("market_monitor_alerts")
        .upsert(rows, { onConflict: "profile_id,listing_key,alert_type,created_date", ignoreDuplicates: true });

      if (insertErr) {
        summary.errors.push(`Alert insert error: ${insertErr.message}`);
      }
    }

    // 8. Send notifications
    if (alerts.length > 0) {
      const sent = await sendMonitorNotifications(alerts, profile, admin);
      summary.notificationsSent = sent;
    }

    // 9. Update profile: watched keys, timestamps
    const activeKeys = Array.from(currentByKey.entries())
      .filter(([, l]) => l.StandardStatus === "Active" || l.StandardStatus === "Pending")
      .map(([k]) => k);

    const { count: totalAlerts } = await admin
      .from("market_monitor_alerts")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId);

    await admin
      .from("market_monitor_profiles")
      .update({
        watched_listing_keys: activeKeys,
        last_scan_at: new Date().toISOString(),
        next_scan_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        total_alerts: totalAlerts || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    console.log(
      `[MarketMonitor] ${profile.client_name}: ${alerts.length} alerts (${summary.newListings} new, ${summary.priceDrops} drops, ${summary.backOnMarket} BOM, ${summary.expiredWithdrawn} exp, ${summary.pending} pend)`,
    );
  } catch (err: any) {
    summary.errors.push(`Scan failed: ${err.message}`);
    console.error(`[MarketMonitor] Profile ${profileId} failed:`, err);
  }

  return summary;
}

// ── Cron Runner ─────────────────────────────────────────────────

export async function runMarketMonitorCron(): Promise<{
  processed: number;
  totalAlerts: number;
  summaries: MonitorRunSummary[];
}> {
  const admin = getAdmin();

  const { data: dueProfiles } = await admin
    .from("market_monitor_profiles")
    .select("id")
    .eq("is_active", true)
    .lte("next_scan_at", new Date().toISOString())
    .order("next_scan_at", { ascending: true })
    .limit(10);

  if (!dueProfiles || dueProfiles.length === 0) {
    return { processed: 0, totalAlerts: 0, summaries: [] };
  }

  const summaries: MonitorRunSummary[] = [];
  let totalAlerts = 0;

  for (const p of dueProfiles) {
    const result = await runMonitorProfile(p.id);
    summaries.push(result);
    totalAlerts += result.newListings + result.priceDrops + result.backOnMarket + result.expiredWithdrawn + result.pending;
  }

  console.log(`[MarketMonitor] Cron: processed ${dueProfiles.length} profiles, ${totalAlerts} alerts`);
  return { processed: dueProfiles.length, totalAlerts, summaries };
}

// ── OData Filter Builder ────────────────────────────────────────

function buildODataFilter(criteria: MonitorSearchCriteria): { filter: string; tmkPrefix?: string } | null {
  const parts: string[] = [];
  let tmkPrefix: string | undefined;

  // Status filter: all statuses for change detection
  parts.push("(StandardStatus eq 'Active' or StandardStatus eq 'Pending' or StandardStatus eq 'Expired' or StandardStatus eq 'Withdrawn' or StandardStatus eq 'Canceled')");

  // Location: TMK, ZIP codes, or city (at least one required)
  if (criteria.tmk) {
    // Resolve TMK to ZIPs and build ParcelNumber prefix for post-filtering
    const tmk = parseTMKInput(criteria.tmk);
    const zone = tmk.zone || "";
    const section = tmk.section || "";
    const island = tmk.island || "1";
    tmkPrefix = `${island}-${zone}-${section}-`;

    const zips = getZipsForTMKSection(zone, section);
    if (zips?.length) {
      const zipFilters = zips.map((z) => `PostalCode eq '${z}'`);
      parts.push(`(${zipFilters.join(" or ")})`);
    } else {
      return null; // TMK doesn't map to any ZIPs
    }
  } else if (criteria.zip_codes?.length) {
    const zipFilters = criteria.zip_codes.map((z) => `PostalCode eq '${z}'`);
    parts.push(`(${zipFilters.join(" or ")})`);
  } else if (criteria.city) {
    parts.push(`contains(tolower(City), '${criteria.city.toLowerCase()}')`);
  } else {
    return null; // No location = invalid
  }

  // Property type
  if (criteria.property_types?.length) {
    const typeFilters = criteria.property_types.map((t) => `PropertyType eq '${t}'`);
    parts.push(`(${typeFilters.join(" or ")})`);
  }

  // Beds
  if (criteria.beds_min) parts.push(`BedroomsTotal ge ${criteria.beds_min}`);
  if (criteria.beds_max) parts.push(`BedroomsTotal le ${criteria.beds_max}`);

  // Baths
  if (criteria.baths_min) parts.push(`BathroomsTotalInteger ge ${criteria.baths_min}`);
  if (criteria.baths_max) parts.push(`BathroomsTotalInteger le ${criteria.baths_max}`);

  // Price
  if (criteria.price_min) parts.push(`ListPrice ge ${criteria.price_min}`);
  if (criteria.price_max) parts.push(`ListPrice le ${criteria.price_max}`);

  return { filter: parts.join(" and "), tmkPrefix };
}

// ── Notification Sender ─────────────────────────────────────────

async function sendMonitorNotifications(
  alerts: DetectedAlert[],
  profile: any,
  admin: SupabaseClient,
): Promise<number> {
  let sent = 0;

  // Rate limit: check if we already sent for this profile in the last hour
  const { count: recentCount } = await admin
    .from("market_monitor_alerts")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .or("email_sent.eq.true,sms_sent.eq.true,crm_sent.eq.true")
    .gte("created_at", new Date(Date.now() - 3600 * 1000).toISOString());

  if (recentCount && recentCount > 0) {
    console.log(`[MarketMonitor] Skipping notifications for ${profile.client_name} - rate limited`);
    return 0;
  }

  // Get agent info for branding
  const { data: agent } = await admin
    .from("agents")
    .select("display_name, email, phone")
    .eq("id", profile.agent_id)
    .single();

  const agentName = agent?.display_name || "Your Agent";
  const agentPhone = agent?.phone || "";
  const agentEmail = agent?.email || "";

  // Email notification (batch all alerts into one email)
  if (profile.notify_email && profile.client_email) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY!);

      const alertHtml = alerts.map((a) => {
        const priceStr = a.listPrice ? `$${a.listPrice.toLocaleString()}` : "";
        const detailStr = [a.beds ? `${a.beds}bd` : "", a.baths ? `${a.baths}ba` : "", a.sqft ? `${a.sqft.toLocaleString()}sf` : ""].filter(Boolean).join("/");
        const typeBadge = alertTypeBadge(a.alertType);
        const photoHtml = a.photoUrl
          ? `<img src="${a.photoUrl}" alt="${a.address}" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px 8px 0 0;" />`
          : "";

        return `<div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:16px;">
          ${photoHtml}
          <div style="padding:16px;">
            <div style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;color:#fff;background:${typeBadge.color};margin-bottom:8px;">${typeBadge.label}</div>
            <div style="font-size:16px;font-weight:600;color:#111827;margin-bottom:4px;">${a.address}</div>
            <div style="font-size:14px;color:#6b7280;margin-bottom:8px;">${a.city}, HI ${a.postalCode}</div>
            <div style="font-size:18px;font-weight:700;color:#059669;">${priceStr}</div>
            ${detailStr ? `<div style="font-size:13px;color:#6b7280;margin-top:4px;">${detailStr}</div>` : ""}
            ${a.alertType === "price_drop" ? `<div style="font-size:13px;color:#dc2626;margin-top:4px;">Was $${(a.alertDetails.previousPrice || 0).toLocaleString()} - Reduced $${(a.alertDetails.dropAmount || 0).toLocaleString()} (${a.alertDetails.dropPct}%)</div>` : ""}
          </div>
        </div>`;
      }).join("");

      await resend.emails.send({
        from: process.env.EMAIL_FROM || "Real Estate Genie <support@realestategenie.app>",
        to: [profile.client_email],
        subject: `${alerts.length} new listing alert${alerts.length > 1 ? "s" : ""} for you`,
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:22px;">Market Monitor Alert</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">${alerts.length} new alert${alerts.length > 1 ? "s" : ""} matching your criteria</p>
        </td></tr>
        <tr><td style="padding:24px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${profile.client_name.split(" ")[0]},</p>
          <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Here are the latest updates matching your property search:</p>
          ${alertHtml}
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#374151;">${agentName}</p>
          ${agentPhone ? `<p style="margin:0 0 2px;font-size:12px;color:#6b7280;">${agentPhone}</p>` : ""}
          ${agentEmail ? `<p style="margin:0 0 8px;font-size:12px;color:#6b7280;">${agentEmail}</p>` : ""}
          <p style="margin:0;font-size:11px;color:#9ca3af;">Powered by Real Estate Genie&trade;</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
      });

      // Mark emails as sent
      const alertKeys = alerts.map((a) => a.listingKey);
      await admin
        .from("market_monitor_alerts")
        .update({ email_sent: true, email_sent_at: new Date().toISOString() })
        .eq("profile_id", profile.id)
        .in("listing_key", alertKeys)
        .eq("email_sent", false);

      sent++;
    } catch (err: any) {
      console.error(`[MarketMonitor] Email error for ${profile.client_name}:`, err.message);
    }
  }

  // SMS notification
  if (profile.notify_sms && profile.client_phone) {
    try {
      const twilio = await import("twilio");
      const client = twilio.default(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

      // Send one SMS summarizing alerts
      const firstAlert = alerts[0];
      let smsText: string;
      if (alerts.length === 1) {
        smsText = `${alertTypeBadge(firstAlert.alertType).label}: ${firstAlert.address}, ${firstAlert.city} - $${firstAlert.listPrice.toLocaleString()}. Contact ${agentName} at ${agentPhone}`;
      } else {
        smsText = `${alerts.length} new alerts matching your search. ${firstAlert.alertTitle} and ${alerts.length - 1} more. Contact ${agentName} at ${agentPhone}`;
      }

      await client.messages.create({
        body: smsText,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: profile.client_phone,
      });

      const alertKeys = alerts.map((a) => a.listingKey);
      await admin
        .from("market_monitor_alerts")
        .update({ sms_sent: true, sms_sent_at: new Date().toISOString() })
        .eq("profile_id", profile.id)
        .in("listing_key", alertKeys)
        .eq("sms_sent", false);

      sent++;
    } catch (err: any) {
      console.error(`[MarketMonitor] SMS error for ${profile.client_name}:`, err.message);
    }
  }

  // CRM notification
  if (profile.notify_crm && profile.client_crm_contact_id) {
    try {
      // Get agent's GHL integration
      const { data: ghlInteg } = await admin
        .from("integrations")
        .select("config")
        .eq("agent_id", profile.agent_id)
        .eq("provider", "ghl")
        .eq("status", "connected")
        .maybeSingle();

      if (ghlInteg?.config) {
        const config = typeof ghlInteg.config === "string" ? JSON.parse(ghlInteg.config) : ghlInteg.config;
        const accessToken = config.access_token;
        const locationId = config.location_id;

        if (accessToken && locationId) {
          const firstAlert = alerts[0];
          const crmMessage = alerts.length === 1
            ? `${alertTypeBadge(firstAlert.alertType).label}: ${firstAlert.address} - $${firstAlert.listPrice.toLocaleString()}`
            : `${alerts.length} new listing alerts matching your search. ${firstAlert.alertTitle} and ${alerts.length - 1} more.`;

          await fetch("https://services.leadconnectorhq.com/conversations/messages", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Version": "2021-04-15",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "SMS",
              locationId,
              contactId: profile.client_crm_contact_id,
              message: crmMessage,
            }),
          });

          const alertKeys = alerts.map((a) => a.listingKey);
          await admin
            .from("market_monitor_alerts")
            .update({ crm_sent: true, crm_sent_at: new Date().toISOString() })
            .eq("profile_id", profile.id)
            .in("listing_key", alertKeys)
            .eq("crm_sent", false);

          sent++;
        }
      }
    } catch (err: any) {
      console.error(`[MarketMonitor] CRM error for ${profile.client_name}:`, err.message);
    }
  }

  return sent;
}

// ── Helpers ──────────────────────────────────────────────────────

function alertTypeBadge(type: string): { label: string; color: string } {
  switch (type) {
    case "new_listing": return { label: "New Listing", color: "#059669" };
    case "price_drop": return { label: "Price Drop", color: "#dc2626" };
    case "back_on_market": return { label: "Back on Market", color: "#2563eb" };
    case "expired_withdrawn": return { label: "Expired", color: "#6b7280" };
    case "pending": return { label: "Pending", color: "#d97706" };
    default: return { label: type, color: "#6b7280" };
  }
}

export function summarizeMonitorCriteria(criteria: MonitorSearchCriteria): string {
  const parts: string[] = [];
  if (criteria.tmk) parts.push(`TMK ${criteria.tmk}`);
  if (criteria.zip_codes?.length) parts.push(criteria.zip_codes.join(", "));
  if (criteria.city) parts.push(criteria.city);
  if (criteria.property_types?.length) parts.push(criteria.property_types.join(", "));
  if (criteria.beds_min) parts.push(`${criteria.beds_min}+ beds`);
  if (criteria.baths_min) parts.push(`${criteria.baths_min}+ baths`);
  if (criteria.price_min || criteria.price_max) {
    const min = criteria.price_min ? `$${(criteria.price_min / 1000).toFixed(0)}K` : "";
    const max = criteria.price_max ? `$${(criteria.price_max / 1000).toFixed(0)}K` : "";
    parts.push(min && max ? `${min}-${max}` : min || max);
  }
  return parts.join(" | ") || "All properties";
}
