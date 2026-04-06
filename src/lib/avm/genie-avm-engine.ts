/**
 * Genie AVM Engine v2 - Hybrid Ensemble Valuation Model
 *
 * Lender-grade Automated Valuation Model implementing four industry-standard
 * methodologies in a unified pipeline. Every property type (SFR, condo,
 * townhome, vacant land) flows through the same model with property-type-aware
 * feature weights.
 *
 * Four Pillars:
 *   1. Hedonic Pricing - Attribute-based baseline from area market rates
 *   2. Repeat-Sales Index - HPI-projected value from own transaction history
 *   3. CMA (Comps) - Spatially and temporally weighted comparable analysis
 *   4. AI Validation - Claude-based sanity check for low-confidence results
 *
 * Quality Control:
 *   - FSD (Forecast Standard Deviation) from pillar agreement
 *   - Confidence score (1-100) based on data quality signals
 *   - Full audit trail (methodology breakdown) for every valuation
 *   - Temporal normalization of all comp prices via HPI
 *   - Data harmonization with source hierarchy
 */

// ── Property Classification ──

export type PropertyCategory = "sfr" | "condo" | "townhome" | "land";

export function classifyProperty(propertyType?: string, propertySubType?: string): PropertyCategory {
  const sub = (propertySubType || "").toLowerCase();
  const type = (propertyType || "").toLowerCase();
  if (sub.includes("vacant") || sub.includes("land") || type.includes("land")) return "land";
  if (sub.includes("condo") || sub.includes("condominium") || sub.includes("apartment") || sub.includes("co-op")) return "condo";
  if (sub.includes("townhouse") || sub.includes("townhome") || sub.includes("town home")) return "townhome";
  return "sfr";
}

// ── Types ──

export interface GenieAvmInput {
  // Subject property (harmonized)
  address: string;
  zipCode: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  lotSize?: number;
  stories?: number;
  propertyType?: string;
  propertySubType?: string;

  // Hawaii-specific
  ownershipType?: string; // "Fee Simple" | "Leasehold"
  leaseExpiration?: string; // ISO date
  subdivision?: string; // building name for condos
  hoaFee?: number; // Monthly

  // Condition (from NLP extraction)
  conditionScore?: number; // 1-6 (1=new/luxury, 6=poor)
  conditionFeatures?: string[];

  // Sales history (for repeat-sales pillar)
  salesHistory?: { price: number; date: string }[];

  // Assessment history
  assessment?: { value: number; year: number; land: number; improvements: number } | null;
  assessmentHistory?: { year: number; value: number }[];

  // Area market context (for hedonic pillar)
  areaMedianPricePerSqft?: number;
  areaMedianPrice?: number;
  areaHPI?: { period: string; hpi: number }[]; // quarterly HPI from FRED

  // Location quality
  crimeIndex?: number; // 100 = national average
  schoolQualityScore?: number; // 0-100

  // Hazard data
  isFloodZone?: boolean;
  floodZoneCode?: string;
  tsunamiZone?: boolean;
  lavaFlowZone?: number;
  seaLevelRise?: boolean;

  // MLS closed comps
  mlsComps?: MlsComp[];

  // External AVM references (cross-check only, not primary sources)
  externalAvms?: { source: string; value: number }[];

  // Legacy fields preserved for backward compatibility during migration
  rentcastAvm?: { value: number; low: number; high: number } | null;
  realieAvm?: { value: number; low?: number; high?: number } | null;
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
  propertySubType?: string;
  conditionScore?: number;
  dom?: number;
}

export interface AdjustedComp extends MlsComp {
  adjustedPrice: number;
  hpiAdjustedClosePrice: number;
  adjustments: {
    sqft: number;
    beds: number;
    baths: number;
    lot: number;
    age: number;
    condition: number;
    temporal: number; // HPI time adjustment
    total: number;
  };
  weight: number;
  isBuildingMatch: boolean;
  recencyMonths: number;
  spatialWeight: number;
  temporalWeight: number;
}

// ── Result Types ──

export interface PillarResult {
  name: string;
  value: number;
  weight: number;
  dataPoints: number; // number of data points used
  details: string; // human-readable methodology note
}

export interface GenieAvmResult {
  value: number;
  low: number;
  high: number;
  confidence: "High" | "Medium" | "Low" | "Very Low";
  confidenceScore: number; // 1-100
  fsd: number; // Forecast Standard Deviation (0.0 - 1.0 scale, e.g. 0.10 = 10%)
  source: "genie";
  category: PropertyCategory;
  methodology: {
    pillars: PillarResult[];
    hedonicValue: number | null;
    repeatSalesValue: number | null;
    cmaValue: number | null;
    compsUsed: number;
    compsFromBuilding: number;
    compMedianDistance: number | null;
    compMedianRecency: number | null;
    salesHistoryDepth: number;
    hpiTrendUsed: number | null;
    temporalNormalization: boolean;
    conditionScoreUsed: boolean;
    leaseholdAdjustment: number | null;
    hazardAdjustment: number | null;
    hoaAdjustment: number | null;
    weights: Record<string, number>;
    assessmentTrendPct: number | null;
    dataSources: string[];
    escalationNeeded: boolean;
    // Legacy fields for backward compatibility
    compBasedValue: number | null;
    rentcastAvm: number | null;
    realieAvm: number | null;
    assessmentValue: number | null;
    trendAdjustedAssessment: number | null;
    compsFromSubdivision: number;
  };
  comps: AdjustedComp[];
}

// ── Feature Weight Tables (same model, different weights per category) ──

interface FeatureWeights {
  sqft: number;
  beds: number;
  baths: number;
  age: number;
  lot: number;
  buildingMatch: number;
  condition: number;
  hoa: number;
}

const FEATURE_WEIGHTS: Record<PropertyCategory, FeatureWeights> = {
  sfr: { sqft: 0.75, beds: 0.05, baths: 0.03, age: 0.005, lot: 10, buildingMatch: 1.5, condition: 0.03, hoa: 0.01 },
  condo: { sqft: 0.80, beds: 0.05, baths: 0.03, age: 0.0015, lot: 0, buildingMatch: 2.5, condition: 0.04, hoa: 0.0, },
  townhome: { sqft: 0.75, beds: 0.05, baths: 0.03, age: 0.003, lot: 3, buildingMatch: 2.0, condition: 0.03, hoa: 0.005, },
  land: { sqft: 0, beds: 0, baths: 0, age: 0, lot: 15, buildingMatch: 1.0, condition: 0, hoa: 0 },
};

// ── Ensemble Base Weights ──

const BASE_PILLAR_WEIGHTS = {
  hedonic: 0.20,
  repeatSales: 0.30,
  cma: 0.50,
};

// ── Main Engine ──

export function computeGenieAvm(input: GenieAvmInput): GenieAvmResult | null {
  const category = classifyProperty(input.propertyType, input.propertySubType);
  const dataSources: string[] = [];
  const pillars: PillarResult[] = [];

  // ═══════════════════════════════════════════════════════════════════
  // PILLAR 1: Hedonic Pricing Model
  // Attribute-based baseline from area market rates
  // ═══════════════════════════════════════════════════════════════════
  const hedonicResult = computeHedonicValue(input, category);
  if (hedonicResult) {
    pillars.push(hedonicResult);
    dataSources.push("hedonic:area-market-data");
  }

  // ═══════════════════════════════════════════════════════════════════
  // PILLAR 2: Repeat-Sales Index
  // HPI-projected value from own transaction history
  // ═══════════════════════════════════════════════════════════════════
  const repeatSalesResult = computeRepeatSalesValue(input);
  if (repeatSalesResult) {
    pillars.push(repeatSalesResult);
    dataSources.push("repeat-sales:own-history");
  }

  // ═══════════════════════════════════════════════════════════════════
  // PILLAR 3: CMA (Comparable Market Analysis)
  // Spatially and temporally weighted comparable analysis
  // ═══════════════════════════════════════════════════════════════════
  let adjustedComps: AdjustedComp[] = [];
  const cmaResult = computeCmaValue(input, category);
  if (cmaResult) {
    pillars.push(cmaResult.pillar);
    adjustedComps = cmaResult.comps;
    dataSources.push(`cma:${cmaResult.comps.length}-comps`);
  }

  // If assessment data available, add as supplementary
  const assessmentTrendPct = computeAssessmentTrend(input.assessmentHistory || []);
  if (input.assessment?.value) {
    dataSources.push("assessment:county-tax");
  }

  // No pillars produced a result -- insufficient data
  if (pillars.length === 0) {
    // Last resort: try assessment-only estimate
    if (input.assessment?.value) {
      const trendAdj = Math.round(input.assessment.value * (1 + assessmentTrendPct));
      pillars.push({
        name: "assessment",
        value: trendAdj,
        weight: 1.0,
        dataPoints: 1,
        details: `Trend-adjusted county assessment ($${input.assessment.value.toLocaleString()} + ${Math.round(assessmentTrendPct * 100)}% trend)`,
      });
    } else {
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // DYNAMIC ENSEMBLE WEIGHTING
  // ═══════════════════════════════════════════════════════════════════
  assignDynamicWeights(pillars, adjustedComps);

  // Normalize weights
  const totalWeight = pillars.reduce((s, p) => s + p.weight, 0);
  for (const p of pillars) p.weight = p.weight / totalWeight;

  // Weighted ensemble value
  let ensembleValue = Math.round(
    pillars.reduce((s, p) => s + p.value * p.weight, 0),
  );

  // ═══════════════════════════════════════════════════════════════════
  // HAWAII-SPECIFIC ADJUSTMENTS
  // Applied after ensemble, affects all property types equally
  // ═══════════════════════════════════════════════════════════════════
  let leaseholdAdj: number | null = null;
  let hazardAdj: number | null = null;
  let hoaAdj: number | null = null;

  // Leasehold discount
  if (input.ownershipType?.toLowerCase() === "leasehold") {
    let discountPct = -0.30;
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

  // Flood/hazard zone discount
  if (input.isFloodZone && input.floodZoneCode) {
    const code = input.floodZoneCode.toUpperCase();
    if (code.startsWith("V")) hazardAdj = -0.05;
    else if (code.startsWith("A")) hazardAdj = -0.03;
    if (hazardAdj) {
      ensembleValue = Math.round(ensembleValue * (1 + hazardAdj));
    }
  }
  if (input.tsunamiZone && !hazardAdj) {
    hazardAdj = -0.02;
    ensembleValue = Math.round(ensembleValue * (1 + hazardAdj));
  }
  if (input.lavaFlowZone && input.lavaFlowZone <= 3 && !hazardAdj) {
    hazardAdj = -0.04;
    ensembleValue = Math.round(ensembleValue * (1 + hazardAdj));
  }

  // HOA adjustment - proportional, not flat
  if (input.hoaFee && input.hoaFee > 0 && ensembleValue > 0) {
    const annualHoa = input.hoaFee * 12;
    const hoaCostRatio = annualHoa / ensembleValue;
    // For condos/townhomes, HOA is expected - only penalize when excessive (>1.5% of value annually)
    // For SFR, any significant HOA is unusual
    const threshold = category === "sfr" ? 0.005 : 0.015;
    if (hoaCostRatio > threshold) {
      hoaAdj = -Math.min(0.05, (hoaCostRatio - threshold) * 2);
      ensembleValue = Math.round(ensembleValue * (1 + hoaAdj));
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // CONFIDENCE & FSD
  // ═══════════════════════════════════════════════════════════════════
  const { confidenceScore, fsd, low, high, confidence, escalationNeeded } =
    computeConfidenceAndFsd(ensembleValue, pillars, adjustedComps, input);

  // Build weights map
  const weights: Record<string, number> = {};
  for (const p of pillars) weights[p.name] = Math.round(p.weight * 100) / 100;

  const hedonicValue = pillars.find((p) => p.name === "hedonic")?.value ?? null;
  const repeatSalesValue = pillars.find((p) => p.name === "repeatSales")?.value ?? null;
  const cmaValue = pillars.find((p) => p.name === "cma")?.value ?? null;

  const buildingComps = adjustedComps.filter((c) => c.isBuildingMatch).length;
  const distances = adjustedComps.map((c) => c.distance).filter((d): d is number => d != null);
  const recencies = adjustedComps.map((c) => c.recencyMonths);

  return {
    value: ensembleValue,
    low,
    high,
    confidence,
    confidenceScore,
    fsd,
    source: "genie",
    category,
    methodology: {
      pillars,
      hedonicValue,
      repeatSalesValue,
      cmaValue,
      compsUsed: adjustedComps.length,
      compsFromBuilding: buildingComps,
      compMedianDistance: distances.length > 0 ? median(distances) : null,
      compMedianRecency: recencies.length > 0 ? median(recencies) : null,
      salesHistoryDepth: input.salesHistory?.length || 0,
      hpiTrendUsed: getAnnualHpiTrend(input.areaHPI),
      temporalNormalization: !!input.areaHPI?.length,
      conditionScoreUsed: input.conditionScore != null,
      leaseholdAdjustment: leaseholdAdj,
      hazardAdjustment: hazardAdj,
      hoaAdjustment: hoaAdj,
      weights,
      assessmentTrendPct: assessmentTrendPct || null,
      dataSources,
      escalationNeeded,
      // Legacy fields
      compBasedValue: cmaValue,
      rentcastAvm: input.rentcastAvm?.value || null,
      realieAvm: input.realieAvm?.value || null,
      assessmentValue: input.assessment?.value || null,
      trendAdjustedAssessment: input.assessment?.value
        ? Math.round(input.assessment.value * (1 + assessmentTrendPct))
        : null,
      compsFromSubdivision: buildingComps,
    },
    comps: adjustedComps,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PILLAR 1: Hedonic Pricing Model
// Decomposes value into attribute contributions using area market rates
// ═══════════════════════════════════════════════════════════════════

function computeHedonicValue(input: GenieAvmInput, category: PropertyCategory): PillarResult | null {
  // Need at minimum sqft and area $/sqft to produce a hedonic estimate
  if (!input.sqft || !input.areaMedianPricePerSqft || input.areaMedianPricePerSqft <= 0) return null;
  if (category === "land" && !input.lotSize) return null;

  let dataPoints = 0;

  // Base: area $/sqft * subject sqft (or lot for land)
  let baseline: number;
  if (category === "land") {
    // For land, use lot size as primary. Derive $/lot-sqft from area median and typical lot sizes.
    const lotPricePerSqft = input.areaMedianPricePerSqft * 0.4; // land typically 30-50% of improved $/sqft
    baseline = input.lotSize! * lotPricePerSqft;
    dataPoints++;
  } else {
    baseline = input.sqft * input.areaMedianPricePerSqft;
    dataPoints++;
  }

  let multiplier = 1.0;

  // Bed/bath premium: compare to area median (assume ~3 beds as norm)
  if (input.beds != null && category !== "land") {
    const bedDiff = input.beds - 3; // 3 as assumed area median
    multiplier += bedDiff * 0.04; // 4% per bed above/below norm
    dataPoints++;
  }
  if (input.baths != null && category !== "land") {
    const bathDiff = input.baths - 2; // 2 as assumed area median
    multiplier += bathDiff * 0.025;
    dataPoints++;
  }

  // Age premium: newer properties command premium
  if (input.yearBuilt && category !== "land") {
    const age = new Date().getFullYear() - input.yearBuilt;
    const weights = FEATURE_WEIGHTS[category];
    // Newer than 10 years: premium. Older: discount. Scaled by property type.
    if (age <= 5) multiplier += 0.05;
    else if (age <= 10) multiplier += 0.02;
    else if (age > 30) multiplier -= age * weights.age;
    dataPoints++;
  }

  // Condition adjustment (from NLP)
  if (input.conditionScore != null && category !== "land") {
    // C1=1 (luxury/new) to C6=6 (poor). C3 is average (no adjustment).
    const condDiff = 3 - input.conditionScore; // positive = better than average
    multiplier += condDiff * FEATURE_WEIGHTS[category].condition;
    dataPoints++;
  }

  // Location quality multipliers
  if (input.schoolQualityScore != null) {
    // 0-100 score. 50 = average. Premium/discount scales +-5%
    multiplier += (input.schoolQualityScore - 50) / 50 * 0.05;
    dataPoints++;
  }
  if (input.crimeIndex != null) {
    // 100 = national average. Below 100 = safer = premium
    if (input.crimeIndex < 80) multiplier += 0.03;
    else if (input.crimeIndex > 150) multiplier -= 0.04;
    else if (input.crimeIndex > 120) multiplier -= 0.02;
    dataPoints++;
  }

  // Stories/floor premium for condos
  if (input.stories && input.stories > 10 && category === "condo") {
    multiplier += 0.03; // High-rise premium
    dataPoints++;
  }

  const hedonicValue = Math.round(baseline * Math.max(0.5, multiplier));

  return {
    name: "hedonic",
    value: hedonicValue,
    weight: BASE_PILLAR_WEIGHTS.hedonic,
    dataPoints,
    details: `Area $/sqft ($${input.areaMedianPricePerSqft}) x ${input.sqft} sqft, ${dataPoints} attribute adjustments`,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PILLAR 2: Repeat-Sales Index Model
// Projects current value from property's own transaction history
// using area HPI trend for temporal normalization
// ═══════════════════════════════════════════════════════════════════

function computeRepeatSalesValue(input: GenieAvmInput): PillarResult | null {
  if (!input.salesHistory || input.salesHistory.length === 0) return null;

  // Sort by date descending, filter to sales with valid prices
  const sales = input.salesHistory
    .filter((s) => s.price > 0 && s.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (sales.length === 0) return null;

  const now = Date.now();
  const lastSale = sales[0];
  const lastSaleDate = new Date(lastSale.date);
  const yearsAgo = (now - lastSaleDate.getTime()) / (365.25 * 86400000);

  // Ignore sales older than 10 years - too stale for reliable projection
  if (yearsAgo > 10) return null;

  // Get annual appreciation rate
  let annualAppreciation: number;
  const hpiTrend = getAnnualHpiTrend(input.areaHPI);

  if (sales.length >= 2) {
    // Calculate property-level CAGR from multiple sales
    const oldestUsable = sales.find((s) => {
      const age = (now - new Date(s.date).getTime()) / (365.25 * 86400000);
      return age <= 10 && s.price !== lastSale.price;
    });
    if (oldestUsable) {
      const span = (lastSaleDate.getTime() - new Date(oldestUsable.date).getTime()) / (365.25 * 86400000);
      if (span > 0.5) {
        const propertyCagr = Math.pow(lastSale.price / oldestUsable.price, 1 / span) - 1;
        // Use the more conservative of property CAGR or area HPI
        // This prevents projecting outlier appreciation forward
        annualAppreciation = hpiTrend != null
          ? Math.min(propertyCagr, hpiTrend * 1.2) // allow 20% above area trend max
          : Math.min(propertyCagr, 0.06); // cap at 6% if no HPI
      } else {
        annualAppreciation = hpiTrend ?? 0.03;
      }
    } else {
      annualAppreciation = hpiTrend ?? 0.03;
    }
  } else {
    // Single sale - use area HPI trend
    annualAppreciation = hpiTrend ?? 0.03;
  }

  // Cap appreciation at reasonable bounds
  annualAppreciation = Math.max(-0.10, Math.min(0.10, annualAppreciation));

  // Project forward
  const projectedValue = Math.round(lastSale.price * Math.pow(1 + annualAppreciation, yearsAgo));

  // Weight decays with age of last sale
  let weight = BASE_PILLAR_WEIGHTS.repeatSales;
  if (yearsAgo > 7) weight *= 0.5;
  else if (yearsAgo > 5) weight *= 0.7;
  else if (yearsAgo > 3) weight *= 0.85;

  return {
    name: "repeatSales",
    value: projectedValue,
    weight,
    dataPoints: sales.length,
    details: `Last sale $${lastSale.price.toLocaleString()} (${lastSale.date.slice(0, 10)}) projected at ${(annualAppreciation * 100).toFixed(1)}%/yr for ${yearsAgo.toFixed(1)} years`,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PILLAR 3: CMA (Comparable Market Analysis)
// Spatially and temporally weighted comp adjustments
// ═══════════════════════════════════════════════════════════════════

function computeCmaValue(
  input: GenieAvmInput,
  category: PropertyCategory,
): { pillar: PillarResult; comps: AdjustedComp[] } | null {
  const comps = input.mlsComps || [];
  if (comps.length === 0) return null;

  const weights = FEATURE_WEIGHTS[category];
  const subjectSqft = input.sqft || 0;
  const subjectBeds = input.beds || 0;
  const subjectBaths = input.baths || 0;
  const subjectYearBuilt = input.yearBuilt || 0;
  const subjectLotSize = input.lotSize || 0;
  const subjectSubdivision = input.subdivision?.toLowerCase().trim();
  const subjectCondition = input.conditionScore ?? 3; // default to average
  const hpiTrend = getAnnualHpiTrend(input.areaHPI);

  const now = Date.now();
  const adjusted: AdjustedComp[] = [];

  for (const comp of comps) {
    if (comp.closePrice <= 0) continue;

    // ── Temporal normalization: HPI-adjust comp price to today ──
    let hpiAdjustedPrice = comp.closePrice;
    let temporalAdj = 0;
    const closeMs = new Date(comp.closeDate).getTime();
    const monthsAgo = Math.max(0, (now - closeMs) / (30.44 * 86400000));

    if (hpiTrend != null && monthsAgo > 1) {
      const yearsAgo = monthsAgo / 12;
      hpiAdjustedPrice = Math.round(comp.closePrice * Math.pow(1 + hpiTrend, yearsAgo));
      temporalAdj = hpiAdjustedPrice - comp.closePrice;
    }

    // ── Property-type-aware adjustments (percentage-based) ──
    const sqftAdj = (category !== "land" && subjectSqft && comp.sqft && comp.sqft > 0)
      ? Math.round(((subjectSqft - comp.sqft) / comp.sqft) * hpiAdjustedPrice * weights.sqft)
      : (category === "land" && subjectLotSize && comp.lotSize && comp.lotSize > 0)
        ? Math.round(((subjectLotSize - comp.lotSize) / comp.lotSize) * hpiAdjustedPrice * 0.75)
        : 0;

    const bedsAdj = (subjectBeds && comp.beds && weights.beds > 0)
      ? Math.round((subjectBeds - comp.beds) * hpiAdjustedPrice * weights.beds)
      : 0;

    const bathsAdj = (subjectBaths && comp.baths && weights.baths > 0)
      ? Math.round((subjectBaths - comp.baths) * hpiAdjustedPrice * weights.baths)
      : 0;

    const ageAdj = (subjectYearBuilt && comp.yearBuilt && weights.age > 0)
      ? Math.round((comp.yearBuilt - subjectYearBuilt) * hpiAdjustedPrice * weights.age)
      : 0;

    const lotAdj = (category !== "condo" && subjectLotSize && comp.lotSize && weights.lot > 0)
      ? Math.round((subjectLotSize - comp.lotSize) * weights.lot)
      : 0;

    // Condition adjustment
    const compCondition = comp.conditionScore ?? 3;
    const condAdj = (weights.condition > 0)
      ? Math.round((subjectCondition - compCondition) * hpiAdjustedPrice * weights.condition)
      : 0;

    const totalAdj = sqftAdj + bedsAdj + bathsAdj + ageAdj + lotAdj + condAdj + temporalAdj;
    const adjustedPrice = comp.closePrice + totalAdj;

    // ── Spatial weight: exponential distance decay ──
    const distance = comp.distance ?? 1.0; // default 1 mile if unknown
    const bandwidth = category === "condo" ? 0.5 : 2.0; // condos: tighter spatial kernel
    const spatialWeight = Math.exp(-distance / bandwidth);

    // ── Temporal weight: exponential recency decay ──
    const temporalWeight = Math.exp(-monthsAgo / 6); // half-life ~4 months

    // ── Building/subdivision match bonus ──
    const compSubdivision = comp.subdivision?.toLowerCase().trim();
    const isBuildingMatch = !!(subjectSubdivision && compSubdivision &&
      (subjectSubdivision === compSubdivision || compSubdivision.includes(subjectSubdivision) || subjectSubdivision.includes(compSubdivision)));
    const buildingBonus = isBuildingMatch ? weights.buildingMatch : 1.0;

    // ── Correlation weight ──
    const correlationWeight = comp.correlation || 0.7;

    const weight = spatialWeight * temporalWeight * buildingBonus * correlationWeight;

    adjusted.push({
      ...comp,
      adjustedPrice,
      hpiAdjustedClosePrice: hpiAdjustedPrice,
      adjustments: {
        sqft: sqftAdj,
        beds: bedsAdj,
        baths: bathsAdj,
        lot: lotAdj,
        age: ageAdj,
        condition: condAdj,
        temporal: temporalAdj,
        total: totalAdj,
      },
      weight,
      isBuildingMatch,
      recencyMonths: Math.round(monthsAgo * 10) / 10,
      spatialWeight: Math.round(spatialWeight * 1000) / 1000,
      temporalWeight: Math.round(temporalWeight * 1000) / 1000,
    });
  }

  if (adjusted.length === 0) return null;

  // Sort by weight descending, keep top 10
  const topComps = adjusted.sort((a, b) => b.weight - a.weight).slice(0, 10);

  // Weighted average of adjusted prices
  const totalW = topComps.reduce((s, c) => s + c.weight, 0);
  const cmaValue = Math.round(topComps.reduce((s, c) => s + c.adjustedPrice * c.weight, 0) / totalW);

  return {
    pillar: {
      name: "cma",
      value: cmaValue,
      weight: BASE_PILLAR_WEIGHTS.cma,
      dataPoints: topComps.length,
      details: `Weighted average of ${topComps.length} comps (${topComps.filter((c) => c.isBuildingMatch).length} same-building)`,
    },
    comps: topComps,
  };
}

// ═══════════════════════════════════════════════════════════════════
// DYNAMIC ENSEMBLE WEIGHTING
// Adjusts pillar weights based on data quality signals
// ═══════════════════════════════════════════════════════════════════

function assignDynamicWeights(pillars: PillarResult[], comps: AdjustedComp[]): void {
  // Boost CMA weight if we have strong comp data
  const cma = pillars.find((p) => p.name === "cma");
  if (cma) {
    const buildingComps = comps.filter((c) => c.isBuildingMatch).length;
    if (buildingComps >= 3) cma.weight *= 1.3; // strong same-building data
    else if (cma.dataPoints >= 5) cma.weight *= 1.1;
    else if (cma.dataPoints <= 2) cma.weight *= 0.7; // few comps = less reliable
  }

  // Boost repeat-sales if recent sale
  const rs = pillars.find((p) => p.name === "repeatSales");
  if (rs && rs.dataPoints >= 2) {
    rs.weight *= 1.2; // multiple transactions = strong signal
  }

  // Boost hedonic when comps are weak
  const hedonic = pillars.find((p) => p.name === "hedonic");
  if (hedonic && !cma) {
    hedonic.weight *= 1.5; // no comps: hedonic becomes more important
  }
  if (hedonic && cma && cma.dataPoints <= 2) {
    hedonic.weight *= 1.2; // weak comps: lean on hedonic more
  }

  // Agreement bonus: if two pillars agree within 10%, boost both
  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const ratio = pillars[i].value / pillars[j].value;
      if (ratio >= 0.90 && ratio <= 1.10) {
        pillars[i].weight *= 1.1;
        pillars[j].weight *= 1.1;
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// CONFIDENCE & FSD CALCULATION
// ═══════════════════════════════════════════════════════════════════

function computeConfidenceAndFsd(
  estimate: number,
  pillars: PillarResult[],
  comps: AdjustedComp[],
  input: GenieAvmInput,
): {
  confidenceScore: number;
  fsd: number;
  low: number;
  high: number;
  confidence: "High" | "Medium" | "Low" | "Very Low";
  escalationNeeded: boolean;
} {
  if (estimate <= 0) {
    return { confidenceScore: 1, fsd: 0.40, low: 0, high: 0, confidence: "Very Low", escalationNeeded: true };
  }

  // FSD from pillar agreement (variance-based)
  const pillarValues = pillars.map((p) => p.value);
  let fsd: number;
  if (pillarValues.length >= 2) {
    const mean = pillarValues.reduce((a, b) => a + b, 0) / pillarValues.length;
    const variance = pillarValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / pillarValues.length;
    fsd = Math.sqrt(variance) / mean;
  } else {
    // Single pillar: use wider default based on data quality
    fsd = comps.length >= 5 ? 0.15 : comps.length >= 3 ? 0.20 : 0.30;
  }

  // Tighten FSD with more data
  if (comps.length >= 5) fsd *= 0.85;
  const buildingComps = comps.filter((c) => c.isBuildingMatch).length;
  if (buildingComps >= 3) fsd *= 0.80;
  const recentComps = comps.filter((c) => c.recencyMonths < 3).length;
  if (recentComps >= 3) fsd *= 0.90;
  if (input.salesHistory && input.salesHistory.length >= 2) fsd *= 0.85;

  // Widen FSD for sparse data
  if (comps.length === 0) fsd *= 1.3;
  if (!input.salesHistory?.length) fsd *= 1.1;

  // Clamp FSD to reasonable bounds (0.05 to 0.40)
  fsd = Math.max(0.05, Math.min(0.40, fsd));
  fsd = Math.round(fsd * 1000) / 1000;

  // ── Confidence Score (1-100) ──
  let score = 50; // start at midpoint

  // Comp quality signals
  if (comps.length >= 5) score += 15;
  else if (comps.length >= 3) score += 8;
  else if (comps.length === 0) score -= 20;

  if (buildingComps >= 3) score += 15;
  else if (buildingComps >= 1) score += 5;

  // Sales history signals
  if (input.salesHistory && input.salesHistory.length >= 2) score += 15;
  else if (input.salesHistory && input.salesHistory.length === 1) score += 8;
  else score -= 10;

  // Pillar agreement
  if (pillarValues.length >= 2) {
    const maxRatio = Math.max(...pillarValues) / Math.min(...pillarValues);
    if (maxRatio <= 1.10) score += 15; // strong agreement
    else if (maxRatio <= 1.20) score += 5;
    else if (maxRatio > 1.30) score -= 15; // big disagreement
  }

  // Recent comps bonus
  if (recentComps >= 3) score += 5;

  // Complete property attributes
  if (input.sqft && input.beds && input.baths && input.yearBuilt) score += 5;

  // Area market data
  if (input.areaMedianPricePerSqft) score += 3;
  if (input.areaHPI?.length) score += 2;

  // Penalties
  if (input.ownershipType?.toLowerCase() === "leasehold") score -= 3;

  // Clamp to 1-100
  score = Math.max(1, Math.min(100, Math.round(score)));

  // Map to confidence label
  const confidence: "High" | "Medium" | "Low" | "Very Low" =
    score >= 75 ? "High" : score >= 50 ? "Medium" : score >= 25 ? "Low" : "Very Low";

  // Range from FSD
  const low = Math.round(estimate * (1 - fsd));
  const high = Math.round(estimate * (1 + fsd));

  // Escalation flag
  const escalationNeeded = fsd > 0.20 || score < 30;

  return { confidenceScore: score, fsd, low, high, confidence, escalationNeeded };
}

// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function computeAssessmentTrend(history: { year: number; value: number }[]): number {
  if (history.length < 2) return 0;
  const sorted = [...history].sort((a, b) => a.year - b.year);
  const recent = sorted.slice(-3);
  if (recent.length < 2) return 0;

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

function getAnnualHpiTrend(areaHPI?: { period: string; hpi: number }[]): number | null {
  if (!areaHPI || areaHPI.length < 2) return null;
  const sorted = [...areaHPI].sort((a, b) => a.period.localeCompare(b.period));
  // Use last 4 quarters (1 year) if available
  const recent = sorted.slice(-4);
  if (recent.length < 2) return null;

  const first = recent[0];
  const last = recent[recent.length - 1];
  if (first.hpi <= 0) return null;

  // Calculate annual rate from quarterly data
  const quarters = recent.length - 1;
  const totalChange = (last.hpi - first.hpi) / first.hpi;
  const annualized = Math.pow(1 + totalChange, 4 / quarters) - 1;

  return Math.max(-0.15, Math.min(0.15, annualized));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
