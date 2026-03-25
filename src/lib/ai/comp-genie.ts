/**
 * Comp Genie — AI-Powered Comparable Property Analysis
 *
 * Provides AI-driven comp analysis for non-disclosure states where official
 * sale prices are not publicly recorded. Uses AVM values, property characteristics,
 * and transfer data from property search results.
 *
 * Uses the Vercel AI SDK Gateway for provider-agnostic model routing.
 */

import { trackedGenerateText } from "@/lib/ai/ai-call-logger";

/** Resolve the AI model ID; override via COMP_GENIE_MODEL env. */
function getCompModelId() {
  return process.env.COMP_GENIE_MODEL || "anthropic/claude-sonnet-4-6";
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface CompProperty {
  address: string;
  avmValue?: number;
  avmLow?: number;
  avmHigh?: number;
  assessedValue?: number;
  transferPrice?: number;
  transferDate?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSize?: number;
  yearBuilt?: number;
  propertyType?: string;
  pricePerSqft?: number;
  latitude?: number;
  longitude?: number;
}

export interface CompGenieResult {
  subjectAddress: string;
  comparables: CompMatch[];
  estimatedValueRange: { low: number; high: number };
  marketPosition: string;
  confidence: "high" | "medium" | "low";
  disclaimer: string;
}

export interface CompMatch {
  address: string;
  similarity: number; // 0–100
  adjustedValue?: number;
  avmValue?: number;
  sqft?: number;
  beds?: number;
  baths?: number;
  yearBuilt?: number;
  distanceMiles?: number;
  reasoning: string;
}

// ── AI Analysis ──────────────────────────────────────────────────────────────

/**
 * Analyze comparable properties for a subject property using AI.
 * Designed for non-disclosure states where sale prices are unavailable.
 */
export async function analyzeComparables(
  subject: CompProperty,
  neighbors: CompProperty[],
  stateAbbrev: string
): Promise<CompGenieResult> {
  const neighborSlice = neighbors
    .filter((n) => n.address !== subject.address)
    .slice(0, 20);

  if (neighborSlice.length === 0) {
    return {
      subjectAddress: subject.address,
      comparables: [],
      estimatedValueRange: {
        low: subject.avmLow || subject.avmValue || 0,
        high: subject.avmHigh || subject.avmValue || 0,
      },
      marketPosition: "Insufficient neighboring property data for comparison.",
      confidence: "low",
      disclaimer: getDisclaimer(stateAbbrev),
    };
  }

  const subjectSummary = formatProperty(subject, "SUBJECT");
  const neighborData = neighborSlice
    .map((n, i) => formatProperty(n, `#${i + 1}`))
    .join("\n");

  const { text } = await trackedGenerateText({
    model: getCompModelId(),
    source: "comp-genie",
    system: `You are an expert real estate appraiser AI. You analyze property data to identify the most comparable properties and estimate value ranges.

**CONTEXT:** ${stateAbbrev} is a non-disclosure state — official sale prices are not publicly recorded. You must rely on AVM (Automated Valuation Model) estimates, property characteristics, and any available transfer data.

**YOUR TASK:**
1. Select the 3–5 most comparable properties from the neighbors list
2. Score similarity 0–100 based on: property type match, sqft (±20%), beds/baths, year built (±10 years), lot size, proximity
3. Adjust each comp's AVM value for differences vs. the subject (sqft delta, age, beds/baths, lot size)
4. Estimate a value range for the subject property
5. Describe market positioning (above/below area median)

**RULES:**
- Use actual data points in reasoning — reference specific numbers
- If AVM values are missing, note reduced confidence
- Weight sqft and beds/baths most heavily for similarity
- Properties of the same type (SFR vs Condo) get +20 similarity points
- Never reference protected class characteristics
- Price per sqft is a key comparison metric

Return ONLY valid JSON matching this schema:
{
  "comparables": [
    {
      "address": "123 Example St",
      "similarity": 85,
      "adjustedValue": 750000,
      "avmValue": 725000,
      "sqft": 1800,
      "beds": 3,
      "baths": 2,
      "yearBuilt": 2005,
      "reasoning": "2-3 sentence explanation with specific data comparisons"
    }
  ],
  "estimatedValueRange": { "low": 700000, "high": 800000 },
  "marketPosition": "2-3 sentence description of subject's position in the local market",
  "confidence": "high"
}`,
    prompt: `Analyze comparable properties for this subject:

${subjectSummary}

**Neighboring Properties:**
${neighborData}

Identify the best comps, adjust values, and estimate a value range for the subject.`,
    temperature: 0.3,
  });

  const json = extractJSON(text);
  const parsed = JSON.parse(json) as Omit<CompGenieResult, "subjectAddress" | "disclaimer">;

  // Sort by similarity descending
  parsed.comparables.sort((a, b) => b.similarity - a.similarity);

  return {
    subjectAddress: subject.address,
    comparables: parsed.comparables.slice(0, 5),
    estimatedValueRange: parsed.estimatedValueRange,
    marketPosition: parsed.marketPosition,
    confidence: parsed.confidence || "medium",
    disclaimer: getDisclaimer(stateAbbrev),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatProperty(p: CompProperty, label: string): string {
  const parts = [`[${label}] ${p.address}`];
  if (p.propertyType) parts.push(`Type: ${p.propertyType}`);
  if (p.avmValue) parts.push(`AVM: $${p.avmValue.toLocaleString()}`);
  if (p.avmLow && p.avmHigh) parts.push(`AVM Range: $${p.avmLow.toLocaleString()}–$${p.avmHigh.toLocaleString()}`);
  if (p.assessedValue) parts.push(`Assessed: $${p.assessedValue.toLocaleString()}`);
  if (p.transferPrice) parts.push(`Last Transfer: $${p.transferPrice.toLocaleString()}`);
  if (p.transferDate) parts.push(`Transfer Date: ${p.transferDate}`);
  if (p.sqft) parts.push(`Sqft: ${p.sqft.toLocaleString()}`);
  if (p.beds != null) parts.push(`Beds: ${p.beds}`);
  if (p.baths != null) parts.push(`Baths: ${p.baths}`);
  if (p.yearBuilt) parts.push(`Built: ${p.yearBuilt}`);
  if (p.lotSize) parts.push(`Lot: ${p.lotSize.toLocaleString()} sqft`);
  if (p.pricePerSqft) parts.push(`$/Sqft: $${p.pricePerSqft}`);
  return parts.join(" | ");
}

function getDisclaimer(stateAbbrev: string): string {
  return `${stateAbbrev} is a non-disclosure state — actual sale prices are not publicly recorded. This analysis uses AVM estimates, property characteristics, and available transfer data. Values are AI-estimated and should not replace a professional appraisal.`;
}

function extractJSON(text: string): string {
  // Try to extract JSON from markdown code blocks first
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  return text;
}
