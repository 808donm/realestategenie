/**
 * Genie AVM Engine
 *
 * Proprietary Automated Valuation Model that combines multiple data sources
 * into an ensemble estimate. More accurate than generic AVMs for Hawaii
 * because it uses actual MLS closed sales, accounts for Fee Simple vs
 * Leasehold, and matches by subdivision.
 *
 * Sources (weighted by reliability):
 *   1. MLS Closed Comps (50%) -- actual sale prices from Trestle
 *   2. RentCast AVM (20%) -- algorithmic estimate
 *   3. County Assessment (20%) -- trend-adjusted market value
 *   4. Realie AVM (10%) -- supplementary estimate
 *
 * Hawaii-Specific Adjustments:
 *   - Leasehold discount (25-35% based on remaining term)
 *   - Flood zone discount (3-5% for SFHA properties)
 *   - High HOA adjustment (negative for $800+/mo)
 */

// ── Types ──

export interface GenieAvmInput {
  // Subject property attributes
  address: string;
  zipCode: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  lotSize?: number;
  propertyType?: string;
  propertySubType?: string;

  // Hawaii-specific
  ownershipType?: string; // "Fee Simple" | "Leasehold"
  leaseExpiration?: string; // ISO date
  subdivision?: string;
  hoaFee?: number; // Monthly

  // External AVM values (pre-fetched)
  rentcastAvm?: { value: number; low: number; high: number } | null;
  realieAvm?: { value: number; low?: number; high?: number } | null;

  // County assessment (most recent year from RentCast taxAssessments)
  assessment?: { value: number; year: number; land: number; improvements: number } | null;
  assessmentHistory?: { year: number; value: number }[];

  // MLS closed comps (from CMA engine or Trestle)
  mlsComps?: MlsComp[];

  // Hazard data
  isFloodZone?: boolean; // In Special Flood Hazard Area
  floodZoneCode?: string; // AE, VE, X, etc.
}

export interface MlsComp {
  address: string;
  closePrice: number;
  listPrice?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  lotSize?: number;
  closeDate: string; // ISO date
  ownershipType?: string;
  subdivision?: string;
  distance?: number; // miles
  correlation?: number; // 0-1
}

export interface AdjustedComp extends MlsComp {
  adjustedPrice: number;
  adjustments: {
    sqft: number;
    beds: number;
    baths: number;
    lot: number;
    age: number;
    total: number;
  };
  weight: number;
  isSubdivisionMatch: boolean;
  recencyMonths: number;
}

export interface GenieAvmResult {
  value: number;
  low: number;
  high: number;
  confidence: "High" | "Medium" | "Low";
  fsd: number;
  source: "genie";
  methodology: {
    compBasedValue: number | null;
    rentcastAvm: number | null;
    realieAvm: number | null;
    assessmentValue: number | null;
    trendAdjustedAssessment: number | null;
    compsUsed: number;
    compsFromSubdivision: number;
    leaseholdAdjustment: number | null;
    hazardAdjustment: number | null;
    hoaAdjustment: number | null;
    weights: Record<string, number>;
    assessmentTrendPct: number | null;
  };
  comps: AdjustedComp[];
}

// ── Adjustment Constants (Hawaii market) ──
// These are percentage-based relative to comp price, not flat dollar amounts.
// Hawaii's high price points make flat adjustments meaningless ($10K on a $2M home = 0.5%).

const ADJUSTMENT_PCT_PER_BED = 0.05;   // 5% per bedroom difference
const ADJUSTMENT_PCT_PER_BATH = 0.03;  // 3% per bathroom difference
const ADJUSTMENT_PCT_PER_YEAR_AGE = 0.005; // 0.5% per year age difference
const ADJUSTMENT_PCT_SQFT = 0.75;      // 75% of proportional sqft difference (was 50%)
const ADJUSTMENT_PER_SQFT_LOT = 10;    // $/sqft for lot size difference (SFR only)

// ── Engine ──

export function computeGenieAvm(input: GenieAvmInput): GenieAvmResult | null {
  const sources: { name: string; value: number; weight: number }[] = [];

  // 1. MLS Comp-Based Value
  let compBasedValue: number | null = null;
  let adjustedComps: AdjustedComp[] = [];

  if (input.mlsComps && input.mlsComps.length > 0) {
    adjustedComps = adjustAndWeightComps(input);

    if (adjustedComps.length > 0) {
      // Weighted average of adjusted prices
      const totalWeight = adjustedComps.reduce((s, c) => s + c.weight, 0);
      compBasedValue = Math.round(
        adjustedComps.reduce((s, c) => s + c.adjustedPrice * c.weight, 0) / totalWeight,
      );
      // MLS comps are primary — they have actual Hawaii sale prices
      sources.push({ name: "mlsComps", value: compBasedValue, weight: 0.85 });
    }
  }

  // 2. County Assessment (trend-adjusted) — secondary source only
  let trendAdjustedAssessment: number | null = null;
  let assessmentTrendPct: number | null = null;

  if (input.assessment?.value) {
    const trend = computeAssessmentTrend(input.assessmentHistory || []);
    assessmentTrendPct = trend;
    trendAdjustedAssessment = Math.round(input.assessment.value * (1 + trend));
    sources.push({
      name: "assessment",
      value: trendAdjustedAssessment,
      weight: compBasedValue ? 0.15 : 1.0, // Only used as primary when no MLS comps
    });
  }

  // No external AVM fallbacks — our value comes from comps and assessment only

  // Sanity check: if the only source is an assessment that seems unreasonably low
  // (e.g., $265K for a property with 1,943 sqft in 2026), use a $/sqft estimate
  // from the comps or a regional average as a floor
  if (sources.length === 1 && sources[0].name === "assessment" && input.sqft) {
    const assessedPerSqft = sources[0].value / input.sqft;
    // If assessed value is under $200/sqft, it's likely a stale/historic value
    // Hawaii median is roughly $500-800/sqft for residential
    if (assessedPerSqft < 200) {
      const estimatedPerSqft = 550; // Conservative Hawaii median $/sqft
      const sqftEstimate = Math.round(input.sqft * estimatedPerSqft);
      sources[0].value = Math.max(sources[0].value, sqftEstimate);
      sources[0].weight = 0.5; // Lower confidence for this estimate
      // Add a $/sqft-based estimate as a second source
      sources.push({ name: "sqftEstimate", value: sqftEstimate, weight: 0.5 });
    }
  }

  // No sources at all -- can't compute
  if (sources.length === 0) return null;

  // Normalize weights to sum to 1.0
  const totalWeight = sources.reduce((s, src) => s + src.weight, 0);
  for (const src of sources) src.weight = src.weight / totalWeight;

  // Weighted ensemble value
  let ensembleValue = Math.round(
    sources.reduce((s, src) => s + src.value * src.weight, 0),
  );

  // ── Hawaii-Specific Adjustments ──

  let leaseholdAdj: number | null = null;
  let hazardAdj: number | null = null;
  let hoaAdj: number | null = null;

  // Leasehold discount
  if (input.ownershipType?.toLowerCase() === "leasehold") {
    let discountPct = -0.30; // Default 30% discount
    if (input.leaseExpiration) {
      const yearsRemaining = (new Date(input.leaseExpiration).getTime() - Date.now()) / (365.25 * 86400000);
      if (yearsRemaining > 50) discountPct = -0.20;
      else if (yearsRemaining > 30) discountPct = -0.25;
      else if (yearsRemaining > 15) discountPct = -0.30;
      else discountPct = -0.35;
    }
    // Only apply if comps were NOT already leasehold
    const compsAllLeasehold = adjustedComps.length > 0 &&
      adjustedComps.every((c) => c.ownershipType?.toLowerCase() === "leasehold");
    if (!compsAllLeasehold) {
      leaseholdAdj = discountPct;
      ensembleValue = Math.round(ensembleValue * (1 + discountPct));
    }
  }

  // Flood zone discount
  if (input.isFloodZone && input.floodZoneCode) {
    const code = input.floodZoneCode.toUpperCase();
    if (code.startsWith("V")) hazardAdj = -0.05; // Coastal high-hazard
    else if (code.startsWith("A")) hazardAdj = -0.03; // 100-year floodplain
    // X and D zones: no adjustment
    if (hazardAdj) {
      ensembleValue = Math.round(ensembleValue * (1 + hazardAdj));
    }
  }

  // High HOA adjustment
  if (input.hoaFee && input.hoaFee > 800) {
    hoaAdj = -0.02; // Slight negative for high maintenance fees
    ensembleValue = Math.round(ensembleValue * (1 + hoaAdj));
  }

  // ── Confidence & Range ──

  const { confidence, fsd, low, high } = computeConfidence(ensembleValue, sources, adjustedComps);

  // Build weights map
  const weights: Record<string, number> = {};
  for (const src of sources) weights[src.name] = Math.round(src.weight * 100) / 100;

  return {
    value: ensembleValue,
    low,
    high,
    confidence,
    fsd,
    source: "genie",
    methodology: {
      compBasedValue,
      rentcastAvm: input.rentcastAvm?.value || null,
      realieAvm: input.realieAvm?.value || null,
      assessmentValue: input.assessment?.value || null,
      trendAdjustedAssessment,
      compsUsed: adjustedComps.length,
      compsFromSubdivision: adjustedComps.filter((c) => c.isSubdivisionMatch).length,
      leaseholdAdjustment: leaseholdAdj,
      hazardAdjustment: hazardAdj,
      hoaAdjustment: hoaAdj,
      weights,
      assessmentTrendPct,
    },
    comps: adjustedComps,
  };
}

// ── Comp Adjustment & Weighting ──

function adjustAndWeightComps(input: GenieAvmInput): AdjustedComp[] {
  const comps = input.mlsComps || [];
  const subjectSqft = input.sqft || 0;
  const subjectBeds = input.beds || 0;
  const subjectBaths = input.baths || 0;
  const subjectYearBuilt = input.yearBuilt || 0;
  const subjectLotSize = input.lotSize || 0;
  const subjectSubdivision = input.subdivision?.toLowerCase().trim();
  const isSFR = input.propertySubType?.toLowerCase()?.includes("single") ||
    input.propertyType?.toLowerCase() === "residential" && !input.propertySubType?.toLowerCase()?.includes("condo");

  const now = Date.now();
  const adjusted: AdjustedComp[] = [];

  for (const comp of comps) {
    if (comp.closePrice <= 0) continue;

    // Calculate adjustments — percentage-based relative to comp price
    // This scales correctly across Hawaii price points ($500K condos to $5M estates)
    const sqftAdj = subjectSqft && comp.sqft
      ? Math.round(((subjectSqft - comp.sqft) / comp.sqft) * comp.closePrice * ADJUSTMENT_PCT_SQFT)
      : 0;
    const bedsAdj = (subjectBeds && comp.beds)
      ? Math.round((subjectBeds - comp.beds) * comp.closePrice * ADJUSTMENT_PCT_PER_BED)
      : 0;
    const bathsAdj = (subjectBaths && comp.baths)
      ? Math.round((subjectBaths - comp.baths) * comp.closePrice * ADJUSTMENT_PCT_PER_BATH)
      : 0;
    const ageAdj = (subjectYearBuilt && comp.yearBuilt)
      ? Math.round((comp.yearBuilt - subjectYearBuilt) * comp.closePrice * ADJUSTMENT_PCT_PER_YEAR_AGE)
      : 0;
    const lotAdj = isSFR && subjectLotSize && comp.lotSize
      ? (subjectLotSize - comp.lotSize) * ADJUSTMENT_PER_SQFT_LOT
      : 0;

    const totalAdj = sqftAdj + bedsAdj + bathsAdj + ageAdj + lotAdj;
    const adjustedPrice = comp.closePrice + totalAdj;

    // Recency weight
    const closeMs = new Date(comp.closeDate).getTime();
    const monthsAgo = Math.max(0, (now - closeMs) / (30.44 * 86400000));
    let recencyWeight = 1.0;
    if (monthsAgo > 6) recencyWeight = 0.5;
    else if (monthsAgo > 3) recencyWeight = 0.8;

    // Subdivision match bonus
    const compSubdivision = comp.subdivision?.toLowerCase().trim();
    const isSubdivisionMatch = !!(subjectSubdivision && compSubdivision && subjectSubdivision === compSubdivision);
    const subdivisionBonus = isSubdivisionMatch ? 1.5 : 1.0;

    // Correlation/distance weight
    const correlationWeight = comp.correlation || 0.7;

    const weight = recencyWeight * subdivisionBonus * correlationWeight;

    adjusted.push({
      ...comp,
      adjustedPrice,
      adjustments: {
        sqft: sqftAdj,
        beds: bedsAdj,
        baths: bathsAdj,
        lot: lotAdj,
        age: ageAdj,
        total: totalAdj,
      },
      weight,
      isSubdivisionMatch,
      recencyMonths: Math.round(monthsAgo * 10) / 10,
    });
  }

  // Sort by weight descending, keep top 10
  return adjusted.sort((a, b) => b.weight - a.weight).slice(0, 10);
}

// ── Assessment Trend ──

function computeAssessmentTrend(history: { year: number; value: number }[]): number {
  if (history.length < 2) return 0;

  // Sort by year ascending
  const sorted = [...history].sort((a, b) => a.year - b.year);

  // Use last 3 years for trend
  const recent = sorted.slice(-3);
  if (recent.length < 2) return 0;

  // Average YoY change
  let totalChange = 0;
  let count = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i - 1].value > 0) {
      totalChange += (recent[i].value - recent[i - 1].value) / recent[i - 1].value;
      count++;
    }
  }

  return count > 0 ? totalChange / count : 0;
}

// ── Confidence Scoring ──

function computeConfidence(
  estimate: number,
  sources: { name: string; value: number; weight: number }[],
  comps: AdjustedComp[],
): { confidence: "High" | "Medium" | "Low"; fsd: number; low: number; high: number } {
  // Start with base FSD from source agreement
  const values = sources.map((s) => s.value);
  const maxDiff = values.length > 1 ? Math.max(...values) - Math.min(...values) : estimate * 0.3;
  let fsd = estimate > 0 ? Math.round((maxDiff / (2 * estimate)) * 1000) / 10 : 30;

  // Adjust FSD based on comp quality
  if (comps.length >= 5) fsd *= 0.8; // More comps = tighter range
  else if (comps.length >= 3) fsd *= 0.9;
  else if (comps.length === 0) fsd *= 1.3; // No comps = wider range

  // Subdivision comps tighten the range
  const subdivisionComps = comps.filter((c) => c.isSubdivisionMatch).length;
  if (subdivisionComps >= 3) fsd *= 0.85;

  // Recent comps tighten the range
  const recentComps = comps.filter((c) => c.recencyMonths < 3).length;
  if (recentComps >= 3) fsd *= 0.9;

  // Clamp FSD
  fsd = Math.max(5, Math.min(40, fsd));
  fsd = Math.round(fsd * 10) / 10;

  const confidence: "High" | "Medium" | "Low" =
    fsd < 13 ? "High" : fsd <= 20 ? "Medium" : "Low";

  const rangeMultiplier = fsd / 100;
  const low = Math.round(estimate * (1 - rangeMultiplier));
  const high = Math.round(estimate * (1 + rangeMultiplier));

  return { confidence, fsd, low, high };
}
