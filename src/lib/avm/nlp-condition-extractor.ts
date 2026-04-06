/**
 * NLP Condition Extractor
 *
 * Uses Claude to parse MLS PublicRemarks into structured condition data.
 * Results are cached per listing to avoid repeated API calls.
 *
 * Condition Scale (matching standard appraisal ratings):
 *   C1 = New/luxury construction
 *   C2 = Recently renovated, high-quality finishes
 *   C3 = Well-maintained, average condition
 *   C4 = Adequate, some deferred maintenance
 *   C5 = Needs significant repairs
 *   C6 = Poor, major structural issues
 */

import Anthropic from "@anthropic-ai/sdk";

export interface ConditionResult {
  conditionScore: number; // 1-6
  qualityTier: "luxury" | "above-average" | "average" | "below-average" | "poor";
  renovationRecency: "recent" | "moderate" | "dated" | "unknown";
  features: string[];
}

// In-memory cache keyed by listing ID or address hash
const conditionCache = new Map<string, ConditionResult>();

export async function extractCondition(
  remarks: string,
  cacheKey: string,
): Promise<ConditionResult | null> {
  if (!remarks || remarks.trim().length < 20) return null;

  // Check cache
  const cached = conditionCache.get(cacheKey);
  if (cached) return cached;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Analyze this property listing description and return ONLY valid JSON with no other text:

{
  "conditionScore": <1-6 where 1=brand new luxury, 2=recently renovated, 3=well-maintained average, 4=adequate with some wear, 5=needs repairs, 6=poor condition>,
  "qualityTier": "<luxury|above-average|average|below-average|poor>",
  "renovationRecency": "<recent|moderate|dated|unknown>",
  "features": [<array of notable features like "ocean view", "renovated kitchen", "pool", "split layout">]
}

Description: ${remarks.slice(0, 1500)}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as ConditionResult;

    // Validate
    if (parsed.conditionScore < 1 || parsed.conditionScore > 6) return null;

    conditionCache.set(cacheKey, parsed);
    return parsed;
  } catch (err) {
    console.warn("[NLP Condition] Extraction failed:", (err as Error).message);
    return null;
  }
}

/**
 * Batch extract conditions for multiple comps.
 * Runs in parallel with a concurrency limit to avoid rate limits.
 */
export async function batchExtractConditions(
  comps: { remarks?: string; cacheKey: string }[],
  concurrency = 3,
): Promise<Map<string, ConditionResult>> {
  const results = new Map<string, ConditionResult>();
  const toProcess = comps.filter((c) => c.remarks && c.remarks.length >= 20);

  for (let i = 0; i < toProcess.length; i += concurrency) {
    const batch = toProcess.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map((c) => extractCondition(c.remarks!, c.cacheKey)),
    );
    for (let j = 0; j < settled.length; j++) {
      if (settled[j].status === "fulfilled" && (settled[j] as PromiseFulfilledResult<ConditionResult | null>).value) {
        results.set(batch[j].cacheKey, (settled[j] as PromiseFulfilledResult<ConditionResult | null>).value!);
      }
    }
  }

  return results;
}
