/**
 * Agentic AI Prospecting Engine
 *
 * Provides AI-powered analysis, scoring, and outreach generation for the
 * 5 prospecting search types: absentee, equity, foreclosure, radius (just sold farming),
 * and investor portfolios.
 *
 * Uses the Vercel AI SDK Gateway for provider-agnostic model routing.
 */

import { trackedGenerateText } from "@/lib/ai/ai-call-logger";

/** Resolve the AI model ID. Uses Claude Opus; override via env. */
function getProspectModelId() {
  return process.env.PROSPECT_AI_MODEL || "anthropic/claude-opus-4";
}

// ── Types ────────────────────────────────────────────────────────────────────

export type ProspectMode = "absentee" | "equity" | "foreclosure" | "radius" | "investor";

export interface ProspectProperty {
  address: string;
  ownerName?: string;
  mailingAddress?: string;
  isAbsentee?: boolean;
  isCorporate?: boolean;
  avmValue?: number;
  assessedValue?: number;
  mortgageAmount?: number;
  ltvPct?: number;
  equityAmount?: number;
  equityPct?: number;
  saleAmount?: number;
  saleDate?: string;
  yearsOwned?: number;
  yearBuilt?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType?: string;
  taxAmount?: number;
  rentalValue?: number;
  isDistressed?: boolean;
  isUnderwater?: boolean;
  highLtv?: boolean;
  assessmentDrop?: boolean;
  negativeAppreciation?: boolean;
  // Investor mode
  propertyCount?: number;
  totalPortfolioValue?: number;
  totalEquity?: number;
  totalTaxBurden?: number;
}

export interface MarketContext {
  zipCode: string;
  medianPrice?: number;
  avgDaysOnMarket?: number;
  priceChangeYoY?: number;
  salesCount?: number;
}

export interface ProspectAnalysis {
  prospects: ScoredProspect[];
  marketSummary: string;
  topInsight: string;
  recommendedActions: string[];
}

export interface ScoredProspect {
  address: string;
  ownerName?: string;
  score: number; // 0–100
  tier: "hot" | "warm" | "long-term";
  reasoning: string;
  suggestedApproach: string;
  keyFactors: string[];
}

export interface OutreachDraft {
  address: string;
  ownerName?: string;
  letterBody: string;
  subject: string;
  smsMessage: string;
  talkingPoints: string[];
}

export interface BatchOutreach {
  drafts: OutreachDraft[];
  campaignTheme: string;
  bestTimeToSend: string;
}

// ── AI Analysis ──────────────────────────────────────────────────────────────

/**
 * Analyze and score a batch of prospects using AI.
 * Returns scored, ranked prospects with explanations and recommended actions.
 */
export async function analyzeProspects(
  mode: ProspectMode,
  properties: ProspectProperty[],
  market: MarketContext,
): Promise<ProspectAnalysis> {
  const modeContext = getModeContext(mode);
  const propsSlice = properties.slice(0, 25); // Limit to control token usage

  const propertyData = propsSlice.map((p, i) => formatPropertyForAI(p, i + 1)).join("\n");

  const { text } = await trackedGenerateText({
    model: getProspectModelId(),
    source: "prospect-ai",
    system: `You are an expert real estate prospecting analyst specializing in the Hawaii market. You help agents identify the most promising prospects and prioritize outreach.

${modeContext}

**IMPORTANT RULES:**
- Score each property 0–100 based on seller motivation likelihood
- Tier: 90–100 = hot, 60–89 = warm, below 60 = long-term
- Be specific about WHY each prospect ranks where it does
- Reference actual data points (equity amounts, years owned, LTV ratios)
- Never reference protected class characteristics (race, religion, age, family status, etc.)
- Focus on property data, financial signals, and ownership patterns
- Data sources: Realie.io property intelligence, Hawaii GIS/TMK parcel data, and Federal data (Census, FEMA, EPA, BLS, FRED)
- Hawaii-specific: consider tourism cycles, seasonal residents, mainland absentee owners, TMK parcel data

Return ONLY valid JSON matching this schema:
{
  "prospects": [
    {
      "address": "property address",
      "ownerName": "owner name or null",
      "score": 85,
      "tier": "hot",
      "reasoning": "2-3 sentence explanation using specific data points",
      "suggestedApproach": "specific outreach recommendation",
      "keyFactors": ["factor1", "factor2", "factor3"]
    }
  ],
  "marketSummary": "2-3 sentence market context for this zip code",
  "topInsight": "single most important insight from this batch",
  "recommendedActions": ["action1", "action2", "action3"]
}`,
    prompt: `Analyze these ${propsSlice.length} prospects in ${market.zipCode}:

**Market Context:**
- Median Price: ${market.medianPrice ? `$${market.medianPrice.toLocaleString()}` : "Unknown"}
- Avg Days on Market: ${market.avgDaysOnMarket ?? "Unknown"}
- YoY Price Change: ${market.priceChangeYoY != null ? `${market.priceChangeYoY.toFixed(1)}%` : "Unknown"}
- Recent Sales: ${market.salesCount ?? "Unknown"}

**Search Mode:** ${mode} — ${modeContext}

**Properties:**
${propertyData}

Score, rank, and explain each prospect. Identify the highest-priority targets and recommend specific next actions.`,
    temperature: 0.4,
  });

  const json = extractJSON(text);
  const parsed = JSON.parse(json) as ProspectAnalysis;

  // Sort by score descending
  parsed.prospects.sort((a, b) => b.score - a.score);

  return parsed;
}

// ── AI Outreach Drafting ─────────────────────────────────────────────────────

/**
 * Generate personalized outreach drafts for a batch of prospects.
 * Creates letters, SMS messages, and talking points for each.
 */
export async function generateOutreach(
  mode: ProspectMode,
  properties: ProspectProperty[],
  market: MarketContext,
  agentName: string,
  agentPhone?: string,
): Promise<BatchOutreach> {
  const modeContext = getModeContext(mode);
  const propsSlice = properties.slice(0, 10); // Limit for outreach generation

  const propertyData = propsSlice.map((p, i) => formatPropertyForAI(p, i + 1)).join("\n");

  const { text } = await trackedGenerateText({
    model: getProspectModelId(),
    source: "prospect-ai",
    system: `You are an expert real estate copywriter specializing in Hawaii prospecting outreach. You write personalized, compelling letters and messages that motivate property owners to consider selling.

${modeContext}

**CRITICAL COMPLIANCE RULES:**
- NEVER mention protected class characteristics (race, religion, nationality, family status, disability, sex)
- NEVER use "Dear Homeowner" — personalize with actual owner name when available
- NEVER make guarantees about sale price or timeline
- NEVER use high-pressure tactics or create false urgency
- DO reference specific property data (equity, years owned, market trends)
- DO provide genuine value (market insight, comparable sales, equity analysis)
- DO keep tone professional, warm, and consultative
- DO adapt messaging to Hawaii's unique market and culture

**OUTREACH TYPES:**
1. **Letter/Email Body**: 150-200 words, professional tone, value-driven
2. **Subject Line**: Under 60 chars, curiosity-driven, no clickbait
3. **SMS**: Under 160 chars, casual but professional
4. **Talking Points**: 3-4 bullet points for phone conversation

Return ONLY valid JSON:
{
  "drafts": [
    {
      "address": "property address",
      "ownerName": "owner name or null",
      "letterBody": "full letter text",
      "subject": "email subject line",
      "smsMessage": "SMS message under 160 chars",
      "talkingPoints": ["point1", "point2", "point3"]
    }
  ],
  "campaignTheme": "overall campaign theme/hook",
  "bestTimeToSend": "recommended timing"
}`,
    prompt: `Generate personalized outreach for these ${propsSlice.length} prospects:

**Agent:** ${agentName}${agentPhone ? ` | ${agentPhone}` : ""}
**Mode:** ${mode}
**Market (${market.zipCode}):**
- Median: ${market.medianPrice ? `$${market.medianPrice.toLocaleString()}` : "N/A"}
- YoY Change: ${market.priceChangeYoY != null ? `${market.priceChangeYoY.toFixed(1)}%` : "N/A"}
- Avg DOM: ${market.avgDaysOnMarket ?? "N/A"}

**Properties:**
${propertyData}

Create personalized outreach for each property. Reference specific data points to demonstrate knowledge and provide value.`,
    temperature: 0.6,
  });

  const json = extractJSON(text);
  return JSON.parse(json) as BatchOutreach;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getModeContext(mode: ProspectMode): string {
  switch (mode) {
    case "absentee":
      return `**ABSENTEE OWNERS**: These are non-owner-occupied properties — landlords, out-of-state owners, corporate entities. Key motivation signals: distance from property, corporate ownership, property management burden, tax burden, potential rental income vs. sale proceeds, mainland owners with Hawaii properties. Focus on the hassle of remote management and the opportunity to cash out equity.`;

    case "equity":
      return `**HIGH EQUITY / LIKELY SELLERS**: Long-tenure owners with significant built-up equity. Key signals: years owned (10+), equity percentage, appreciation since purchase, property condition relative to age, neighborhood turnover patterns. Focus on "unlocking" trapped equity, downsizing opportunities, and market timing.`;

    case "foreclosure":
      return `**DISTRESSED / PRE-FORECLOSURE**: Properties with financial stress indicators — underwater mortgages, high LTV, declining assessments, negative or minimal appreciation. Key signals: LTV > 80%, underwater status, assessment drops, stagnant values. Focus on helping owners avoid foreclosure, short sale options, and preserving credit. Be sensitive and solution-oriented, never predatory.`;

    case "radius":
      return `**JUST SOLD FARMING**: Nearby homeowners around a recently sold property. Key signals: proximity to recent sale, comparable property characteristics, equity position, ownership tenure. Focus on "Your neighbor's home just sold" messaging — leverage social proof and local market activity to prompt consideration.`;

    case "investor":
      return `**INVESTOR PORTFOLIOS**: Multi-property owners, corporate entities, and landlords with 2+ properties. Key signals: portfolio size, total tax burden, aggregate equity, rental income potential, property age/condition, corporate structure. Focus on portfolio optimization, 1031 exchange opportunities, and capital reallocation.`;
  }
}

function formatPropertyForAI(p: ProspectProperty, index: number): string {
  const parts: string[] = [`#${index} ${p.address}`];

  if (p.ownerName) parts.push(`Owner: ${p.ownerName}`);
  if (p.isAbsentee) parts.push("Absentee: Yes");
  if (p.isCorporate) parts.push("Corporate: Yes");
  if (p.avmValue) parts.push(`Value: $${p.avmValue.toLocaleString()}`);
  if (p.mortgageAmount) parts.push(`Mortgage: $${p.mortgageAmount.toLocaleString()}`);
  if (p.equityAmount) parts.push(`Equity: $${p.equityAmount.toLocaleString()}`);
  if (p.equityPct != null) parts.push(`Equity%: ${p.equityPct.toFixed(1)}%`);
  if (p.ltvPct != null) parts.push(`LTV: ${p.ltvPct.toFixed(1)}%`);
  if (p.saleAmount) parts.push(`Last Sale: $${p.saleAmount.toLocaleString()}`);
  if (p.saleDate) parts.push(`Sale Date: ${p.saleDate}`);
  if (p.yearsOwned != null) parts.push(`Years Owned: ${p.yearsOwned}`);
  if (p.yearBuilt) parts.push(`Built: ${p.yearBuilt}`);
  if (p.beds) parts.push(`Beds: ${p.beds}`);
  if (p.baths) parts.push(`Baths: ${p.baths}`);
  if (p.sqft) parts.push(`Sqft: ${p.sqft.toLocaleString()}`);
  if (p.taxAmount) parts.push(`Tax: $${p.taxAmount.toLocaleString()}`);
  if (p.rentalValue) parts.push(`Rental: $${p.rentalValue.toLocaleString()}/mo`);
  if (p.isDistressed) parts.push("DISTRESSED");
  if (p.isUnderwater) parts.push("UNDERWATER");
  if (p.highLtv) parts.push("HIGH_LTV");
  if (p.assessmentDrop) parts.push("ASSESSMENT_DROP");
  if (p.negativeAppreciation) parts.push("NEG_APPRECIATION");
  // Investor-specific
  if (p.propertyCount) parts.push(`Portfolio: ${p.propertyCount} properties`);
  if (p.totalPortfolioValue) parts.push(`Total Value: $${p.totalPortfolioValue.toLocaleString()}`);
  if (p.totalEquity) parts.push(`Total Equity: $${p.totalEquity.toLocaleString()}`);
  if (p.totalTaxBurden) parts.push(`Total Tax: $${p.totalTaxBurden.toLocaleString()}/yr`);

  return parts.join(" | ");
}

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  return text.trim();
}
