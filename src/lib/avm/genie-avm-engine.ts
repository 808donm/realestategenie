/**
 * Genie AVM Engine
 *
 * Proprietary Automated Valuation Model that combines multiple data sources
 * into an ensemble estimate. More accurate than generic AVMs for Hawaii
 * because it uses actual MLS closed sales, accounts for Fee Simple vs
 * Leasehold, and matches by subdivision.
 *
 * Sources (dynamically weighted by comp quality):
 *   1. MLS Closed Comps (30-50%) -- actual sale prices from Trestle
 *   2. Property AVM (30-50%) -- Realie/RentCast property valuation
 *   3. County Assessment (20%) -- trend-adjusted market value
 *
 * Dynamic weighting: When comps agree well (low CV), comps get 50%.
 * When comps disagree (high CV) or are few, Property AVM gets more weight.
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

  // Property features (from REAPI or MLS -- used for feature-level comp adjustments)
  pool?: boolean;
  garage?: boolean;
  garageSqft?: number;
  garageType?: string; // "Garage" | "Carport" | null
  condition?: string;  // "Excellent" | "Good" | "Average" | "Fair" | "Poor"
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

  // External AVM values (pre-fetched)
  propertyAvm?: { value: number; low?: number; high?: number } | null; // Realie/RentCast property valuation
  rentcastAvm?: { value: number; low: number; high: number } | null;
  realieAvm?: { value: number; low?: number; high?: number } | null;

  // County assessment (most recent year from RentCast taxAssessments)
  assessment?: { value: number; year: number; land: number; improvements: number } | null;
  assessmentHistory?: { year: number; value: number }[];

  // MLS closed comps (from CMA engine or Trestle)
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
  // Property features (from REAPI comps)
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
    propertyAvm: number | null;
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
    lastSaleAppreciated: number | null;
    lastSaleYearsAgo: number | null;
  };
  comps: AdjustedComp[];
}

// ── Adjustment Constants (Hawaii market) ──
// These are percentage-based relative to comp price, not flat dollar amounts.
// Hawaii's high price points make flat adjustments meaningless ($10K on a $2M home = 0.5%).

const ADJUSTMENT_PCT_PER_BED = 0.05;   // 5% per bedroom difference
const ADJUSTMENT_PCT_PER_BATH = 0.03;  // 3% per bathroom difference
const ADJUSTMENT_PCT_PER_YEAR_AGE = 0.005; // 0.5% per year age difference
const ADJUSTMENT_PCT_SQFT = 0.75;      // 75% of proportional sqft difference
const ADJUSTMENT_PER_SQFT_LOT = 10;    // $/sqft for lot size difference (SFR only)

// For condos, sqft matters more and bed/bath matters less
const CONDO_ADJUSTMENT_PCT_SQFT = 0.85;       // 85% for condos (increased)
const CONDO_BED_BATH_DISCOUNT = 0.6;          // Reduce bed/bath adjustments by 40% for condos

// Feature-based adjustments (from REAPI property data)
// Applied when subject and comp differ on a feature. Capped at 10% total.
const ADJUSTMENT_PCT_POOL = 0.04;           // 4% for pool (significant in Hawaii)
const ADJUSTMENT_PCT_GARAGE = 0.025;        // 2.5% for garage vs none
const ADJUSTMENT_PCT_CARPORT = 0.01;        // 1% for carport vs none
const ADJUSTMENT_PCT_FIREPLACE = 0.01;      // 1% for fireplace
const ADJUSTMENT_PCT_OUTDOOR_SPACE = 0.02;  // 2% for significant outdoor living (deck+patio+porch > 200sqft)
const ADJUSTMENT_PCT_CONDITION: Record<string, number> = {
  "Excellent": 0.06, "Good": 0.03, "Average": 0, "Fair": -0.03, "Poor": -0.06,
};
const MAX_FEATURE_ADJUSTMENT_PCT = 0.10;    // Cap total feature adjustments at 10%

// Annual appreciation rate defaults (Oahu 40-year historical averages)
const DEFAULT_APPRECIATION_RATE_SFR = 0.05;   // 5%/yr for single-family
const DEFAULT_APPRECIATION_RATE_CONDO = 0.04;  // 4%/yr for condos

// Comp quality thresholds
const MIN_CORRELATION = 0.35;                  // Exclude comps below 35% match
const MAX_ADJUSTMENT_PCT = 0.35;               // Exclude comps needing >35% total adjustment
const OUTLIER_THRESHOLD = 0.50;                // Exclude comps >50% from median adjusted price

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
    }
  }

  // 2. Property AVM (Realie/RentCast) -- strongest external signal
  const propertyAvmValue = input.propertyAvm?.value || null;

  // 3. County Assessment (trend-adjusted)
  let trendAdjustedAssessment: number | null = null;
  let assessmentTrendPct: number | null = null;

  if (input.assessment?.value) {
    const trend = computeAssessmentTrend(input.assessmentHistory || []);
    assessmentTrendPct = trend;
    trendAdjustedAssessment = Math.round(input.assessment.value * (1 + trend));
  }

  // 4. List Price (on-market) -- agent-set price is a strong market signal
  // Apply list-to-sale ratio if available (e.g., 0.97 means homes sell at 97% of list)
  const rawListPrice = input.listPrice && input.listPrice > 0 ? input.listPrice : null;
  const listPriceValue = rawListPrice && input.listToSaleRatio
    ? Math.round(rawListPrice * input.listToSaleRatio)
    : rawListPrice;

  // 5. Time-Adjusted Last Sale -- appreciate the last arm's-length sale price
  // A property sold for $2.82M in 2023 should be worth at least $2.82M * (1.035)^3 in 2026
  let lastSaleAppreciated: number | null = null;
  let lastSaleYearsAgo: number | null = null;

  if (input.lastSalePrice && input.lastSalePrice > 1000 && input.lastSaleDate) {
    const saleDate = new Date(input.lastSaleDate);
    const yearsAgo = (Date.now() - saleDate.getTime()) / (365.25 * 86400000);
    lastSaleYearsAgo = Math.round(yearsAgo * 10) / 10;

    // Only use if sale was arm's-length (> $1000) and within 20 years
    if (yearsAgo > 0.25 && yearsAgo <= 30) {
      const subType = (input.propertySubType || "").toLowerCase();
      const isCondo = subType.includes("condo") || subType.includes("townhouse") || subType.includes("apartment");
      const defaultRate = isCondo ? DEFAULT_APPRECIATION_RATE_CONDO : DEFAULT_APPRECIATION_RATE_SFR;
      const rate = input.appreciationRate ?? defaultRate;
      lastSaleAppreciated = Math.round(input.lastSalePrice * Math.pow(1 + rate, yearsAgo));
    }
  }

  // ── Property AVM sanity check ──
  // If the Property AVM is less than 60% of the time-adjusted last sale,
  // it's likely erroneous (bad data, wrong property type, etc.) -- discard it.
  let sanitizedPropertyAvm = propertyAvmValue;
  if (sanitizedPropertyAvm && lastSaleAppreciated && sanitizedPropertyAvm < lastSaleAppreciated * 0.6) {
    console.log(`[GenieAVM] Discarding Property AVM $${sanitizedPropertyAvm.toLocaleString()} — below 60% of time-adjusted sale $${lastSaleAppreciated.toLocaleString()}`);
    sanitizedPropertyAvm = null;
  }

  // If list price is below 30% of Property AVM, the AVM is likely for the
  // whole building (multi-family) or a different unit -- discard it.
  // Also applies when Property AVM is >3x the list price for any property.
  if (sanitizedPropertyAvm && listPriceValue && listPriceValue < sanitizedPropertyAvm * 0.30) {
    console.log(`[GenieAVM] Discarding Property AVM $${sanitizedPropertyAvm.toLocaleString()} — list price $${listPriceValue.toLocaleString()} is <30% (likely whole-building AVM)`);
    sanitizedPropertyAvm = null;
  }

  // ── Dynamic Weight Assignment ──
  // Comp weight is dynamically scaled by average match quality (correlation).
  // High-quality comps (80%+ avg correlation) get full weight.
  // Poor comps (25-40%) get heavily discounted. Freed weight goes to
  // list price (if on-market) and Property AVM.
  const isOnMarket = !!listPriceValue;

  if (compBasedValue) {
    // Calculate average correlation across adjusted comps
    const compsWithCorrelation = adjustedComps.filter((c) => c.correlation != null);
    const avgCorrelation = compsWithCorrelation.length > 0
      ? compsWithCorrelation.reduce((s, c) => s + (c.correlation || 0), 0) / compsWithCorrelation.length
      : 0.5; // Default if no correlation data

    // Quality multiplier based on average match quality (matches per-comp tiers)
    let qualityMultiplier: number;
    if (avgCorrelation >= 0.75) qualityMultiplier = 1.0;       // Excellent comps
    else if (avgCorrelation >= 0.55) qualityMultiplier = 0.65;  // Good
    else qualityMultiplier = 0.35;                               // Moderate/poor

    // Fewer comps also reduces quality
    if (adjustedComps.length < 3) qualityMultiplier *= 0.7;
    else if (adjustedComps.length < 5) qualityMultiplier *= 0.85;

    // Base weights before quality adjustment
    let baseCompWeight: number;
    let listPriceWeight: number;
    let propAvmWeight: number;
    let assessmentWeight: number;

    if (isOnMarket) {
      baseCompWeight = 0.40;
      listPriceWeight = 0.30;
      propAvmWeight = 0.15;
      assessmentWeight = 0.15;
    } else {
      baseCompWeight = 0.50;
      listPriceWeight = 0;
      propAvmWeight = 0.25;
      assessmentWeight = 0.25;
    }

    // Apply quality multiplier to comp weight
    let compWeight = baseCompWeight * qualityMultiplier;
    const freedWeight = baseCompWeight - compWeight;

    // Redistribute freed weight to other sources
    if (isOnMarket) {
      listPriceWeight += freedWeight * 0.5;
      propAvmWeight += freedWeight * 0.3;
      assessmentWeight += freedWeight * 0.2;
    } else {
      propAvmWeight += freedWeight * 0.6;
      assessmentWeight += freedWeight * 0.4;
    }

    sources.push({ name: "mlsComps", value: compBasedValue, weight: compWeight });

    if (listPriceValue && listPriceWeight > 0) {
      sources.push({ name: "listPrice", value: listPriceValue, weight: listPriceWeight });
    }

    if (sanitizedPropertyAvm) {
      sources.push({ name: "propertyAvm", value: sanitizedPropertyAvm, weight: propAvmWeight });
    }

    sources.push({
      name: "assessment",
      value: trendAdjustedAssessment || input.assessment?.value || 0,
      weight: assessmentWeight,
    });
  } else if (listPriceValue && sanitizedPropertyAvm) {
    // No comps but have list price and Property AVM
    sources.push({ name: "listPrice", value: listPriceValue, weight: 0.40 });
    sources.push({ name: "propertyAvm", value: sanitizedPropertyAvm, weight: 0.35 });
    if (trendAdjustedAssessment) {
      sources.push({ name: "assessment", value: trendAdjustedAssessment, weight: 0.25 });
    }
  } else if (listPriceValue) {
    // Only list price -- it's our best signal
    sources.push({ name: "listPrice", value: listPriceValue, weight: 0.60 });
    if (trendAdjustedAssessment) {
      sources.push({ name: "assessment", value: trendAdjustedAssessment, weight: 0.40 });
    }
  } else if (sanitizedPropertyAvm) {
    // No comps, no list price -- Property AVM is primary
    sources.push({ name: "propertyAvm", value: sanitizedPropertyAvm, weight: 0.60 });
    if (trendAdjustedAssessment) {
      sources.push({ name: "assessment", value: trendAdjustedAssessment, weight: 0.40 });
    }
  } else if (trendAdjustedAssessment) {
    // Only assessment available
    sources.push({ name: "assessment", value: trendAdjustedAssessment, weight: 1.0 });

    // Sanity check: if assessment seems unreasonably low, add $/sqft floor
    if (input.sqft) {
      const assessedPerSqft = trendAdjustedAssessment / input.sqft;
      if (assessedPerSqft < 200) {
        const estimatedPerSqft = 550;
        const sqftEstimate = Math.round(input.sqft * estimatedPerSqft);
        sources[0].value = Math.max(sources[0].value, sqftEstimate);
        sources[0].weight = 0.5;
        sources.push({ name: "sqftEstimate", value: sqftEstimate, weight: 0.5 });
      }
    }
  }

  // Add time-adjusted last sale as a source (weight varies by recency)
  // Recent sales (<3 years) are strong signals; older sales carry less weight
  if (lastSaleAppreciated && lastSaleYearsAgo) {
    let saleWeight: number;
    if (lastSaleYearsAgo <= 2) saleWeight = 0.15;      // Recent sale: strong signal
    else if (lastSaleYearsAgo <= 5) saleWeight = 0.10;  // Moderate
    else if (lastSaleYearsAgo <= 10) saleWeight = 0.07; // Weaker
    else saleWeight = 0.05;                              // Old sale: minimal weight
    sources.push({ name: "lastSaleAppreciated", value: lastSaleAppreciated, weight: saleWeight });
  }

  // Remove zero-value sources
  const validSources = sources.filter((s) => s.value > 0);
  if (validSources.length === 0) return null;

  // Normalize weights to sum to 1.0
  const totalWeight = validSources.reduce((s, src) => s + src.weight, 0);
  for (const src of validSources) src.weight = src.weight / totalWeight;

  // Weighted ensemble value
  let ensembleValue = Math.round(
    validSources.reduce((s, src) => s + src.value * src.weight, 0),
  );

  // Floor check: AVM should not fall below the time-adjusted last sale.
  // Markets generally appreciate, so a valuation below what someone paid
  // (adjusted for time) suggests undervaluation from bad external AVMs.
  // Blending weight decreases with age: recent sales get stronger pull-up.
  if (lastSaleAppreciated && lastSaleYearsAgo && ensembleValue < lastSaleAppreciated) {
    let floorWeight: number;
    if (lastSaleYearsAgo <= 3) floorWeight = 0.65;       // Recent: strong pull toward appreciated sale
    else if (lastSaleYearsAgo <= 5) floorWeight = 0.55;
    else if (lastSaleYearsAgo <= 10) floorWeight = 0.45;  // Older: still meaningful
    else floorWeight = 0.35;                               // Very old: gentle nudge
    ensembleValue = Math.round(ensembleValue * (1 - floorWeight) + lastSaleAppreciated * floorWeight);
  }

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
      propertyAvm: propertyAvmValue,
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
      lastSaleAppreciated,
      lastSaleYearsAgo,
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
  const subTypeLower = (input.propertySubType || "").toLowerCase();
  const isCondo = subTypeLower.includes("condo") || subTypeLower.includes("townhouse") || subTypeLower.includes("apartment");
  const isSFR = subTypeLower.includes("single") || (input.propertyType?.toLowerCase() === "residential" && !isCondo);

  const now = Date.now();
  const adjusted: AdjustedComp[] = [];

  for (const comp of comps) {
    if (comp.closePrice <= 0) continue;

    // Skip comps with low correlation (not really comparable)
    if (comp.correlation != null && comp.correlation < MIN_CORRELATION) continue;

    // Calculate adjustments -- percentage-based relative to comp price
    // For condos: sqft matters more, bed/bath matters less
    const sqftPct = isCondo ? CONDO_ADJUSTMENT_PCT_SQFT : ADJUSTMENT_PCT_SQFT;
    const bedBathDiscount = isCondo ? CONDO_BED_BATH_DISCOUNT : 1.0;

    const sqftAdj = subjectSqft && comp.sqft
      ? Math.round(((subjectSqft - comp.sqft) / comp.sqft) * comp.closePrice * sqftPct)
      : 0;
    const bedsAdj = (subjectBeds && comp.beds)
      ? Math.round((subjectBeds - comp.beds) * comp.closePrice * ADJUSTMENT_PCT_PER_BED * bedBathDiscount)
      : 0;
    const bathsAdj = (subjectBaths && comp.baths)
      ? Math.round((subjectBaths - comp.baths) * comp.closePrice * ADJUSTMENT_PCT_PER_BATH * bedBathDiscount)
      : 0;
    // Age adjustment -- reduced for condos (location/floor matters more than age)
    const agePct = isCondo ? ADJUSTMENT_PCT_PER_YEAR_AGE * 0.3 : ADJUSTMENT_PCT_PER_YEAR_AGE;
    const ageAdj = (subjectYearBuilt && comp.yearBuilt)
      ? Math.round((comp.yearBuilt - subjectYearBuilt) * comp.closePrice * agePct)
      : 0;
    const lotAdj = isSFR && subjectLotSize && comp.lotSize
      ? (subjectLotSize - comp.lotSize) * ADJUSTMENT_PER_SQFT_LOT
      : 0;

    // Feature-based adjustments (from REAPI data)
    let featureAdj = 0;

    // Pool: subject has pool but comp doesn't → adjust comp up (it would be worth more with a pool)
    if (input.pool != null && comp.pool != null && input.pool !== comp.pool) {
      featureAdj += (input.pool ? 1 : -1) * comp.closePrice * ADJUSTMENT_PCT_POOL;
    }

    // Garage: compare parking type differences
    if (input.garageType && comp.garageType) {
      const subjectHasGarage = input.garageType.toLowerCase().includes("garage") && !input.garageType.toLowerCase().includes("carport");
      const compHasGarage = comp.garageType.toLowerCase().includes("garage") && !comp.garageType.toLowerCase().includes("carport");
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

    // Fireplace
    if (input.fireplace != null && comp.fireplace != null && input.fireplace !== comp.fireplace) {
      featureAdj += (input.fireplace ? 1 : -1) * comp.closePrice * ADJUSTMENT_PCT_FIREPLACE;
    }

    // Outdoor living space (deck + patio + porch)
    const subjectOutdoor = (input.deckArea || 0) + (input.patioArea || 0) + (input.porchArea || 0);
    const compOutdoor = (comp.deckArea || 0) + (comp.patioArea || 0) + (comp.porchArea || 0);
    if (subjectOutdoor > 200 && compOutdoor < 100) {
      featureAdj += comp.closePrice * ADJUSTMENT_PCT_OUTDOOR_SPACE;
    } else if (compOutdoor > 200 && subjectOutdoor < 100) {
      featureAdj -= comp.closePrice * ADJUSTMENT_PCT_OUTDOOR_SPACE;
    }

    // Building condition
    if (input.condition && comp.condition && input.condition !== comp.condition) {
      const subjectScore = ADJUSTMENT_PCT_CONDITION[input.condition] ?? 0;
      const compScore = ADJUSTMENT_PCT_CONDITION[comp.condition] ?? 0;
      featureAdj += (subjectScore - compScore) * comp.closePrice;
    }

    // Cap feature adjustments at 10% to prevent over-adjustment
    const featureAdjCapped = Math.sign(featureAdj) * Math.min(Math.abs(featureAdj), comp.closePrice * MAX_FEATURE_ADJUSTMENT_PCT);

    const totalAdj = sqftAdj + bedsAdj + bathsAdj + ageAdj + lotAdj + Math.round(featureAdjCapped);

    // Cap total adjustment -- if a comp needs >35% adjustment, it's not truly comparable
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

    // Correlation weight based on match quality tiers:
    // 75-95%: 80% weight, 55-74%: 50%, 35-54%: 25%, below 35%: excluded
    const rawCorrelation = comp.correlation || 0.5;
    let correlationWeight: number;
    if (rawCorrelation >= 0.75) correlationWeight = 0.80;
    else if (rawCorrelation >= 0.55) correlationWeight = 0.50;
    else correlationWeight = 0.25; // 35-54% (below 35% already excluded)

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

  return filtered;
}

// ── Coefficient of Variation ──
// Measures how much the comp prices agree. Low CV = comps cluster tightly.

function computeCV(values: number[]): number {
  if (values.length < 2) return 1.0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 1.0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
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
