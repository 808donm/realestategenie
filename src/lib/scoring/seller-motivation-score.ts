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
  geometry?: RealieParcel["geometry"];
  parcelId?: string;
};

// ── Scoring Constants ──────────────────────────────────────────────────────

const WEIGHTS = {
  equity: 20,
  ownershipDuration: 20,
  absentee: 15,
  distress: 15,
  portfolio: 10,
  transferRecency: 10,
  taxAnomaly: 10,
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
      points = 15;
      description = `High equity (LTV ${ltv}%) — favorable to sell`;
    } else if (ltv < 70) {
      points = 8;
      description = `Moderate equity (LTV ${ltv}%)`;
    } else {
      points = 3;
      description = `Low equity (LTV ${ltv}%)`;
    }
  } else if (equity != null && parcel.modelValue) {
    const equityPct = Math.round((equity / parcel.modelValue) * 100);
    if (equityPct > 70) {
      points = max;
      description = `Very high equity (${equityPct}% of value)`;
    } else if (equityPct > 50) {
      points = 15;
      description = `High equity (${equityPct}% of value)`;
    } else if (equityPct > 30) {
      points = 8;
      description = `Moderate equity (${equityPct}% of value)`;
    } else {
      points = 3;
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

  // Compare owner address to property address
  const ownerAddr = parcel.ownerAddressLine1 || parcel.ownerAddressFull;
  const propAddr = parcel.address;

  const outOfState =
    parcel.ownerState &&
    parcel.state &&
    parcel.ownerState.toUpperCase() !== parcel.state.toUpperCase();

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
      // P.O. Box in the same state/area is not a reliable absentee signal —
      // many owner-occupants use a P.O. Box for mail. Only flag if out of state.
      if (outOfState) {
        points = max;
        description = `Out-of-state P.O. Box owner (${parcel.ownerState})`;
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
  } else if (parcel.ownerOccupied === false) {
    // Direct signal from RentCast — no address to compare, but API confirms non-owner-occupied
    if (outOfState) {
      points = max;
      description = `Out-of-state absentee owner (${parcel.ownerState})`;
    } else {
      points = 12;
      description = "Non-owner-occupied property";
    }
  }

  return { name: "Absentee Owner", points, maxPoints: max, description };
}

function scoreDistress(parcel: RealieParcel): SellerFactor {
  const max = WEIGHTS.distress;
  let points = 0;
  let description = "No distress signals detected";

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
  let description = "Single-property owner or unknown";

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
  let description = "Tax data normal or unavailable";

  const assessed = parcel.totalAssessedValue;
  const market = parcel.modelValue || parcel.totalMarketValue;

  if (assessed && market) {
    const ratio = assessed / market;
    // If assessed value is significantly below market, owner may be unaware of
    // property's true value — or may benefit from selling before reassessment
    if (ratio < 0.4) {
      points = max;
      description = `Assessed at ${Math.round(ratio * 100)}% of market value — significant gap`;
    } else if (ratio < 0.6) {
      points = 6;
      description = `Assessed at ${Math.round(ratio * 100)}% of market value`;
    }
  }

  return { name: "Tax Assessment Gap", points, maxPoints: max, description };
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
  ];

  const score = Math.min(factors.reduce((sum, f) => sum + f.points, 0), 100);
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
