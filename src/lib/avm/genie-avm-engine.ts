/**
 * Genie AVM Engine
 *
 * Proprietary Automated Valuation Model. Builds a value entirely from our
 * own analysis of:
 *   1. MLS Closed Comps (primary, dynamically weighted by match quality)
 *   2. List Price (when on-market) — strong on-market signal
 *   3. Time-Adjusted Last Sale (appreciation-projected anchor)
 *   4. Trend-Adjusted County Assessment (secondary)
 *   5. Area Median $/sqft (sanity floor — pulls value toward market median
 *      when ensemble diverges 25%+)
 *
 * No third-party AVM is used as a source. Comps may originate from MLS
 * (preferred) or from a public-records / rental data provider as a
 * fallback for off-market properties — they enter the engine identically.
 *
 * Property-type matching is enforced inside the engine: condo/townhouse
 * subjects only weight condo/townhouse comps, single-family subjects only
 * weight single-family comps. Comps that don't match are filtered out.
 *
 * Hawaii-specific adjustments (leasehold discount, flood zone discount,
 * high HOA penalty) apply on top of the ensemble.
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

  // Property features (used for feature-level comp adjustments)
  pool?: boolean;
  garage?: boolean;
  garageSqft?: number;
  garageType?: string; // "Garage" | "Carport" | null
  condition?: string; // "Excellent" | "Good" | "Average" | "Fair" | "Poor"
  construction?: string; // "Frame" | "Masonry" | "Concrete" | "Adobe"
  deckArea?: number;
  patioArea?: number;
  porchArea?: number;
  fireplace?: boolean;
  stories?: number;

  // Hawaii-specific
  ownershipType?: string; // "Fee Simple" | "Leasehold"
  leaseExpiration?: string; // ISO date
  subdivision?: string;
  hoaFee?: number; // Monthly

  // County assessment (most recent year)
  assessment?: { value: number; year: number; land: number; improvements: number } | null;
  assessmentHistory?: { year: number; value: number }[];

  // Closed comps. Engine doesn't care if these came from MLS or a
  // public-records / rental provider — it filters by property type and
  // weights by correlation/recency. Caller resolves the source.
  mlsComps?: MlsComp[];

  // Last arm's-length sale (used to compute time-adjusted sale value)
  lastSalePrice?: number;
  lastSaleDate?: string; // ISO date

  // On-market listing price (strong signal when available)
  listPrice?: number;
  // List-to-sale ratio for this area (e.g., 0.97 means homes sell at 97% of list)
  listToSaleRatio?: number;

  // Annual appreciation rate for this area (e.g., 0.035 = 3.5%/yr)
  // Falls back to DEFAULT_APPRECIATION_RATE if not provided
  appreciationRate?: number;

  // Area median $/sqft for the matching property type. Used as a sanity
  // anchor — when ensemble diverges 25%+ from sqft × area median, the
  // ensemble blends toward the median to prevent extreme outliers.
  marketStats?: {
    medianPricePerSqft?: number; // overall fallback
    medianPricePerSqftSfr?: number; // single-family
    medianPricePerSqftCondo?: number; // condo / townhouse
  };

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
  // Property-type fields used for like-for-like filtering. Engine accepts
  // either MLS-style propertyType+propertySubType or a single propType
  // string from public records.
  propertyType?: string;
  propertySubType?: string;
  propType?: string;
  // Property features (when available)
  pool?: boolean;
  garage?: boolean;
  garageSqft?: number;
  garageType?: string;
  condition?: string;
  construction?: string;
  deckArea?: number;
  patioArea?: number;
  porchArea?: number;
  fireplace?: boolean;
  stories?: number;
}

export interface AdjustedComp extends MlsComp {
  adjustedPrice: number;
  adjustments: {
    sqft: number;
    beds: number;
    baths: number;
    lot: number;
    age: number;
    features: number;
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
    listPriceValue: number | null;
    lastSaleAppreciated: number | null;
    lastSaleYearsAgo: number | null;
    assessmentValue: number | null;
    trendAdjustedAssessment: number | null;
    assessmentTrendPct: number | null;
    medianPricePerSqftEstimate: number | null;
    medianPricePerSqftBlendApplied: boolean;
    compsUsed: number;
    compsFromSubdivision: number;
    compsFilteredByType: number;
    leaseholdAdjustment: number | null;
    hazardAdjustment: number | null;
    hoaAdjustment: number | null;
    weights: Record<string, number>;
  };
  comps: AdjustedComp[];
}

// ── Adjustment Constants (Hawaii market) ──
// These are percentage-based relative to comp price, not flat dollar amounts.
// Hawaii's high price points make flat adjustments meaningless ($10K on a $2M home = 0.5%).

const ADJUSTMENT_PCT_PER_BED = 0.05; // 5% per bedroom difference
const ADJUSTMENT_PCT_PER_BATH = 0.03; // 3% per bathroom difference
const ADJUSTMENT_PCT_PER_YEAR_AGE = 0.005; // 0.5% per year age difference
const ADJUSTMENT_PCT_SQFT = 0.75; // 75% of proportional sqft difference
const ADJUSTMENT_PER_SQFT_LOT = 10; // $/sqft for lot size difference (SFR only)

// For condos, sqft matters more and bed/bath matters less
const CONDO_ADJUSTMENT_PCT_SQFT = 0.85; // 85% for condos (increased)
const CONDO_BED_BATH_DISCOUNT = 0.6; // Reduce bed/bath adjustments by 40% for condos

// Feature-based adjustments. Applied when subject and comp differ on a
// feature. Capped at 10% total.
const ADJUSTMENT_PCT_POOL = 0.04; // 4% for pool (significant in Hawaii)
const ADJUSTMENT_PCT_GARAGE = 0.025; // 2.5% for garage vs none
const ADJUSTMENT_PCT_CARPORT = 0.01; // 1% for carport vs none
const ADJUSTMENT_PCT_FIREPLACE = 0.01; // 1% for fireplace
const ADJUSTMENT_PCT_OUTDOOR_SPACE = 0.02; // 2% for significant outdoor living (deck+patio+porch > 200sqft)
const ADJUSTMENT_PCT_CONDITION: Record<string, number> = {
  Excellent: 0.06,
  Good: 0.03,
  Average: 0,
  Fair: -0.03,
  Poor: -0.06,
};
const MAX_FEATURE_ADJUSTMENT_PCT = 0.1; // Cap total feature adjustments at 10%

// Annual appreciation rate defaults (Oahu 40-year historical averages)
const DEFAULT_APPRECIATION_RATE_SFR = 0.05; // 5%/yr for single-family
const DEFAULT_APPRECIATION_RATE_CONDO = 0.04; // 4%/yr for condos

// Comp quality thresholds
const MIN_CORRELATION = 0.35; // Exclude comps below 35% match
const MAX_ADJUSTMENT_PCT = 0.35; // Exclude comps needing >35% total adjustment
const OUTLIER_THRESHOLD = 0.5; // Exclude comps >50% from median adjusted price

// Median $/sqft sanity blend
const MEDIAN_PSF_DIVERGENCE_THRESHOLD = 0.25; // 25%+ off triggers a pull
const MEDIAN_PSF_BLEND_WEIGHT = 0.35; // Pull 35% toward median when triggered

// ── Property Type Detection ──

type PropertyClass = "condo" | "sfr" | "land" | "multifamily" | "other";

function classifyPropertyType(propertyType?: string, propertySubType?: string, propType?: string): PropertyClass {
  const sub = (propertySubType || "").toLowerCase();
  const top = (propertyType || "").toLowerCase();
  const compact = (propType || "").toLowerCase();

  if (
    sub.includes("condo") ||
    sub.includes("townhouse") ||
    sub.includes("apartment") ||
    compact.includes("condo") ||
    compact.includes("townhouse") ||
    compact.includes("apartment")
  ) {
    return "condo";
  }
  if (
    sub.includes("single") ||
    compact.includes("sfr") ||
    compact.includes("single") ||
    (top === "residential" && !sub) ||
    compact === "residential"
  ) {
    return "sfr";
  }
  if (top === "land" || compact === "land") return "land";
  if (top === "multi-family" || compact.includes("multi")) return "multifamily";
  return "other";
}

// ── Pre-Flight Input Validation ──
// Cross-checks all AVM inputs against each other BEFORE computing the ensemble.
// Identifies and discards bad data (building-level sales, wrong property type, etc.)

interface ValidatedInputs {
  lastSaleAppreciated: number | null;
  lastSaleYearsAgo: number | null;
  listPriceValue: number | null;
  trendAdjustedAssessment: number | null;
  assessmentTrendPct: number | null;
  isBuildingData: boolean;
  discarded: string[];
}

function validateAvmInputs(input: GenieAvmInput): ValidatedInputs {
  const discarded: string[] = [];
  const subjectClass = classifyPropertyType(input.propertyType, input.propertySubType);
  const isCondo = subjectClass === "condo";
  const isSFR = subjectClass === "sfr";

  // ── List Price ──
  const rawListPrice = input.listPrice && input.listPrice > 0 ? input.listPrice : null;
  const listPriceValue =
    rawListPrice && input.listToSaleRatio ? Math.round(rawListPrice * input.listToSaleRatio) : rawListPrice;

  // ── Assessment ──
  let trendAdjustedAssessment: number | null = null;
  let assessmentTrendPct: number | null = null;
  if (input.assessment?.value) {
    const trend = computeAssessmentTrend(input.assessmentHistory || []);
    assessmentTrendPct = trend;
    trendAdjustedAssessment = Math.round(input.assessment.value * (1 + trend));
  }

  // ── Building vs Unit Detection (condos) ──
  // If MLS says condo but the rest of the data has huge sqft, lot, or wrong
  // type, we're looking at building-level data.
  let isBuildingData = false;
  if (isCondo && input.sqft) {
    if (input.sqft > 4000) {
      isBuildingData = true;
      discarded.push(`Sqft ${input.sqft} too large for condo unit - likely building data`);
    }
  }
  if (isCondo && input.lotSize && input.lotSize > 10000) {
    isBuildingData = true;
    discarded.push(`Lot size ${input.lotSize.toLocaleString()} sqft too large for condo unit - building parcel data`);
  }
  if (isCondo && (subjectClass !== "condo" || (input.propertyType || "").toLowerCase() === "land")) {
    // already handled above by classifyPropertyType — kept for clarity
  }

  // ── Last Sale Validation ──
  let lastSaleAppreciated: number | null = null;
  let lastSaleYearsAgo: number | null = null;

  if (input.lastSalePrice && input.lastSalePrice > 1000 && input.lastSaleDate) {
    let saleIsReasonable = true;

    // Sale < 1% of list price = not arm's-length (transfers, gifts, etc.)
    if (listPriceValue && input.lastSalePrice < listPriceValue * 0.01) {
      saleIsReasonable = false;
      discarded.push(
        `Last sale $${input.lastSalePrice.toLocaleString()} < 1% of list $${listPriceValue.toLocaleString()} - not arm's-length`,
      );
    }

    // Price-per-sqft sanity
    if (input.sqft && input.sqft > 0) {
      const salePricePerSqft = input.lastSalePrice / input.sqft;
      const maxPsf = isCondo ? 2000 : isSFR ? 3000 : 5000;
      if (salePricePerSqft > maxPsf) {
        saleIsReasonable = false;
        discarded.push(
          `Last sale $${input.lastSalePrice.toLocaleString()} = $${Math.round(salePricePerSqft)}/sqft exceeds ${maxPsf} max`,
        );
      }
    }

    // Sale vs list price (>150% = likely building sale)
    if (listPriceValue && input.lastSalePrice > listPriceValue * 1.5) {
      saleIsReasonable = false;
      discarded.push(
        `Last sale $${input.lastSalePrice.toLocaleString()} > 150% of list $${listPriceValue.toLocaleString()}`,
      );
    }

    // Sale vs assessment (>300% = likely building sale)
    if (trendAdjustedAssessment && input.lastSalePrice > trendAdjustedAssessment * 3) {
      saleIsReasonable = false;
      discarded.push(
        `Last sale $${input.lastSalePrice.toLocaleString()} > 300% of assessment $${trendAdjustedAssessment.toLocaleString()}`,
      );
    }

    // Building data detected = discard sale
    if (isBuildingData) {
      saleIsReasonable = false;
      discarded.push("Last sale discarded - building-level data detected");
    }

    const saleDate = new Date(input.lastSaleDate);
    const yearsAgo = (Date.now() - saleDate.getTime()) / (365.25 * 86400000);
    lastSaleYearsAgo = Math.round(yearsAgo * 10) / 10;

    if (yearsAgo > 0.25 && yearsAgo <= 30 && saleIsReasonable) {
      const defaultRate = isCondo ? DEFAULT_APPRECIATION_RATE_CONDO : DEFAULT_APPRECIATION_RATE_SFR;
      const rate = input.appreciationRate ?? defaultRate;
      lastSaleAppreciated = Math.round(input.lastSalePrice * Math.pow(1 + rate, yearsAgo));
    }
  }

  if (discarded.length > 0) {
    console.log(`[GenieAVM] Pre-flight: ${discarded.join("; ")}`);
  }

  return {
    lastSaleAppreciated,
    lastSaleYearsAgo,
    listPriceValue,
    trendAdjustedAssessment,
    assessmentTrendPct,
    isBuildingData,
    discarded,
  };
}

// ── Engine ──

export function computeGenieAvm(input: GenieAvmInput): GenieAvmResult | null {
  const sources: { name: string; value: number; weight: number }[] = [];

  // ── Pre-flight validation: cross-check all inputs ──
  const validated = validateAvmInputs(input);
  const { listPriceValue, trendAdjustedAssessment, assessmentTrendPct, lastSaleAppreciated, lastSaleYearsAgo } =
    validated;

  // Subject property classification — used for comp filtering and median $/sqft selection.
  const subjectClass = classifyPropertyType(input.propertyType, input.propertySubType);

  // 1. Comp-based value (filtered by property type)
  let compBasedValue: number | null = null;
  let adjustedComps: AdjustedComp[] = [];
  let compsFilteredByType = 0;

  if (input.mlsComps && input.mlsComps.length > 0) {
    const result = adjustAndWeightComps(input, subjectClass);
    adjustedComps = result.comps;
    compsFilteredByType = result.filteredByType;

    if (adjustedComps.length > 0) {
      const totalWeight = adjustedComps.reduce((s, c) => s + c.weight, 0);
      compBasedValue = Math.round(
        adjustedComps.reduce((s, c) => s + c.adjustedPrice * c.weight, 0) / totalWeight,
      );
    }
  }

  // ── Dynamic Weight Assignment ──
  // Comp weight scales by average match quality (correlation). High-quality
  // comps (75%+ avg) get full weight. Poor comps (35-54%) get heavily
  // discounted. Freed weight goes to list price (when on-market) and assessment.
  const isOnMarket = !!listPriceValue;

  if (compBasedValue) {
    const compsWithCorrelation = adjustedComps.filter((c) => c.correlation != null);
    const avgCorrelation =
      compsWithCorrelation.length > 0
        ? compsWithCorrelation.reduce((s, c) => s + (c.correlation || 0), 0) / compsWithCorrelation.length
        : 0.5;

    let qualityMultiplier: number;
    if (avgCorrelation >= 0.75) qualityMultiplier = 1.0;
    else if (avgCorrelation >= 0.55) qualityMultiplier = 0.65;
    else qualityMultiplier = 0.35;

    if (adjustedComps.length < 3) qualityMultiplier *= 0.7;
    else if (adjustedComps.length < 5) qualityMultiplier *= 0.85;

    // Base weights (sum to 1.0)
    let baseCompWeight: number;
    let listPriceWeight: number;
    let assessmentWeight: number;

    if (isOnMarket) {
      baseCompWeight = 0.55;
      listPriceWeight = 0.3;
      assessmentWeight = 0.15;
    } else {
      baseCompWeight = 0.7;
      listPriceWeight = 0;
      assessmentWeight = 0.3;
    }

    let compWeight = baseCompWeight * qualityMultiplier;
    const freedWeight = baseCompWeight - compWeight;

    if (isOnMarket) {
      listPriceWeight += freedWeight * 0.65;
      assessmentWeight += freedWeight * 0.35;
    } else {
      assessmentWeight += freedWeight;
    }

    sources.push({ name: "mlsComps", value: compBasedValue, weight: compWeight });

    if (listPriceValue && listPriceWeight > 0) {
      sources.push({ name: "listPrice", value: listPriceValue, weight: listPriceWeight });
    }

    if (trendAdjustedAssessment) {
      sources.push({ name: "assessment", value: trendAdjustedAssessment, weight: assessmentWeight });
    }
  } else if (listPriceValue) {
    // No comps but on-market — list price is dominant, assessment supports.
    sources.push({ name: "listPrice", value: listPriceValue, weight: 0.7 });
    if (trendAdjustedAssessment) {
      sources.push({ name: "assessment", value: trendAdjustedAssessment, weight: 0.3 });
    }
  } else if (trendAdjustedAssessment) {
    // Only assessment available
    sources.push({ name: "assessment", value: trendAdjustedAssessment, weight: 1.0 });
  }

  // Add time-adjusted last sale as a source (weight varies by recency).
  // An actual sale appreciated at market rate is a strong anchor.
  if (lastSaleAppreciated && lastSaleYearsAgo) {
    let saleWeight: number;
    if (lastSaleYearsAgo <= 2) saleWeight = 0.3;
    else if (lastSaleYearsAgo <= 5) saleWeight = 0.25;
    else if (lastSaleYearsAgo <= 10) saleWeight = 0.2;
    else if (lastSaleYearsAgo <= 20) saleWeight = 0.15;
    else saleWeight = 0.1;
    sources.push({ name: "lastSaleAppreciated", value: lastSaleAppreciated, weight: saleWeight });
  }

  // Remove zero-value sources
  const validSources = sources.filter((s) => s.value > 0);
  if (validSources.length === 0) return null;

  // Normalize weights to sum to 1.0
  const totalWeight = validSources.reduce((s, src) => s + src.weight, 0);
  for (const src of validSources) src.weight = src.weight / totalWeight;

  // Weighted ensemble value
  let ensembleValue = Math.round(validSources.reduce((s, src) => s + src.value * src.weight, 0));

  // Floor: AVM should not fall below the time-adjusted last sale.
  // Markets generally appreciate, so a valuation below what someone paid
  // (adjusted for time) suggests bad data somewhere upstream.
  if (lastSaleAppreciated && lastSaleYearsAgo && ensembleValue < lastSaleAppreciated) {
    let floorWeight: number;
    if (lastSaleYearsAgo <= 3) floorWeight = 0.65;
    else if (lastSaleYearsAgo <= 5) floorWeight = 0.55;
    else if (lastSaleYearsAgo <= 10) floorWeight = 0.45;
    else floorWeight = 0.35;
    ensembleValue = Math.round(ensembleValue * (1 - floorWeight) + lastSaleAppreciated * floorWeight);
  }

  // ── Median $/sqft Sanity Blend ──
  // Pulls the ensemble toward sqft × area median when the two diverge by
  // 25%+. Prevents extreme outliers caused by sparse comps or stale assessments.
  let medianPricePerSqftEstimate: number | null = null;
  let medianPricePerSqftBlendApplied = false;

  if (input.sqft && input.sqft > 0 && input.marketStats) {
    const median =
      subjectClass === "condo"
        ? input.marketStats.medianPricePerSqftCondo
        : subjectClass === "sfr"
          ? input.marketStats.medianPricePerSqftSfr
          : null;
    const fallback = input.marketStats.medianPricePerSqft;
    const psf = median || fallback;

    if (psf && psf > 0) {
      medianPricePerSqftEstimate = Math.round(input.sqft * psf);
      const divergence = Math.abs(ensembleValue - medianPricePerSqftEstimate) / medianPricePerSqftEstimate;

      if (divergence > MEDIAN_PSF_DIVERGENCE_THRESHOLD) {
        medianPricePerSqftBlendApplied = true;
        ensembleValue = Math.round(
          ensembleValue * (1 - MEDIAN_PSF_BLEND_WEIGHT) + medianPricePerSqftEstimate * MEDIAN_PSF_BLEND_WEIGHT,
        );
        console.log(
          `[GenieAVM] Median $/sqft blend applied: divergence ${(divergence * 100).toFixed(1)}%, pulled toward $${medianPricePerSqftEstimate.toLocaleString()}`,
        );
      }
    }
  }

  // ── Hawaii-Specific Adjustments ──

  let leaseholdAdj: number | null = null;
  let hazardAdj: number | null = null;
  let hoaAdj: number | null = null;

  // Leasehold discount
  if (input.ownershipType?.toLowerCase() === "leasehold") {
    let discountPct = -0.3;
    if (input.leaseExpiration) {
      const yearsRemaining = (new Date(input.leaseExpiration).getTime() - Date.now()) / (365.25 * 86400000);
      if (yearsRemaining > 50) discountPct = -0.2;
      else if (yearsRemaining > 30) discountPct = -0.25;
      else if (yearsRemaining > 15) discountPct = -0.3;
      else discountPct = -0.35;
    }
    // Skip if comps already reflect leasehold prices (majority leasehold) or
    // if the comp-based value already aligns with list price.
    const leaseholdComps = adjustedComps.filter((c) => c.ownershipType?.toLowerCase() === "leasehold").length;
    const compsReflectLeasehold = adjustedComps.length > 0 && leaseholdComps >= adjustedComps.length * 0.5;
    const compsAlignWithList =
      compBasedValue && listPriceValue && Math.abs(compBasedValue - listPriceValue) / listPriceValue < 0.3;
    if (!compsReflectLeasehold && !compsAlignWithList) {
      leaseholdAdj = discountPct;
      ensembleValue = Math.round(ensembleValue * (1 + discountPct));
    } else {
      console.log(
        `[GenieAVM] Leasehold discount SKIPPED: compsReflect=${compsReflectLeasehold}, compsAlignList=${!!compsAlignWithList}`,
      );
    }
  }

  // Flood zone discount
  if (input.isFloodZone && input.floodZoneCode) {
    const code = input.floodZoneCode.toUpperCase();
    if (code.startsWith("V")) hazardAdj = -0.05; // Coastal high-hazard
    else if (code.startsWith("A")) hazardAdj = -0.03; // 100-year floodplain
    if (hazardAdj) {
      ensembleValue = Math.round(ensembleValue * (1 + hazardAdj));
    }
  }

  // High HOA adjustment
  if (input.hoaFee && input.hoaFee > 800) {
    hoaAdj = -0.02;
    ensembleValue = Math.round(ensembleValue * (1 + hoaAdj));
  }

  // ── Confidence & Range ──

  const { confidence, fsd, low, high } = computeConfidence(ensembleValue, validSources, adjustedComps);

  // Build weights map
  const weights: Record<string, number> = {};
  for (const src of validSources) weights[src.name] = Math.round(src.weight * 100) / 100;

  return {
    value: ensembleValue,
    low,
    high,
    confidence,
    fsd,
    source: "genie",
    methodology: {
      compBasedValue,
      listPriceValue,
      lastSaleAppreciated,
      lastSaleYearsAgo,
      assessmentValue: input.assessment?.value || null,
      trendAdjustedAssessment,
      assessmentTrendPct,
      medianPricePerSqftEstimate,
      medianPricePerSqftBlendApplied,
      compsUsed: adjustedComps.length,
      compsFromSubdivision: adjustedComps.filter((c) => c.isSubdivisionMatch).length,
      compsFilteredByType,
      leaseholdAdjustment: leaseholdAdj,
      hazardAdjustment: hazardAdj,
      hoaAdjustment: hoaAdj,
      weights,
    },
    comps: adjustedComps,
  };
}

// ── Comp Adjustment & Weighting ──

function adjustAndWeightComps(
  input: GenieAvmInput,
  subjectClass: PropertyClass,
): { comps: AdjustedComp[]; filteredByType: number } {
  const comps = input.mlsComps || [];
  const subjectSqft = input.sqft || 0;
  const subjectBeds = input.beds || 0;
  const subjectBaths = input.baths || 0;
  const subjectYearBuilt = input.yearBuilt || 0;
  const subjectLotSize = input.lotSize || 0;
  const subjectSubdivision = input.subdivision?.toLowerCase().trim();
  const isCondo = subjectClass === "condo";
  const isSFR = subjectClass === "sfr";

  const now = Date.now();
  const adjusted: AdjustedComp[] = [];
  let filteredByType = 0;

  for (const comp of comps) {
    if (comp.closePrice <= 0) continue;

    // ── Property-Type Filter ──
    // Like-for-like only: condos use condo comps, SFR uses SFR comps.
    // If the comp has no type info, allow it through (caller pre-filtered).
    const compClass = classifyPropertyType(comp.propertyType, comp.propertySubType, comp.propType);
    if (compClass !== "other" && compClass !== subjectClass) {
      filteredByType++;
      continue;
    }

    // Skip comps with low correlation (not really comparable)
    if (comp.correlation != null && comp.correlation < MIN_CORRELATION) continue;

    // For condos: sqft matters more, bed/bath matters less
    const sqftPct = isCondo ? CONDO_ADJUSTMENT_PCT_SQFT : ADJUSTMENT_PCT_SQFT;
    const bedBathDiscount = isCondo ? CONDO_BED_BATH_DISCOUNT : 1.0;

    const sqftAdj =
      subjectSqft && comp.sqft
        ? Math.round(((subjectSqft - comp.sqft) / comp.sqft) * comp.closePrice * sqftPct)
        : 0;
    const bedsAdj =
      subjectBeds && comp.beds
        ? Math.round((subjectBeds - comp.beds) * comp.closePrice * ADJUSTMENT_PCT_PER_BED * bedBathDiscount)
        : 0;
    const bathsAdj =
      subjectBaths && comp.baths
        ? Math.round((subjectBaths - comp.baths) * comp.closePrice * ADJUSTMENT_PCT_PER_BATH * bedBathDiscount)
        : 0;
    // Age adjustment — reduced for condos (location/floor matters more than age)
    const agePct = isCondo ? ADJUSTMENT_PCT_PER_YEAR_AGE * 0.3 : ADJUSTMENT_PCT_PER_YEAR_AGE;
    const ageAdj =
      subjectYearBuilt && comp.yearBuilt
        ? Math.round((comp.yearBuilt - subjectYearBuilt) * comp.closePrice * agePct)
        : 0;
    const lotAdj = isSFR && subjectLotSize && comp.lotSize ? (subjectLotSize - comp.lotSize) * ADJUSTMENT_PER_SQFT_LOT : 0;

    // Feature-based adjustments
    let featureAdj = 0;

    if (input.pool != null && comp.pool != null && input.pool !== comp.pool) {
      featureAdj += (input.pool ? 1 : -1) * comp.closePrice * ADJUSTMENT_PCT_POOL;
    }

    if (input.garageType && comp.garageType) {
      const subjectHasGarage =
        input.garageType.toLowerCase().includes("garage") && !input.garageType.toLowerCase().includes("carport");
      const compHasGarage =
        comp.garageType.toLowerCase().includes("garage") && !comp.garageType.toLowerCase().includes("carport");
      const subjectHasCarport = input.garageType.toLowerCase().includes("carport");
      const compHasCarport = comp.garageType?.toLowerCase().includes("carport");

      if (subjectHasGarage && !compHasGarage) {
        featureAdj += comp.closePrice * ADJUSTMENT_PCT_GARAGE;
      } else if (!subjectHasGarage && compHasGarage) {
        featureAdj -= comp.closePrice * ADJUSTMENT_PCT_GARAGE;
      } else if (subjectHasCarport && !compHasCarport && !compHasGarage) {
        featureAdj += comp.closePrice * ADJUSTMENT_PCT_CARPORT;
      }
    } else if (input.garage != null && comp.garage != null && input.garage !== comp.garage) {
      featureAdj += (input.garage ? 1 : -1) * comp.closePrice * ADJUSTMENT_PCT_GARAGE;
    }

    if (input.fireplace != null && comp.fireplace != null && input.fireplace !== comp.fireplace) {
      featureAdj += (input.fireplace ? 1 : -1) * comp.closePrice * ADJUSTMENT_PCT_FIREPLACE;
    }

    const subjectOutdoor = (input.deckArea || 0) + (input.patioArea || 0) + (input.porchArea || 0);
    const compOutdoor = (comp.deckArea || 0) + (comp.patioArea || 0) + (comp.porchArea || 0);
    if (subjectOutdoor > 200 && compOutdoor < 100) {
      featureAdj += comp.closePrice * ADJUSTMENT_PCT_OUTDOOR_SPACE;
    } else if (compOutdoor > 200 && subjectOutdoor < 100) {
      featureAdj -= comp.closePrice * ADJUSTMENT_PCT_OUTDOOR_SPACE;
    }

    if (input.condition && comp.condition && input.condition !== comp.condition) {
      const subjectScore = ADJUSTMENT_PCT_CONDITION[input.condition] ?? 0;
      const compScore = ADJUSTMENT_PCT_CONDITION[comp.condition] ?? 0;
      featureAdj += (subjectScore - compScore) * comp.closePrice;
    }

    const featureAdjCapped =
      Math.sign(featureAdj) * Math.min(Math.abs(featureAdj), comp.closePrice * MAX_FEATURE_ADJUSTMENT_PCT);

    const totalAdj = sqftAdj + bedsAdj + bathsAdj + ageAdj + lotAdj + Math.round(featureAdjCapped);

    // Cap total adjustment — if a comp needs >35% adjustment, it's not truly comparable
    const adjPct = Math.abs(totalAdj) / comp.closePrice;
    if (adjPct > MAX_ADJUSTMENT_PCT) continue;

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

    // Correlation weight based on match-quality tiers
    const rawCorrelation = comp.correlation || 0.5;
    let correlationWeight: number;
    if (rawCorrelation >= 0.75) correlationWeight = 0.8;
    else if (rawCorrelation >= 0.55) correlationWeight = 0.5;
    else correlationWeight = 0.25;

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
        features: Math.round(featureAdjCapped),
        total: totalAdj,
      },
      weight,
      isSubdivisionMatch,
      recencyMonths: Math.round(monthsAgo * 10) / 10,
    });
  }

  // Sort by weight descending, keep top 20 for the broadest sample
  let filtered = adjusted.sort((a, b) => b.weight - a.weight).slice(0, 20);

  // Outlier removal: exclude comps whose adjusted price is >50% from median
  if (filtered.length >= 3) {
    const prices = filtered.map((c) => c.adjustedPrice).sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    filtered = filtered.filter((c) => {
      const deviation = Math.abs(c.adjustedPrice - median) / median;
      return deviation <= OUTLIER_THRESHOLD;
    });
  }

  return { comps: filtered, filteredByType };
}

// ── Assessment Trend ──

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

// ── Confidence Scoring ──

function computeConfidence(
  estimate: number,
  sources: { name: string; value: number; weight: number }[],
  comps: AdjustedComp[],
): { confidence: "High" | "Medium" | "Low"; fsd: number; low: number; high: number } {
  const values = sources.map((s) => s.value);
  const maxDiff = values.length > 1 ? Math.max(...values) - Math.min(...values) : estimate * 0.3;
  let fsd = estimate > 0 ? Math.round((maxDiff / (2 * estimate)) * 1000) / 10 : 30;

  if (comps.length >= 5) fsd *= 0.8;
  else if (comps.length >= 3) fsd *= 0.9;
  else if (comps.length === 0) fsd *= 1.3;

  const subdivisionComps = comps.filter((c) => c.isSubdivisionMatch).length;
  if (subdivisionComps >= 3) fsd *= 0.85;

  const recentComps = comps.filter((c) => c.recencyMonths < 3).length;
  if (recentComps >= 3) fsd *= 0.9;

  fsd = Math.max(5, Math.min(40, fsd));
  fsd = Math.round(fsd * 10) / 10;

  const confidence: "High" | "Medium" | "Low" = fsd < 13 ? "High" : fsd <= 20 ? "Medium" : "Low";

  const rangeMultiplier = fsd / 100;
  const low = Math.round(estimate * (1 - rangeMultiplier));
  const high = Math.round(estimate * (1 + rangeMultiplier));

  return { confidence, fsd, low, high };
}
