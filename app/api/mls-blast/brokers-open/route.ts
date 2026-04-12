import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";
import { GHLClient } from "@/lib/integrations/ghl-client";

/**
 * POST /api/mls-blast/brokers-open
 *
 * Digital Broker's Open: sends the agent's current active listings
 * as a branded HTML email to other agents (CRM contacts tagged "MLS Agent").
 *
 * Body:
 *   tag?:     CRM tag to filter recipients (default: "MLS Agent")
 *   message?: Custom message (default: standard Broker's Open intro)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const tag = body.tag || "MLS Agent";
    const customMessage = body.message || "";

    // Get agent info
    const { data: agent } = await supabase
      .from("agents")
      .select("display_name, email, phone")
      .eq("id", user.id)
      .single();

    const agentName = agent?.display_name || "Agent";
    const agentEmail = agent?.email || "";
    const agentPhone = agent?.phone || "";

    // Get agent's MLS listings
    const trestle = await getTrestleClient(supabase, user.id);
    if (!trestle) return NextResponse.json({ error: "MLS not connected" }, { status: 503 });

    // Get MLS ID for listing URLs
    const { data: trestleInteg } = await supabase
      .from("integrations")
      .select("config")
      .eq("agent_id", user.id)
      .eq("provider", "trestle")
      .maybeSingle();
    const trestleConfig = trestleInteg?.config ? (typeof trestleInteg.config === "string" ? JSON.parse(trestleInteg.config) : trestleInteg.config) : {};

    // Fetch agent's active listings
    const listingsResult = await trestle.getProperties({
      $filter: `StandardStatus eq 'Active' and ListAgentKey eq '${trestleConfig.agent_key || ""}'`,
      $select: [
        "ListingKey", "ListingId", "ListPrice", "UnparsedAddress",
        "StreetNumber", "StreetName", "StreetSuffix",
        "City", "PostalCode", "BedroomsTotal", "BathroomsTotalInteger",
        "LivingArea", "PropertyType", "PropertySubType", "DaysOnMarket",
      ].join(","),
      $orderby: "ListPrice desc",
      $top: 25,
      $expand: "Media($select=MediaURL,Order;$top=1;$orderby=Order)",
    });

    // If agent_key didn't work, try by agent name
    let listings = listingsResult.value || [];
    if (listings.length === 0 && agentName) {
      const escaped = agentName.replace(/'/g, "''");
      const nameResult = await trestle.getProperties({
        $filter: `StandardStatus eq 'Active' and contains(ListAgentFullName, '${escaped}')`,
        $select: [
          "ListingKey", "ListingId", "ListPrice", "UnparsedAddress",
          "StreetNumber", "StreetName", "StreetSuffix",
          "City", "PostalCode", "BedroomsTotal", "BathroomsTotalInteger",
          "LivingArea", "PropertyType", "PropertySubType", "DaysOnMarket",
        ].join(","),
        $orderby: "ListPrice desc",
        $top: 25,
        $expand: "Media($select=MediaURL,Order;$top=1;$orderby=Order)",
      });
      listings = nameResult.value || [];
    }

    if (listings.length === 0) {
      return NextResponse.json({ error: "No active listings found. Make sure your listings are in MLS." }, { status: 404 });
    }

    // Get GHL integration
    const { data: ghlInteg } = await supabase
      .from("integrations")
      .select("config")
      .eq("agent_id", user.id)
      .eq("provider", "ghl")
      .eq("status", "connected")
      .maybeSingle();

    if (!ghlInteg?.config) {
      return NextResponse.json({ error: "CRM not connected" }, { status: 503 });
    }

    const ghlConfig = typeof ghlInteg.config === "string" ? JSON.parse(ghlInteg.config) : ghlInteg.config;
    const ghl = new GHLClient(ghlConfig.access_token, ghlConfig.location_id);

    // Search for contacts with the specified tag
    // GHL search by tag requires fetching contacts and filtering
    const searchResult = await ghl.searchContacts({ email: tag });
    const recipients = (searchResult.contacts || []).filter((c: any) =>
      c.email && c.tags?.includes(tag),
    );

    if (recipients.length === 0) {
      return NextResponse.json({ error: `No CRM contacts found with tag "${tag}". Export agents from the leaderboard first.` }, { status: 404 });
    }

    // Build listing cards HTML
    const listingCards = listings.map((l: any) => {
      const address = l.UnparsedAddress || [l.StreetNumber, l.StreetName, l.StreetSuffix].filter(Boolean).join(" ") || "Property";
      const price = l.ListPrice ? `$${l.ListPrice.toLocaleString()}` : "";
      const details = [
        l.BedroomsTotal ? `${l.BedroomsTotal} bd` : "",
        l.BathroomsTotalInteger ? `${l.BathroomsTotalInteger} ba` : "",
        l.LivingArea ? `${l.LivingArea.toLocaleString()} sf` : "",
      ].filter(Boolean).join(" | ");
      const photoUrl = l.Media?.[0]?.MediaURL;
      const listingId = l.ListingId || l.ListingKey;
      const mlsUrl = `https://propertysearch.hicentral.com/HBR/ForSale/?/${listingId}`;
      const propType = l.PropertySubType || l.PropertyType || "";

      const photoHtml = photoUrl
        ? `<a href="${mlsUrl}" style="display:block;text-decoration:none;"><img src="${photoUrl}" alt="${address}" style="width:100%;height:200px;object-fit:cover;display:block;" /></a>`
        : `<div style="width:100%;height:100px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:13px;">No Photo Available</div>`;

      return `<div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:16px;">
        ${photoHtml}
        <div style="padding:14px 16px;text-align:center;">
          <div style="font-size:16px;font-weight:700;margin-bottom:2px;"><a href="${mlsUrl}" style="color:#111827;text-decoration:none;">${address}</a></div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:6px;">${l.City || ""}, HI ${(l.PostalCode || "").substring(0, 5)}</div>
          <div style="font-size:22px;font-weight:800;color:#059669;margin-bottom:4px;">${price}</div>
          ${details ? `<div style="font-size:13px;color:#6b7280;">${details}</div>` : ""}
          ${propType ? `<div style="font-size:12px;color:#9ca3af;margin-top:2px;">${propType}</div>` : ""}
          <div style="margin-top:10px;"><a href="${mlsUrl}" style="display:inline-block;padding:8px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">View Listing</a></div>
        </div>
      </div>`;
    }).join("");

    const defaultMessage = customMessage || "Attached please find my current listings. If you have a buyer that would be interested, please reach out.";

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:28px 32px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">My Current Listings</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${listings.length} Active Listing${listings.length > 1 ? "s" : ""}</p>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 8px;font-size:16px;color:#374151;">Aloha,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">${defaultMessage}</p>
          ${listingCards}
        </td></tr>
        <tr><td style="background:#f9fafb;padding:24px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0 0 2px;font-size:16px;font-weight:700;color:#374151;">Mahalo,</p>
          <p style="margin:0 0 2px;font-size:15px;font-weight:600;color:#374151;">${agentName}</p>
          ${agentEmail ? `<p style="margin:0 0 2px;font-size:13px;color:#6b7280;">${agentEmail}</p>` : ""}
          ${agentPhone ? `<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${agentPhone}</p>` : ""}
          <p style="margin:0;font-size:11px;color:#9ca3af;">Powered by Real Estate Genie</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    // Send emails
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY!);

    let sent = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      try {
        const recipientName = [recipient.firstName, recipient.lastName].filter(Boolean).join(" ") || "";
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "Real Estate Genie <support@realestategenie.app>",
          to: [recipient.email],
          subject: `${agentName} - ${listings.length} Current Listing${listings.length > 1 ? "s" : ""}`,
          html: html.replace("Aloha,", `Aloha ${recipientName.split(" ")[0] || ""},`),
        });
        sent++;
        await new Promise((r) => setTimeout(r, 200)); // Rate limit
      } catch (err: any) {
        errors.push(`${recipient.email}: ${err.message}`);
        if (errors.length >= 5) break;
      }
    }

    return NextResponse.json({
      success: true,
      listingsCount: listings.length,
      recipientCount: recipients.length,
      emailsSent: sent,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("[BrokersOpen] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
