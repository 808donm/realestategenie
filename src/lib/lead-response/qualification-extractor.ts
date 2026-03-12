/**
 * Qualification Extractor
 * Uses AI to extract structured qualification data from freeform lead messages
 */

import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import type { ExtractedData } from "./conversation-state";

function getModel() {
  return gateway(process.env.LEAD_RESPONSE_AI_MODEL || "openai/gpt-4o-mini");
}

/**
 * Extract qualification data from a lead's message
 * Returns only newly extracted fields (not previously known data)
 */
export async function extractQualificationData(
  message: string,
  existingData: ExtractedData
): Promise<Partial<ExtractedData>> {
  const { text } = await generateText({
    model: getModel(),
    system: `You extract real estate lead qualification data from conversational messages.
Given a message from a potential real estate buyer/seller, extract any NEW information not already known.

Already known data:
${JSON.stringify(existingData, null, 2)}

Extract ONLY new information. Return a JSON object with ONLY the fields that have new data.
Possible fields:
- timeline: "0-3 months" | "3-6 months" | "6+ months" | "just browsing"
- financing: "pre-approved" | "cash" | "need lender" | "not sure"
- neighborhoods: comma-separated neighborhood names
- must_haves: key requirements (e.g., "3BR, pool, ocean view")
- budget: number (dollars, no commas)
- property_type: "single family" | "condo" | "townhouse" | "land" | "multi-family"
- representation: "yes" | "no" | "unsure" (whether they have an agent)
- name: their name if mentioned
- email: their email if mentioned
- phone: their phone if mentioned
- motivation: brief note about why they're looking (e.g., "relocating from mainland", "investment property")
- preapproval_amount: number if they mention a specific pre-approval amount

Return ONLY valid JSON. If no new data can be extracted, return {}.`,
    prompt: message,
    temperature: 0.1,
  });

  try {
    const extracted = JSON.parse(extractJSON(text));
    // Filter out empty/null values
    const filtered: Partial<ExtractedData> = {};
    for (const [key, value] of Object.entries(extracted)) {
      if (value !== null && value !== undefined && value !== "") {
        (filtered as any)[key] = value;
      }
    }
    return filtered;
  } catch {
    console.error("[QualExtractor] Failed to parse AI response:", text);
    return {};
  }
}

function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (match) return match[1].trim();
  return text.trim();
}
