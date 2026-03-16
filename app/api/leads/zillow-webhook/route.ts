import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateHeatScore } from "@/lib/lead-scoring";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Zillow Tech Connect webhook endpoint.
 *
 * Zillow sends lead data as a URL-encoded HTTP POST when a buyer/seller
 * inquires on a listing. Configure this URL in your Zillow Premier Agent
 * "App Integrations" settings.
 *
 * Required env var:
 *   ZILLOW_WEBHOOK_SECRET – shared secret to verify requests originate from Zillow
 */
export async function POST(req: Request) {
  try {
    // Verify webhook secret (passed as query param or header)
    const url = new URL(req.url);
    const secret =
      url.searchParams.get("secret") ??
      req.headers.get("x-zillow-secret");

    if (!secret || secret !== process.env.ZILLOW_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Zillow Tech Connect sends URL-encoded form data
    const contentType = req.headers.get("content-type") ?? "";
    let data: Record<string, string>;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      data = Object.fromEntries(formData.entries()) as Record<string, string>;
    } else {
      // Also support JSON in case of Zapier/middleware forwarding
      data = await req.json();
    }

    // Extract lead fields from Zillow payload
    const name = data.name || data.contactName || data.contact_name || "";
    const email = data.email || data.contactEmail || data.contact_email || "";
    const phone = data.phone || data.contactPhone || data.contact_phone || "";
    const propertyAddress =
      data.propertyAddress || data.property_address || data.listing_address || "";
    const propertyPrice = data.propertyPrice || data.property_price || data.price || "";
    const message = data.message || data.comments || "";

    if (!name && !email && !phone) {
      return NextResponse.json(
        { error: "No contact information provided" },
        { status: 400 }
      );
    }

    // Look up the agent by matching Zillow account email or use a default
    const agentEmail = data.agentEmail || data.agent_email || "";
    let agentId: string | null = null;

    if (agentEmail) {
      const { data: agent } = await admin
        .from("agents")
        .select("id")
        .eq("email", agentEmail)
        .single();
      agentId = agent?.id ?? null;
    }

    // If no agent matched, find the first agent (single-agent account)
    if (!agentId) {
      const { data: agents } = await admin
        .from("agents")
        .select("id")
        .limit(1);
      agentId = agents?.[0]?.id ?? null;
    }

    if (!agentId) {
      return NextResponse.json(
        { error: "No agent found to assign lead" },
        { status: 400 }
      );
    }

    // Build the lead payload matching the open house lead structure
    const payload = {
      name,
      email,
      phone_e164: phone,
      representation: "unsure" as const,
      wants_agent_reach_out: true,
      timeline: "just browsing" as const,
      financing: "not sure" as const,
      neighborhoods: propertyAddress,
      must_haves: message,
      consent: { sms: true, email: true },
      zillow_raw: data, // Preserve original Zillow data
    };

    const heatScore = calculateHeatScore(payload);

    // Insert lead with zillow source
    const { data: lead, error: insErr } = await admin
      .from("lead_submissions")
      .insert({
        agent_id: agentId,
        event_id: null,
        payload,
        heat_score: heatScore,
        lead_source: "zillow",
        pushed_to_ghl: false,
      })
      .select()
      .single();

    if (insErr || !lead) {
      console.error("[Zillow Webhook] Insert error:", insErr?.message);
      return NextResponse.json(
        { error: insErr?.message || "Failed to create lead" },
        { status: 500 }
      );
    }

    // Write audit record
    await admin.from("audit_log").insert({
      agent_id: agentId,
      action: "lead_submitted",
      details: {
        source: "zillow_tech_connect",
        heat_score: heatScore,
        lead_id: lead.id,
        property_address: propertyAddress,
      },
    });

    console.log(
      `[Zillow Webhook] Lead created: ${lead.id} | ${name} | Score: ${heatScore}`
    );

    // Auto-match: try to link this lead to an agent listing by address
    let matchedListingId: string | null = null;
    if (propertyAddress) {
      try {
        const normalised = propertyAddress.toLowerCase().replace(/[^a-z0-9]/g, "");
        const { data: listings } = await admin
          .from("agent_listings")
          .select("id, unparsed_address, street_number, street_name, city, postal_code, list_price, bedrooms_total, bathrooms_total, living_area, property_type, mls_listing_key, mls_listing_id")
          .eq("user_id", agentId);

        if (listings && listings.length > 0) {
          // Find best address match
          const match = listings.find((l) => {
            const addr = (l.unparsed_address || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            const parts = [l.street_number, l.street_name, l.city, l.postal_code]
              .filter(Boolean)
              .join("")
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");
            return (
              (addr && normalised.includes(addr)) ||
              (addr && addr.includes(normalised)) ||
              (parts && normalised.includes(parts)) ||
              (parts && parts.includes(normalised))
            );
          });

          if (match) {
            matchedListingId = match.id;
            await admin.from("lead_listing_matches").insert({
              lead_id: lead.id,
              agent_id: agentId,
              listing_key: match.mls_listing_key || match.id,
              listing_id: match.mls_listing_id || null,
              address: match.unparsed_address || propertyAddress,
              city: match.city || "",
              postal_code: match.postal_code || "",
              list_price: match.list_price || 0,
              bedrooms: match.bedrooms_total || null,
              bathrooms: match.bathrooms_total || null,
              living_area: match.living_area || null,
              property_type: match.property_type || "",
              match_score: 100,
              match_reasons: ["Zillow lead matched by property address"],
              status: "new",
            });
            console.log(`[Zillow Webhook] Auto-matched lead to listing: ${match.unparsed_address}`);
          }
        }
      } catch (matchErr) {
        // Non-fatal — lead is still created even if matching fails
        console.error("[Zillow Webhook] Auto-match error:", matchErr);
      }
    }

    // Return 200 quickly — Zillow expects a fast response
    return NextResponse.json({
      ok: true,
      lead_id: lead.id,
      matched_listing: matchedListingId,
    });
  } catch (err: unknown) {
    console.error("[Zillow Webhook] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
