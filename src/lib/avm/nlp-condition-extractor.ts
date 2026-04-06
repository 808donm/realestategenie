/**
 * NLP Condition Extractor
 *
 * Uses Claude (via Vercel AI Gateway) to parse MLS PublicRemarks into
 * structured condition data. Results are cached per listing to avoid
 * repeated API calls.
 *
 * Condition Scale (matching standard appraisal ratings):
 *   C1 = New/luxury construction
 *   C2 = Recently renovated, high-quality finishes
 *   C3 = Well-maintained, average condition
 *   C4 = Adequate, some deferred maintenance
 *   C5 = Needs significant repairs
 *   C6 = Poor, major structural issues
 */

import { trackedGenerateText } from "@/lib/ai/ai-call-logger";

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
    const result = await trackedGenerateText({
      model: "claude-haiku-4-5-20251001",
      prompt: `Analyze this property listing description and return ONLY valid JSON with no other text:

{
  "conditionScore": <1-6 where 1=brand new luxury, 2=recently renovated, 3=well-maintained average, 4=adequate with some wear, 5=needs repairs, 6=poor condition>,
  "qualityTier": "<luxury|above-average|average|below-average|poor>",
  "renovationRecency": "<recent|moderate|dated|unknown>",
  "features": [<array of notable features like "ocean view", "renovated kitchen", "pool", "split layout">]
}

Description: ${remarks.slice(0, 1500)}`,
      maxTokens: 300,
      source: "nlp-condition-extractor",
    });

    const text = result.text || "";
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
 * Fallback: extract condition from remarks using keyword matching
 * (no AI call needed — used when AI is unavailable or for cost savings)
 */
export function extractConditionFallback(remarks: string): ConditionResult {
  if (!remarks) {
    return { conditionScore: 3, qualityTier: "average", renovationRecency: "unknown", features: [] };
  }

  const lower = remarks.toLowerCase();
  const features: string[] = [];

  // Detect features
  if (/ocean\s*view|waterfront|beachfront/i.test(lower)) features.push("ocean view");
  if (/mountain\s*view|diamond\s*head/i.test(lower)) features.push("mountain view");
  if (/pool|swimming/i.test(lower)) features.push("pool");
  if (/renovated|remodeled|updated|upgraded/i.test(lower)) features.push("renovated");
  if (/new\s*(kitchen|bath|roof|floor|appliance)/i.test(lower)) features.push("new finishes");
  if (/granite|quartz|marble|hardwood/i.test(lower)) features.push("quality finishes");
  if (/solar|photovoltaic/i.test(lower)) features.push("solar");
  if (/garage|carport/i.test(lower)) features.push("parking");
  if (/lanai|patio|deck|balcony/i.test(lower)) features.push("outdoor living");
  if (/turnkey|move.in\s*ready/i.test(lower)) features.push("move-in ready");

  // Score condition
  let score = 3; // default average
  let tier: ConditionResult["qualityTier"] = "average";
  let recency: ConditionResult["renovationRecency"] = "unknown";

  // Positive signals
  if (/brand\s*new|new\s*construction|just\s*built|never\s*lived/i.test(lower)) {
    score = 1; tier = "luxury"; recency = "recent";
  } else if (/fully\s*renovated|completely\s*remodeled|custom|luxury|pristine|immaculate/i.test(lower)) {
    score = 2; tier = "above-average"; recency = "recent";
  } else if (/renovated|remodeled|updated|upgraded|well.maintained|move.in\s*ready/i.test(lower)) {
    score = 2; tier = "above-average"; recency = "recent";
  } else if (/good\s*condition|well\s*kept|maintained/i.test(lower)) {
    score = 3; tier = "average"; recency = "moderate";
  }

  // Negative signals
  if (/fixer|needs\s*work|as.is|tlc|investor|handyman|deferred/i.test(lower)) {
    score = 5; tier = "below-average"; recency = "dated";
  }
  if (/tear\s*down|condemned|uninhabitable|major\s*repair/i.test(lower)) {
    score = 6; tier = "poor"; recency = "dated";
  }

  return { conditionScore: score, qualityTier: tier, renovationRecency: recency, features };
}
