/**
 * Seller Motivation Scoring Engine
 *
 * Rule-based algorithm that scores property owners on likelihood to sell (0-100).
 * Uses data from Realie API: equity, ownership duration, absentee status,
 * foreclosure, liens, transfer history, and portfolio size.
 */

import type { RealieParcel } from "@/lib/integrations/realie-client";

// ── Types ──────────────────────────────────────────────────────────────────

export type SellerLevel = "very-likely" | "likely" | "possible" | "unlikely";

export type SellerFactor = {
  name: string;
  points: number;
  maxPoints: number;
  description: string;
};

export type SellerScore = {
  score: number;
  level: SellerLevel;
  factors: SellerFactor[];
};

export type ScoredProperty = {
  id: string;
  lat: number;
  lng: number;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  score: number;
  level: SellerLevel;
  factors: SellerFactor[];
  owner?: string;
  equity?: number;
  ltv?: number;
  ownershipYears?: number;
  absentee: boolean;
  propertyType?: string;
  estimatedValue?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  ownerParcelCount?: number;
  geometry?: RealieParcel["geometry"];
  parcelId?: string;
};

// ── Scoring Constants ──────────────────────────────────────────────────────

const WEIGHTS = {
  equity: 15,
  ownershipDuration: 15,
  absentee: 12,
  distress: 12,
  portfolio: 8,
  transferRecency: 8,
  taxAnomaly: 5,
  marketTrend: 5,
  ownerType: 6,
  taxTrend: 5,
  appreciation: 5,
  hoaBurden: 4,
} as const;

// ── Scoring Functions ──────────────────────────────────────────────────────

function scoreEquity(parcel: RealieParcel): SellerFactor {
  const max = WEIGHTS.equity;
  let points = 0;
  let description = "No equity data available";

  const ltv = parcel.LTVCurrentEstCombined;
  const equity = parcel.equityCurrentEstBal;

  if (ltv != null) {
    if (ltv < 30) {
      points = max;
      description = `Very high equity (LTV ${ltv}%) — strong position to sell`;
    } else if (ltv < 50) {
      points = Math.round(max * 0.75);
      description = `High equity (LTV ${ltv}%) — favorable to sell`;
    } else if (ltv < 70) {
      points = Math.round(max * 0.4);
      description = `Moderate equity (LTV ${ltv}%)`;
    } else {
      points = Math.round(max * 0.15);
      description = `Low equity (LTV ${ltv}%)`;
    }
  } else if (equity != null && parcel.modelValue) {
    const equityPct = Math.round((equity / parcel.modelValue) * 100);
    if (equityPct > 70) {
      points = max;
      description = `Very high equity (${equityPct}% of value)`;
    } else if (equityPct > 50) {
      points = Math.round(max * 0.75);
      description = `High equity (${equityPct}% of value)`;
    } else if (equityPct > 30) {
      points = Math.round(max * 0.4);
      description = `Moderate equity (${equityPct}% of value)`;
    } else {
      points = Math.round(max * 0.15);
      description = `Low equity (${equityPct}% of value)`;
    }
  }

  return { name: "High Equity", points, maxPoints: max, description };
}

function scoreOwnershipDuration(parcel: RealieParcel): SellerFactor {
  const max = WEIGHTS.ownershipDuration;
  let points = 0;
  let description = "No ownership date available";

  const dateStr = parcel.ownershipStartDate || parcel.transferDate;
  if (dateStr) {
    const formatted =
      dateStr.length === 8
        ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
        : dateStr;
    const ownerSince = new Date(formatted);
    if (!isNaN(ownerSince.getTime())) {
      const years = (Date.now() - ownerSince.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const roundedYears = Math.round(years * 10) / 10;

      if (years > 15) {
        points = max;
        description = `Owned ${roundedYears} years — long-term holder, likely high equity`;
      } else if (years > 10) {
        points = 15;
        description = `Owned ${roundedYears} years — established owner`;
      } else if (years > 7) {
        points = 10;
        description = `Owned ${roundedYears} years`;
      } else if (years > 5) {
        points = 5;
        description = `Owned ${roundedYears} years`;
      } else {
        points = 2;
        description = `Owned ${roundedYears} years — recent purchase`;
      }
    }
  }

  return { name: "Long Ownership", points, maxPoints: max, description };
}

function scoreAbsentee(parcel: RealieParcel): SellerFactor {
  const max = WEIGHTS.absentee;
  let points = 0;
  let description = "Owner-occupied or unknown";

  const outOfState =
    parcel.ownerState &&
    parcel.state &&
    parcel.ownerState.toUpperCase() !== parcel.state.toUpperCase();

  // Prefer the direct ownerOccupied boolean from RentCast when available.
  if (parcel.ownerOccupied === true) {
    // API confirms owner-occupied — no absentee points
    return { name: "Absentee Owner", points: 0, maxPoints: max, description: "Owner-occupied (confirmed)" };
  }

  if (parcel.ownerOccupied === false) {
    // API confirms non-owner-occupied — score based on location
    if (outOfState) {
      points = max;
      description = `Out-of-state absentee owner (${parcel.ownerState})`;
    } else {
      points = 12;
      description = "Non-owner-occupied property";
    }
    return { name: "Absentee Owner", points, maxPoints: max, description };
  }

  // Fallback: ownerOccupied is undefined — compare owner address to property address
  const ownerAddr = parcel.ownerAddressLine1 || parcel.ownerAddressFull;
  const propAddr = parcel.address;

  if (ownerAddr && propAddr) {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/\bapt\b.*$/i, "")
        .replace(/\bunit\b.*$/i, "")
        .replace(/\b0+(\d)/g, "$1")
        .replace(/[^a-z0-9]/g, "")
        .trim();

    const isPoBox = /\bp\.?\s*o\.?\s*box\b/i.test(ownerAddr);

    if (isPoBox) {
      // P.O. Box in the same zip code is not a reliable absentee signal —
      // the owner likely lives nearby and picks up mail at the local post office.
      const sameZip = parcel.ownerZipCode && parcel.zipCode
        && parcel.ownerZipCode.slice(0, 5) === parcel.zipCode.slice(0, 5);
      if (sameZip) {
        // Not absentee — local P.O. Box
      } else if (outOfState) {
        points = max;
        description = `Out-of-state P.O. Box owner (${parcel.ownerState})`;
      } else {
        points = 10;
        description = "P.O. Box in different area — possible absentee";
      }
    } else {
      const isAbsentee = normalize(ownerAddr) !== normalize(propAddr);

      if (isAbsentee) {
        if (outOfState) {
          points = max;
          description = `Out-of-state absentee owner (${parcel.ownerState})`;
        } else {
          points = 12;
          description = "Absentee owner — may be investor or inherited property";
        }
      }
    }
  }

  return { name: "Absentee Owner", points, maxPoints: max, description };
}

function scoreDistress(parcel: RealieParcel): SellerFactor {
  const max = WEIGHTS.distress;
  let points = 0;

  // Distinguish between "no data available" (Realie not connected) and
  // "checked and clean" (data exists but no distress found)
  const hasDistressData = parcel.forecloseCode !== undefined
    || parcel.totalLienCount !== undefined
    || parcel.totalLienBalance !== undefined;
  let description = hasDistressData
    ? "No distress signals found"
    : "No distress data available";

  if (parcel.forecloseCode) {
    points = max;
    description = `Active foreclosure (${parcel.forecloseCode})`;
  } else if (parcel.totalLienCount && parcel.totalLienCount > 3) {
    points = 12;
    description = `${parcel.totalLienCount} liens on property`;
  } else if (
    parcel.totalLienBalance &&
    parcel.modelValue &&
    parcel.totalLienBalance > parcel.modelValue * 0.9
  ) {
    points = 10;
    description = "Lien balance near or exceeding property value";
  } else if (parcel.totalLienCount && parcel.totalLienCount > 1) {
    points = 6;
    description = `${parcel.totalLienCount} liens on property`;
  }

  return { name: "Distress Signals", points, maxPoints: max, description };
}

function scorePortfolio(parcel: RealieParcel): SellerFactor {
  const max = WEIGHTS.portfolio;
  let points = 0;
  let description = parcel.ownerParcelCount != null
    ? "Single-property owner"
    : "No portfolio data available";

  const count = parcel.ownerParcelCount;
  if (count != null) {
    if (count > 10) {
      points = max;
      description = `Investor with ${count} properties — portfolio rebalancing likely`;
    } else if (count > 5) {
      points = 8;
      description = `Multi-property owner (${count} parcels)`;
    } else if (count > 2) {
      points = 5;
      description = `Owns ${count} properties`;
    } else if (count > 1) {
      points = 3;
      description = "Owns 2 properties";
    }
  }

  return { name: "Multi-Property Owner", points, maxPoints: max, description };
}

function scoreTransferRecency(parcel: RealieParcel): SellerFactor {
  const max = WEIGHTS.transferRecency;
  let points = 0;
  let description = "No transfer history available";

  const dateStr = parcel.transferDate || parcel.ownershipStartDate;
  if (dateStr) {
    const formatted =
      dateStr.length === 8
        ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
        : dateStr;
    const transferDate = new Date(formatted);
    if (!isNaN(transferDate.getTime())) {
      const years = (Date.now() - transferDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

      if (years > 15) {
        points = max;
        description = `No transfer in ${Math.round(years)} years`;
      } else if (years > 10) {
        points = 7;
        description = `Last transfer ${Math.round(years)} years ago`;
      } else if (years > 7) {
        points = 5;
        description = `Last transfer ${Math.round(years)} years ago`;
      } else if (years > 5) {
        points = 3;
        description = `Last transfer ${Math.round(years)} years ago`;
      } else {
        points = 0;
        description = `Recent transfer (${Math.round(years)} years ago)`;
      }
    }
  }

  return { name: "Transfer Recency", points, maxPoints: max, description };
}

function scoreTaxAnomaly(parcel: RealieParcel): SellerFactor {
  const max = WEIGHTS.taxAnomaly;
  let points = 0;
  const assessed = parcel.totalAssessedValue;
  const market = parcel.modelValue || parcel.totalMarketValue;
  let description = assessed && market ? "Tax assessment normal" : "No tax assessment data available";

  if (assessed && market) {
    const ratio = assessed / market;
    // If assessed value is significantly below market, owner may be unaware of
    // property's true value — or may benefit from selling before reassessment
    if (ratio < 0.4) {
      points = max;
      description = `Assessed at ${Math.round(ratio * 100)}% of market value — significant gap`;
    } else if (ratio < 0.6) {
      points = 3;
      description = `Assessed at ${Math.round(ratio * 100)}% of market value`;
    }
  }

  return { name: "Tax Assessment Gap", points, maxPoints: max, description };
}

function scoreMarketTrend(parcel: RealieParcel): SellerFactor {
  const max = WEIGHTS.marketTrend;
  let points = 0;
  let description = "No market data available";

  const trend = parcel.marketPriceTrend;
  const dom = parcel.marketAvgDaysOnMarket;

  if (trend != null) {
    if (trend < -5) {
      // Declining market — sellers may want to exit before further drops
      points = max;
      description = `Declining market (${trend.toFixed(1)}% price trend) — urgency to sell`;
    } else if (trend < 0) {
      points = 3;
      description = `Softening market (${trend.toFixed(1)}% price trend)`;
    } else if (dom != null && dom > 60) {
      // Rising prices but high DOM means stale listings — sellers may be motivated
      points = 2;
      description = `High days on market (${Math.round(dom)} avg) despite rising prices`;
    } else {
      points = 0;
      description = `Appreciating market (+${trend.toFixed(1)}%) — sellers less motivated`;
    }
  } else if (dom != null && dom > 90) {
    points = 3;
    description = `Very high avg days on market (${Math.round(dom)})`;
  }

  return { name: "Market Trend", points, maxPoints: max, description };
}

function scoreOwnerType(parcel: RealieParcel): SellerFactor {
  const max = WEIGHTS.ownerType;
  let points = 0;
  let description = parcel.ownerName
    ? `Individual owner (${parcel.ownerName})`
    : "Individual owner or unknown";

  const type = parcel.ownerType;
  if (type) {
    if (type === "Estate") {
      points = max;
      description = "Estate-owned — heirs often motivated to sell";
    } else if (type === "Bank/REO") {
      points = max;
      description = "Bank/REO-owned — lender liquidation likely";
    } else if (type === "Trust") {
      points = 4;
      description = "Trust-owned — may indicate estate planning or investor";
    } else if (type === "Corporate" || type === "Organization") {
      points = 3;
      description = "Entity-owned — investor or corporate holding";
    } else if (type === "Individual" && parcel.ownerName) {
      description = `Individual owner (${parcel.ownerName})`;
    }
  } else {
    // Check buyerIDCode from Realie data
    const bic = parcel.buyerIDCode;
    if (bic === "TR") {
      points = 4;
      description = "Trust (buyer ID) — estate planning or investor";
    } else if (bic === "CO" || bic === "CP") {
      points = 3;
      description = "Corporate buyer — investor holding";
    }
  }

  return { name: "Owner Type", points, maxPoints: max, description };
}

function scoreTaxTrend(parcel: RealieParcel): SellerFactor {
  const max = WEIGHTS.taxTrend;
  let points = 0;
  let description = "No multi-year tax data available";

  // Use pre-computed trend from mapping, or compute from Realie assessments array
  let annualGrowth = parcel.taxAssessmentTrendPct;

  if (annualGrowth == null && parcel.assessments && parcel.assessments.length >= 2) {
    const sorted = [...parcel.assessments]
      .filter((a) => a.assessedYear && a.totalAssessedValue)
      .sort((a, b) => (a.assessedYear || 0) - (b.assessedYear || 0));
    if (sorted.length >= 2) {
      const oldest = sorted[0];
      const newest = sorted[sorted.length - 1];
      const span = (newest.assessedYear || 0) - (oldest.assessedYear || 0);
      if (span > 0 && oldest.totalAssessedValue && oldest.totalAssessedValue > 0 && newest.totalAssessedValue) {
        const totalGrowth = ((newest.totalAssessedValue - oldest.totalAssessedValue) / oldest.totalAssessedValue) * 100;
        annualGrowth = totalGrowth / span;
      }
    }
  }

  if (annualGrowth != null) {
    if (annualGrowth > 10) {
      points = max;
      description = `Rapidly rising assessments (+${annualGrowth.toFixed(1)}%/yr) — increasing tax burden`;
    } else if (annualGrowth > 6) {
      points = 3;
      description = `Rising assessments (+${annualGrowth.toFixed(1)}%/yr)`;
    } else if (annualGrowth > 3) {
      points = 1;
      description = `Moderate assessment growth (+${annualGrowth.toFixed(1)}%/yr)`;
    } else {
      description = `Stable assessments (+${annualGrowth.toFixed(1)}%/yr)`;
    }
  }

  return { name: "Tax Trend", points, maxPoints: max, description };
}

function scoreAppreciation(parcel: RealieParcel): SellerFactor {
  const max = WEIGHTS.appreciation;
  let points = 0;
  let description = "No appreciation data available";

  // Use pre-computed appreciation from mapping
  let pct = parcel.appreciationPct;

  // If not pre-computed, try to derive from purchase price vs model value
  if (pct == null && parcel.purchasePrice && parcel.purchasePrice > 0) {
    const currentVal = parcel.modelValue || parcel.totalMarketValue;
    if (currentVal && currentVal !== parcel.purchasePrice) {
      pct = ((currentVal - parcel.purchasePrice) / parcel.purchasePrice) * 100;
    }
  }

  if (pct != null) {
    if (pct > 100) {
      points = max;
      description = `Major appreciation (+${Math.round(pct)}%) — significant equity to unlock`;
    } else if (pct > 50) {
      points = 3;
      description = `Strong appreciation (+${Math.round(pct)}%)`;
    } else if (pct > 20) {
      points = 1;
      description = `Moderate appreciation (+${Math.round(pct)}%)`;
    } else if (pct < -10) {
      // Negative equity / underwater — different kind of motivation
      points = 2;
      description = `Depreciated (${Math.round(pct)}%) — may want to exit`;
    } else {
      description = `Minimal appreciation (+${Math.round(pct)}%)`;
    }
  }

  return { name: "Appreciation", points, maxPoints: max, description };
}

function scoreHoaBurden(parcel: RealieParcel): SellerFactor {
  const max = WEIGHTS.hoaBurden;
  let points = 0;
  let description = "No HOA or unknown";

  const hoa = parcel.hoaFee;
  if (hoa && hoa > 0) {
    // Check if absentee — HOA burden is more significant for non-occupants
    const isAbsentee = parcel.ownerOccupied === false ||
      (parcel.ownerState && parcel.state &&
       parcel.ownerState.toUpperCase() !== parcel.state.toUpperCase());

    if (hoa >= 800) {
      points = isAbsentee ? max : 3;
      description = isAbsentee
        ? `High HOA ($${hoa}/mo) + absentee — costly to hold`
        : `High HOA ($${hoa}/mo)`;
    } else if (hoa >= 500) {
      points = isAbsentee ? 3 : 2;
      description = isAbsentee
        ? `Moderate HOA ($${hoa}/mo) + absentee`
        : `Moderate HOA ($${hoa}/mo)`;
    } else if (hoa >= 300) {
      points = isAbsentee ? 2 : 1;
      description = `HOA $${hoa}/mo${isAbsentee ? " + absentee" : ""}`;
    } else {
      description = `Low HOA ($${hoa}/mo)`;
    }
  }

  return { name: "HOA Burden", points, maxPoints: max, description };
}

// ── Main Scoring Function ──────────────────────────────────────────────────

export function calculateSellerMotivationScore(parcel: RealieParcel): SellerScore {
  const factors: SellerFactor[] = [
    scoreEquity(parcel),
    scoreOwnershipDuration(parcel),
    scoreAbsentee(parcel),
    scoreDistress(parcel),
    scorePortfolio(parcel),
    scoreTransferRecency(parcel),
    scoreTaxAnomaly(parcel),
    scoreMarketTrend(parcel),
    scoreOwnerType(parcel),
    scoreTaxTrend(parcel),
    scoreAppreciation(parcel),
    scoreHoaBurden(parcel),
  ];

  const rawScore = factors.reduce((sum, f) => sum + f.points, 0);

  // Normalize the score based on achievable points. When data sources like
  // Realie are unavailable, factors such as Equity (15), Distress (12), and
  // Portfolio (8) are impossible to earn — their data simply doesn't exist.
  // Without normalization, a property scoring 40/65 achievable points looks
  // like a weak 40/100, when it's actually a strong 62/100 relative to what
  // can be measured. We detect "no data" factors (0 points AND description
  // says "No … available" or "unknown") and exclude their maxPoints from the
  // denominator so scores reflect actual seller motivation signal strength.
  const achievableMax = factors.reduce((sum, f) => {
    const noData = f.points === 0 && /no .* (available|data|unknown)/i.test(f.description);
    return sum + (noData ? 0 : f.maxPoints);
  }, 0);

  // Scale: if only 65 of 100 points are achievable, 40 raw → 62 normalized
  const score = achievableMax > 0
    ? Math.min(Math.round((rawScore / achievableMax) * 100), 100)
    : 0;
  const level = getSellerLevel(score);

  return { score, level, factors };
}

export function getSellerLevel(score: number): SellerLevel {
  if (score >= 70) return "very-likely";
  if (score >= 50) return "likely";
  if (score >= 30) return "possible";
  return "unlikely";
}

export function getSellerColor(level: SellerLevel): string {
  switch (level) {
    case "very-likely":
      return "#ef4444"; // red-500
    case "likely":
      return "#f97316"; // orange-500
    case "possible":
      return "#eab308"; // yellow-500
    case "unlikely":
      return "#3b82f6"; // blue-500
  }
}

export function getSellerLabel(level: SellerLevel): string {
  switch (level) {
    case "very-likely":
      return "Very Likely";
    case "likely":
      return "Likely";
    case "possible":
      return "Possible";
    case "unlikely":
      return "Unlikely";
  }
}

// ── Parcel to ScoredProperty Mapper ────────────────────────────────────────

export function scoreParcel(parcel: RealieParcel): ScoredProperty | null {
  if (!parcel.latitude || !parcel.longitude) return null;

  const { score, level, factors } = calculateSellerMotivationScore(parcel);

  // Determine absentee status
  const ownerAddr = parcel.ownerAddressLine1 || parcel.ownerAddressFull;
  const propAddr = parcel.address;
  let absentee = false;
  if (ownerAddr && propAddr) {
    const isPoBox = /\bp\.?\s*o\.?\s*box\b/i.test(ownerAddr);
    const outOfState =
      parcel.ownerState &&
      parcel.state &&
      parcel.ownerState.toUpperCase() !== parcel.state.toUpperCase();

    if (isPoBox) {
      // Same-area P.O. Box is not absentee; only out-of-state P.O. Box counts
      absentee = !!outOfState;
    } else {
      const normalize = (s: string) =>
        s.toLowerCase().replace(/\bapt\b.*$/i, "").replace(/\b0+(\d)/g, "$1").replace(/[^a-z0-9]/g, "");
      absentee = normalize(ownerAddr) !== normalize(propAddr);
    }
  } else if (parcel.ownerOccupied === false) {
    absentee = true;
  }

  // Calculate ownership years
  let ownershipYears: number | undefined;
  const dateStr = parcel.ownershipStartDate || parcel.transferDate;
  if (dateStr) {
    const formatted =
      dateStr.length === 8
        ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
        : dateStr;
    const d = new Date(formatted);
    if (!isNaN(d.getTime())) {
      ownershipYears = Math.round(((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10;
    }
  }

  return {
    id: parcel._id || parcel.siteId || parcel.parcelId || `${parcel.latitude}-${parcel.longitude}`,
    lat: parcel.latitude,
    lng: parcel.longitude,
    address: parcel.addressFull || parcel.address || "Unknown",
    city: parcel.city,
    state: parcel.state,
    zip: parcel.zipCode,
    score,
    level,
    factors,
    owner: parcel.ownerName,
    equity: parcel.equityCurrentEstBal,
    ltv: parcel.LTVCurrentEstCombined,
    ownershipYears,
    ownerParcelCount: parcel.ownerParcelCount,
    absentee,
    propertyType: parcel.residential ? "Residential" : parcel.condo ? "Condo" : undefined,
    estimatedValue: parcel.modelValue || parcel.totalMarketValue,
    beds: parcel.totalBedrooms,
    baths: parcel.totalBathrooms,
    sqft: parcel.buildingArea,
    yearBuilt: parcel.yearBuilt,
    geometry: parcel.geometry,
    parcelId: parcel.parcelId,
  };
}
