/**
 * MLS Email Blast Engine
 *
 * Searches MLS by neighborhood/subdivision, compiles listings into
 * branded HTML emails, and sends to CRM contacts via Resend.
 *
 * Listing links point to HiCentral MLS property search:
 *   https://propertysearch.hicentral.com/HBR/ForSale/?/{ListingId}
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";
import { TrestleProperty } from "@/lib/integrations/trestle-client";
import { GHLClient } from "@/lib/integrations/ghl-client";

// MLS listing URL templates per MLS ID
const MLS_LISTING_URLS: Record<string, string> = {
  hicentral: "https://propertysearch.hicentral.com/HBR/ForSale/?/{LISTING_ID}",
  bright: "https://matrix.brightmls.com/DE/listing/P_{LISTING_ID}",
};

// ── Types ────────────────────────────────────────────────────────

export interface BlastSearchCriteria {
  subdivision?: string;
  zip_codes?: string[];
  city?: string;
  statuses?: string[];
  property_types?: string[];
  date_range_days?: number; // How far back to look (default 7)
}

export interface BlastRunResult {
  blastId: string;
  listingsFound: number;
  recipientCount: number;
  emailsSent: number;
  errors: string[];
}

interface ListingCard {
  listingId: string;
  listingKey: string;
  address: string;
  city: string;
  zip: string;
  price: number;
  originalPrice?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  dom?: number;
  status: string;
  statusLabel: string;
  photoUrl?: string;
  mlsUrl: string;
  closePrice?: number;
  closeDate?: string;
}

// ── Supabase Admin ───────────────────────────────────────────────

let _admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (_admin) return _admin;
  _admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  return _admin;
}

// ── Main Engine ─────────────────────────────────────────────────

export async function runEmailBlast(blastId: string): Promise<BlastRunResult> {
  const admin = getAdmin();

  const result: BlastRunResult = { blastId, listingsFound: 0, recipientCount: 0, emailsSent: 0, errors: [] };

  // 1. Load blast config
  const { data: blast, error: blastErr } = await admin
    .from("mls_email_blasts")
    .select("*")
    .eq("id", blastId)
    .single();

  if (blastErr || !blast) {
    result.errors.push(`Blast not found: ${blastErr?.message}`);
    return result;
  }

  const criteria = blast.search_criteria as BlastSearchCriteria;

  // 2. Get agent's Trestle client and MLS ID
  const trestle = await getTrestleClient(admin, blast.agent_id);
  if (!trestle) {
    result.errors.push("MLS not connected for this agent");
    return result;
  }

  // Get mls_id for URL generation
  const { data: trestleInteg } = await admin
    .from("integrations")
    .select("config")
    .eq("agent_id", blast.agent_id)
    .eq("provider", "trestle")
    .maybeSingle();
  const trestleConfig = trestleInteg?.config ? (typeof trestleInteg.config === "string" ? JSON.parse(trestleInteg.config) : trestleInteg.config) : {};
  const mlsId = trestleConfig.mls_id || "hicentral";
  const urlTemplate = MLS_LISTING_URLS[mlsId] || MLS_LISTING_URLS.hicentral;

  // 3. Query MLS
  const dateRangeDays = criteria.date_range_days || 7;
  const since = new Date(Date.now() - dateRangeDays * 86400000).toISOString().split("T")[0];

  const filters: string[] = [];

  // Status filter
  const statuses = criteria.statuses?.length ? criteria.statuses : ["Active", "Closed"];
  filters.push(`(${statuses.map((s) => `StandardStatus eq '${s}'`).join(" or ")})`);

  // Location
  if (criteria.subdivision) {
    const escaped = criteria.subdivision.replace(/'/g, "''").toLowerCase();
    filters.push(`contains(tolower(SubdivisionName), '${escaped}')`);
  }
  if (criteria.zip_codes?.length) {
    filters.push(`(${criteria.zip_codes.map((z) => `PostalCode eq '${z}'`).join(" or ")})`);
  } else if (criteria.city) {
    filters.push(`contains(tolower(City), '${criteria.city.replace(/'/g, "''").toLowerCase()}')`);
  }

  if (!criteria.subdivision && !criteria.zip_codes?.length && !criteria.city) {
    result.errors.push("No location filter specified");
    return result;
  }

  // Property types
  if (criteria.property_types?.length) {
    filters.push(`(${criteria.property_types.map((t) => `PropertyType eq '${t}'`).join(" or ")})`);
  }

  // Date filter: only recent activity
  filters.push(`ModificationTimestamp ge ${since}T00:00:00Z`);

  try {
    const mlsResult = await trestle.getProperties({
      $filter: filters.join(" and "),
      $select: [
        "ListingKey", "ListingId", "StandardStatus", "PropertyType", "PropertySubType",
        "ListPrice", "OriginalListPrice", "ClosePrice", "CloseDate",
        "UnparsedAddress", "StreetNumber", "StreetName", "StreetSuffix",
        "City", "PostalCode", "BedroomsTotal", "BathroomsTotalInteger", "LivingArea",
        "DaysOnMarket", "SubdivisionName",
      ].join(","),
      $orderby: "ModificationTimestamp desc",
      $top: 50,
      $expand: "Media($select=MediaURL,Order;$top=1;$orderby=Order)",
    });

    const listings = mlsResult.value || [];
    result.listingsFound = listings.length;

    if (listings.length === 0) {
      result.errors.push("No listings found matching criteria");
      return result;
    }

    // Build listing cards
    const cards: ListingCard[] = listings.map((l: any) => {
      const address = l.UnparsedAddress || [l.StreetNumber, l.StreetName, l.StreetSuffix].filter(Boolean).join(" ") || "Unknown";
      const status = l.StandardStatus || "Active";
      const listingId = l.ListingId || l.ListingKey;

      let statusLabel = status;
      if (status === "Active" && l.DaysOnMarket != null && l.DaysOnMarket <= 7) statusLabel = "New Listing";
      if (l.ListPrice && l.OriginalListPrice && l.ListPrice < l.OriginalListPrice) statusLabel = "Price Reduced";
      if (l.ListPrice && l.OriginalListPrice && l.ListPrice > l.OriginalListPrice) statusLabel = "Price Increase";
      if (status === "Closed") statusLabel = "Just Sold";

      return {
        listingId,
        listingKey: l.ListingKey,
        address,
        city: l.City || "",
        zip: l.PostalCode?.substring(0, 5) || "",
        price: status === "Closed" ? (l.ClosePrice || l.ListPrice || 0) : (l.ListPrice || 0),
        originalPrice: l.OriginalListPrice,
        beds: l.BedroomsTotal,
        baths: l.BathroomsTotalInteger,
        sqft: l.LivingArea,
        dom: l.DaysOnMarket,
        status,
        statusLabel,
        photoUrl: l.Media?.[0]?.MediaURL || undefined,
        mlsUrl: urlTemplate.replace("{LISTING_ID}", listingId),
        closePrice: l.ClosePrice,
        closeDate: l.CloseDate,
      };
    });

    // 4. Get agent info for branding
    const { data: agent } = await admin
      .from("agents")
      .select("display_name, email, phone")
      .eq("id", blast.agent_id)
      .single();

    const agentName = agent?.display_name || "Your Agent";
    const agentPhone = agent?.phone || "";
    const agentEmail = agent?.email || "";

    // 5. Get recipient contacts from CRM
    const recipients: { email: string; name: string; contactId: string }[] = [];

    if (blast.crm_contact_ids?.length || blast.crm_tag) {
      try {
        const { data: ghlInteg } = await admin
          .from("integrations")
          .select("config")
          .eq("agent_id", blast.agent_id)
          .eq("provider", "ghl")
          .eq("status", "connected")
          .maybeSingle();

        if (ghlInteg?.config) {
          const ghlConfig = typeof ghlInteg.config === "string" ? JSON.parse(ghlInteg.config) : ghlInteg.config;
          const ghl = new GHLClient(ghlConfig.access_token, ghlConfig.location_id);

          // Fetch individual contacts
          for (const cid of (blast.crm_contact_ids || [])) {
            try {
              const contact = await ghl.getContact(cid);
              if (contact.email) {
                recipients.push({
                  email: contact.email,
                  name: [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.name || "",
                  contactId: contact.id || cid,
                });
              }
            } catch { /* skip contacts that can't be fetched */ }
          }
        }
      } catch (err: any) {
        result.errors.push(`CRM contact fetch error: ${err.message}`);
      }
    }

    result.recipientCount = recipients.length;

    if (recipients.length === 0) {
      result.errors.push("No recipients with email addresses found");
      return result;
    }

    // 6. Build and send HTML email
    const neighborhoodName = criteria.subdivision || criteria.city || criteria.zip_codes?.join(", ") || "Your Area";
    const subject = `${neighborhoodName} Market Update - ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
    const html = buildBlastEmail(cards, neighborhoodName, agentName, agentPhone, agentEmail);

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY!);

    for (const recipient of recipients) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "Real Estate Genie <support@realestategenie.app>",
          to: [recipient.email],
          subject,
          html: html.replace("{{RECIPIENT_NAME}}", recipient.name.split(" ")[0] || "there"),
        });

        // Track the send
        await admin.from("mls_blast_sends").insert({
          blast_id: blastId,
          agent_id: blast.agent_id,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          crm_contact_id: recipient.contactId,
          subject,
          listings_count: cards.length,
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        });

        result.emailsSent++;
      } catch (err: any) {
        result.errors.push(`Email to ${recipient.email}: ${err.message}`);
      }
    }

    // 7. Update blast metadata
    await admin.from("mls_email_blasts").update({
      last_sent_at: new Date().toISOString(),
      next_send_at: calculateNextSend(blast.schedule).toISOString(),
      total_sent: (blast.total_sent || 0) + result.emailsSent,
      updated_at: new Date().toISOString(),
    }).eq("id", blastId);

    console.log(`[MlsBlast] ${blast.name}: ${result.listingsFound} listings, ${result.emailsSent} emails sent to ${result.recipientCount} recipients`);
  } catch (err: any) {
    result.errors.push(`Blast failed: ${err.message}`);
    console.error(`[MlsBlast] ${blastId} failed:`, err);
  }

  return result;
}

// ── HTML Email Builder ──────────────────────────────────────────

function buildBlastEmail(
  cards: ListingCard[],
  neighborhoodName: string,
  agentName: string,
  agentPhone: string,
  agentEmail: string,
): string {
  const listingCards = cards.map((c) => {
    const priceStr = `$${c.price.toLocaleString()}`;
    const detailStr = [c.beds ? `${c.beds} bd` : "", c.baths ? `${c.baths} ba` : "", c.sqft ? `${c.sqft.toLocaleString()} sf` : ""].filter(Boolean).join(" | ");
    const statusColor = c.statusLabel === "New Listing" ? "#059669" : c.statusLabel === "Just Sold" ? "#2563eb" : c.statusLabel.includes("Price") ? "#dc2626" : "#6b7280";

    const photoHtml = c.photoUrl
      ? `<a href="${c.mlsUrl}" style="display:block;text-decoration:none;"><img src="${c.photoUrl}" alt="${c.address}" style="width:100%;height:200px;object-fit:cover;display:block;" /></a>`
      : `<div style="width:100%;height:120px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:14px;">No Photo</div>`;

    let extraLine = "";
    if (c.statusLabel === "Just Sold" && c.closePrice) extraLine = `<div style="font-size:13px;color:#2563eb;margin-top:4px;">Sold: $${c.closePrice.toLocaleString()}${c.closeDate ? ` on ${new Date(c.closeDate).toLocaleDateString()}` : ""}</div>`;
    if (c.statusLabel.includes("Price") && c.originalPrice) extraLine = `<div style="font-size:13px;color:#dc2626;margin-top:4px;">Was: $${c.originalPrice.toLocaleString()}</div>`;

    return `<div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:16px;max-width:280px;display:inline-block;vertical-align:top;margin-right:16px;">
      ${photoHtml}
      <div style="padding:12px 14px;">
        <div style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;color:#fff;background:${statusColor};margin-bottom:6px;">${c.statusLabel}</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:2px;"><a href="${c.mlsUrl}" style="color:#111827;text-decoration:none;">${c.address}</a></div>
        <div style="font-size:13px;color:#6b7280;margin-bottom:6px;">${c.city}, HI ${c.zip}</div>
        <div style="font-size:18px;font-weight:700;color:#059669;">${priceStr}</div>
        ${detailStr ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${detailStr}</div>` : ""}
        ${c.dom != null ? `<div style="font-size:12px;color:#9ca3af;margin-top:2px;">${c.dom} days on market</div>` : ""}
        ${extraLine}
      </div>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:28px 32px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${neighborhoodName} Market Update</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 20px;font-size:15px;color:#374151;">Hi {{RECIPIENT_NAME}},</p>
          <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Here are the latest listings and sales in ${neighborhoodName}:</p>
          <div style="text-align:center;">
            ${listingCards}
          </div>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#374151;">${agentName}</p>
          ${agentPhone ? `<p style="margin:0 0 2px;font-size:13px;color:#6b7280;">${agentPhone}</p>` : ""}
          ${agentEmail ? `<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${agentEmail}</p>` : ""}
          <p style="margin:0;font-size:11px;color:#9ca3af;">Powered by Real Estate Genie</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ── Helpers ──────────────────────────────────────────────────────

function calculateNextSend(schedule: string): Date {
  const next = new Date();
  switch (schedule) {
    case "weekly": next.setDate(next.getDate() + 7); break;
    case "biweekly": next.setDate(next.getDate() + 14); break;
    case "monthly": next.setMonth(next.getMonth() + 1); break;
    default: next.setFullYear(2099); // Manual - no auto send
  }
  next.setHours(9, 0, 0, 0); // 9 AM
  return next;
}

export function summarizeBlastCriteria(criteria: BlastSearchCriteria): string {
  const parts: string[] = [];
  if (criteria.subdivision) parts.push(criteria.subdivision);
  if (criteria.zip_codes?.length) parts.push(criteria.zip_codes.join(", "));
  if (criteria.city) parts.push(criteria.city);
  if (criteria.statuses?.length) parts.push(criteria.statuses.join(", "));
  return parts.join(" | ") || "All";
}
