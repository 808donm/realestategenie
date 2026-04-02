/**
 * CMA Comp Adjustments Engine
 *
 * Calculates dollar adjustments between a subject property and comparable sales,
 * similar to RPR's "Comp Property Adjustments" feature.
 *
 * Adjustment methodology:
 * - Living area: difference in sqft * local price per sqft
 * - Bedrooms: $15,000 per bedroom difference (configurable)
 * - Bathrooms: $10,000 per bathroom difference (configurable)
 * - Lot size: difference in sqft * $5/sqft (configurable)
 * - Age: $500 per year difference (configurable)
 * - Garage: $20,000 per garage space difference
 * - Condition: manual override or default $0
 *
 * The adjusted price represents what the comp WOULD have sold for
 * if it had the same features as the subject property.
 */

export interface SubjectProperty {
  address: string;
  beds: number;
  baths: number;
  sqft: number;
  lotSizeSqft?: number;
  yearBuilt?: number;
  garageSpaces?: number;
  stories?: number;
  propertyType?: string;
  propertySubType?: string;
  condition?: string;
  pricePerSqft?: number;
}

export interface CompProperty {
  address: string;
  city?: string;
  status: string;
  listPrice: number;
  closePrice: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSizeSqft?: number | null;
  yearBuilt?: number | null;
  garageSpaces?: number | null;
  stories?: number | null;
  dom?: number | null;
  closeDate?: string | null;
  listDate?: string | null;
  photoUrl?: string | null;
  mlsNumber?: string;
  propertyType?: string;
  propertySubType?: string;
  condition?: string;
  listingAgent?: string;
  listingOffice?: string;
  description?: string;
}

export interface CompAdjustment {
  label: string;
  subjectValue: string;
  compValue: string;
  adjustment: number; // positive = comp is worth more, negative = comp is worth less
}

export interface AdjustedComp {
  comp: CompProperty;
  price: number; // close price or list price
  pricePerSqft: number;
  adjustments: CompAdjustment[];
  totalAdjustment: number;
  adjustedPrice: number;
  netAdjustmentPct: number; // total adj / price
  grossAdjustmentPct: number; // sum of absolute adjustments / price
}

export interface CMAAnalysis {
  subject: SubjectProperty;
  adjustedComps: AdjustedComp[];
  averageOfComps: number;
  totalAdjustment: number;
  recommendedPrice: number;
  recommendedPricePerSqft: number;
  cmaRange: { low: number; high: number };
  // Stats by status
  activeStats?: StatusGroupStats;
  pendingStats?: StatusGroupStats;
  closedStats?: StatusGroupStats;
}

export interface StatusGroupStats {
  count: number;
  avgPrice: number;
  avgPricePerSqft: number;
  avgDOM: number;
  lowPrice: number;
  highPrice: number;
  avgLivingArea: number;
  avgAge: number;
}

// ── Adjustment Configuration ──

export interface AdjustmentConfig {
  pricePerSqft: number; // $/sqft for living area adjustment
  pricePerBed: number; // $ per bedroom
  pricePerBath: number; // $ per bathroom
  pricePerLotSqft: number; // $ per lot sqft
  pricePerYear: number; // $ per year (age)
  pricePerGarage: number; // $ per garage space
}

const DEFAULT_CONFIG: AdjustmentConfig = {
  pricePerSqft: 0, // Will be computed from comps median price/sqft
  pricePerBed: 15000,
  pricePerBath: 10000,
  pricePerLotSqft: 5,
  pricePerYear: 500,
  pricePerGarage: 20000,
};

// ── Main Analysis Function ──

export function calculateCMAAnalysis(
  subject: SubjectProperty,
  comps: CompProperty[],
  config?: Partial<AdjustmentConfig>,
): CMAAnalysis {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Compute median price/sqft from closed comps if not provided
  if (!cfg.pricePerSqft) {
    const closedPpsf = comps
      .filter((c) => c.closePrice && c.sqft && c.sqft > 0)
      .map((c) => c.closePrice! / c.sqft!);
    cfg.pricePerSqft = closedPpsf.length > 0
      ? closedPpsf.sort((a, b) => a - b)[Math.floor(closedPpsf.length / 2)]
      : subject.pricePerSqft || 500;
  }

  // Calculate adjustments for each comp
  const adjustedComps: AdjustedComp[] = comps.map((comp) => {
    const price = comp.closePrice || comp.listPrice;
    const ppsf = comp.sqft && comp.sqft > 0 ? price / comp.sqft : 0;
    const adjustments: CompAdjustment[] = [];

    // Living Area adjustment
    if (subject.sqft && comp.sqft && comp.sqft > 0) {
      const diff = subject.sqft - comp.sqft;
      if (diff !== 0) {
        adjustments.push({
          label: "Living Area (sqft)",
          subjectValue: subject.sqft.toLocaleString(),
          compValue: comp.sqft.toLocaleString(),
          adjustment: Math.round(diff * cfg.pricePerSqft),
        });
      }
    }

    // Bedrooms
    if (subject.beds != null && comp.beds != null) {
      const diff = subject.beds - comp.beds;
      if (diff !== 0) {
        adjustments.push({
          label: "Bedrooms",
          subjectValue: String(subject.beds),
          compValue: String(comp.beds),
          adjustment: diff * cfg.pricePerBed,
        });
      }
    }

    // Bathrooms
    if (subject.baths != null && comp.baths != null) {
      const diff = subject.baths - comp.baths;
      if (diff !== 0) {
        adjustments.push({
          label: "Bathrooms",
          subjectValue: String(subject.baths),
          compValue: String(comp.baths),
          adjustment: diff * cfg.pricePerBath,
        });
      }
    }

    // Lot Size
    if (subject.lotSizeSqft && comp.lotSizeSqft && comp.lotSizeSqft > 0) {
      const diff = subject.lotSizeSqft - comp.lotSizeSqft;
      if (Math.abs(diff) > 500) { // Only adjust for significant lot size differences
        adjustments.push({
          label: "Lot Size (sqft)",
          subjectValue: subject.lotSizeSqft.toLocaleString(),
          compValue: comp.lotSizeSqft.toLocaleString(),
          adjustment: Math.round(diff * cfg.pricePerLotSqft),
        });
      }
    }

    // Age / Year Built
    if (subject.yearBuilt && comp.yearBuilt) {
      const diff = subject.yearBuilt - comp.yearBuilt; // positive = subject is newer
      if (diff !== 0) {
        adjustments.push({
          label: "Year Built",
          subjectValue: String(subject.yearBuilt),
          compValue: String(comp.yearBuilt),
          adjustment: diff * cfg.pricePerYear,
        });
      }
    }

    // Garage
    if (subject.garageSpaces != null && comp.garageSpaces != null) {
      const diff = subject.garageSpaces - comp.garageSpaces;
      if (diff !== 0) {
        adjustments.push({
          label: "Garage Spaces",
          subjectValue: String(subject.garageSpaces),
          compValue: String(comp.garageSpaces),
          adjustment: diff * cfg.pricePerGarage,
        });
      }
    }

    const totalAdjustment = adjustments.reduce((sum, a) => sum + a.adjustment, 0);
    const adjustedPrice = price + totalAdjustment;
    const grossAdj = adjustments.reduce((sum, a) => sum + Math.abs(a.adjustment), 0);

    return {
      comp,
      price,
      pricePerSqft: Math.round(ppsf),
      adjustments,
      totalAdjustment,
      adjustedPrice: Math.round(adjustedPrice),
      netAdjustmentPct: price > 0 ? Math.round((totalAdjustment / price) * 10000) / 100 : 0,
      grossAdjustmentPct: price > 0 ? Math.round((grossAdj / price) * 10000) / 100 : 0,
    };
  });

  // Compute recommended price from adjusted comp values
  const adjustedPrices = adjustedComps.map((c) => c.adjustedPrice);
  const avgAdjusted = adjustedPrices.length > 0
    ? Math.round(adjustedPrices.reduce((a, b) => a + b, 0) / adjustedPrices.length)
    : 0;
  const totalAdj = adjustedComps.length > 0
    ? Math.round(adjustedComps.reduce((sum, c) => sum + c.totalAdjustment, 0) / adjustedComps.length)
    : 0;

  const sortedPrices = [...adjustedPrices].sort((a, b) => a - b);
  const low = sortedPrices[0] || 0;
  const high = sortedPrices[sortedPrices.length - 1] || 0;

  // Stats by status group
  const groupStats = (statusFilter: string): StatusGroupStats | undefined => {
    const group = adjustedComps.filter((c) => c.comp.status.toLowerCase().includes(statusFilter));
    if (group.length === 0) return undefined;
    const prices = group.map((c) => c.price);
    const ppsfs = group.map((c) => c.pricePerSqft).filter((p) => p > 0);
    const doms = group.map((c) => c.comp.dom).filter((d): d is number => d != null);
    const areas = group.map((c) => c.comp.sqft).filter((s): s is number => s != null && s > 0);
    const ages = group.map((c) => c.comp.yearBuilt).filter((y): y is number => y != null).map((y) => new Date().getFullYear() - y);
    return {
      count: group.length,
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      avgPricePerSqft: ppsfs.length > 0 ? Math.round(ppsfs.reduce((a, b) => a + b, 0) / ppsfs.length) : 0,
      avgDOM: doms.length > 0 ? Math.round(doms.reduce((a, b) => a + b, 0) / doms.length) : 0,
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      avgLivingArea: areas.length > 0 ? Math.round(areas.reduce((a, b) => a + b, 0) / areas.length) : 0,
      avgAge: ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0,
    };
  };

  return {
    subject,
    adjustedComps,
    averageOfComps: avgAdjusted,
    totalAdjustment: totalAdj,
    recommendedPrice: avgAdjusted,
    recommendedPricePerSqft: subject.sqft && subject.sqft > 0 ? Math.round(avgAdjusted / subject.sqft) : 0,
    cmaRange: { low, high },
    activeStats: groupStats("active"),
    pendingStats: groupStats("pending"),
    closedStats: groupStats("closed"),
  };
}
