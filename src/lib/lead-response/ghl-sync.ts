/**
 * GHL Contact & Note Sync for Lead Response Engine
 * Creates contacts and logs every AI ↔ lead exchange as notes in GHL
 */

import { GHLClient } from "@/lib/integrations/ghl-client";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";
import type { LeadConversation, ExtractedData } from "./conversation-state";

/**
 * Get an authenticated GHL client for an agent
 */
export async function getGHLClientForAgent(agentId: string): Promise<{
  client: GHLClient;
  locationId: string;
} | null> {
  const config = await getValidGHLConfig(agentId);
  if (!config) return null;

  return {
    client: new GHLClient(config.access_token, config.location_id),
    locationId: config.location_id,
  };
}

/**
 * Create a GHL contact from conversation data
 * Returns the new GHL contact ID
 */
export async function createGHLContactFromConversation(
  agentId: string,
  convo: LeadConversation
): Promise<string | null> {
  const ghl = await getGHLClientForAgent(agentId);
  if (!ghl) {
    console.log("[LeadResponse GHL] No GHL connection for agent:", agentId);
    return null;
  }

  try {
    const nameParts = (convo.contact_name || "Unknown").split(" ");
    const firstName = nameParts[0] || "Unknown";
    const lastName = nameParts.slice(1).join(" ") || "";

    const contact = await ghl.client.createContact({
      locationId: ghl.locationId,
      firstName,
      lastName,
      name: convo.contact_name || undefined,
      email: convo.contact_email || undefined,
      phone: convo.contact_phone || undefined,
      tags: ["ai-conversation", `source-${convo.source}`],
      source: convo.source === "widget" ? "Website Chat Widget" : "Inbound SMS",
    });

    console.log("[LeadResponse GHL] Created contact:", contact.id);
    return contact.id || null;
  } catch (err: any) {
    console.error("[LeadResponse GHL] Failed to create contact:", err.message);
    return null;
  }
}

/**
 * Log an AI ↔ lead exchange as a note on the GHL contact
 */
export async function logExchangeAsNote(
  agentId: string,
  contactId: string,
  leadMessage: string,
  aiResponse: string,
  phase: string
): Promise<void> {
  const ghl = await getGHLClientForAgent(agentId);
  if (!ghl) return;

  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "Pacific/Honolulu",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const noteBody = `**AI Conversation Exchange** (${phase})
${timestamp}

**Lead:** ${leadMessage}
**AI:** ${aiResponse}`;

  try {
    await ghl.client.addNote({ contactId, body: noteBody });
  } catch (err: any) {
    console.error("[LeadResponse GHL] Failed to add exchange note:", err.message);
  }
}

/**
 * Log the escalation summary as a comprehensive note on the GHL contact
 */
export async function logEscalationSummary(
  agentId: string,
  contactId: string,
  convo: LeadConversation,
  summaryCard: string
): Promise<void> {
  const ghl = await getGHLClientForAgent(agentId);
  if (!ghl) return;

  const data = convo.extracted_data as ExtractedData;

  const noteBody = `🔥 **HOT LEAD — AI ESCALATION SUMMARY**

**Heat Score:** ${convo.current_heat_score}/100 (threshold: ${convo.escalation_threshold})
**Messages exchanged:** ${convo.ai_message_count}
**Source:** ${convo.source === "widget" ? "Website Chat Widget" : "Inbound SMS"}

**Qualification Data:**
- Timeline: ${data.timeline || "Not disclosed"}
- Financing: ${data.financing || "Not disclosed"}
- Budget: ${data.budget ? "$" + data.budget.toLocaleString() : "Not disclosed"}
- Pre-approval: ${data.preapproval_amount ? "$" + data.preapproval_amount.toLocaleString() : "N/A"}
- Areas: ${data.neighborhoods || "Not disclosed"}
- Must-haves: ${data.must_haves || "Not disclosed"}
- Property type: ${data.property_type || "Not disclosed"}
- Representation: ${data.representation || "Not disclosed"}
- Motivation: ${data.motivation || "Not disclosed"}

**AI Summary:**
${summaryCard}

---
*This lead was qualified by the AI Auto-Response Engine. Review the conversation history above for full context.*`;

  try {
    await ghl.client.addNote({ contactId, body: noteBody });

    // Also add tags to mark as hot lead
    await ghl.client.addTags(contactId, [
      "hot-lead",
      "ai-escalated",
      `score-${convo.current_heat_score}`,
    ]);
  } catch (err: any) {
    console.error("[LeadResponse GHL] Failed to add escalation note:", err.message);
  }
}

/**
 * Send an SMS reply through GHL
 */
export async function sendSMSReply(
  agentId: string,
  contactId: string,
  message: string
): Promise<string | null> {
  const ghl = await getGHLClientForAgent(agentId);
  if (!ghl) return null;

  try {
    const result = await ghl.client.sendSMS({
      contactId,
      message,
    });
    return result.messageId;
  } catch (err: any) {
    console.error("[LeadResponse GHL] Failed to send SMS:", err.message);
    return null;
  }
}
