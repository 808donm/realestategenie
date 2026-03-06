"use client";

import { useState } from "react";
import PropertyDetailModal from "./property-detail-modal.client";
import { buildQPublicUrl } from "@/lib/hawaii-zip-county";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface AttomProperty {
  identifier?: { Id?: number; fips?: string; apn?: string; attomId?: number };
  address?: { oneLine?: string; line1?: string; line2?: string; locality?: string; countrySubd?: string; postal1?: string };
  location?: { latitude?: string; longitude?: string };
  summary?: { propType?: string; propertyType?: string; propSubType?: string; yearBuilt?: number; propLandUse?: string; absenteeInd?: string };
  building?: {
    size?: { bldgSize?: number; livingSize?: number; universalSize?: number };
    rooms?: { beds?: number; bathsFull?: number; bathsHalf?: number; bathsTotal?: number; roomsTotal?: number };
    summary?: { yearBuilt?: number; levels?: number; bldgType?: string; archStyle?: string; quality?: string; storyDesc?: string; unitsCount?: string };
    construction?: { condition?: string; constructionType?: string; roofCover?: string; wallType?: string };
    interior?: { bsmtSize?: number; bsmtType?: string; fplcCount?: number };
    parking?: { garageType?: string; prkgSize?: number; prkgSpaces?: string };
  };
  lot?: { lotSize1?: number; lotSize2?: number; poolInd?: string; siteZoningIdent?: string };
  owner?: {
    owner1?: { fullName?: string; lastName?: string; firstNameAndMi?: string };
    owner2?: { fullName?: string; lastName?: string; firstNameAndMi?: string };
    owner3?: { fullName?: string; lastName?: string; firstNameAndMi?: string };
    owner4?: { fullName?: string; lastName?: string; firstNameAndMi?: string };
    corporateIndicator?: string; absenteeOwnerStatus?: string; mailingAddressOneLine?: string; ownerOccupied?: string;
    ownerRelationshipType?: string; ownerRelationshipRights?: string;
  };
  assessment?: {
    appraised?: { apprTtlValue?: number };
    assessed?: { assdTtlValue?: number; assdImprValue?: number; assdLandValue?: number };
    market?: { mktTtlValue?: number };
    tax?: { taxAmt?: number; taxYear?: number };
    // ATTOM expandedprofile nests owner & mortgage inside assessment
    owner?: AttomProperty["owner"];
    mortgage?: {
      FirstConcurrent?: AttomProperty["mortgage"];
      SecondConcurrent?: AttomProperty["mortgage"];
      title?: { companyName?: string };
    };
  };
  sale?: {
    amount?: { saleAmt?: number; saleTransDate?: string; saleRecDate?: string; saleDocType?: string; saleDocNum?: string; saleTransType?: string; saleCode?: string; saleDisclosureType?: string; salePrice?: number; saleSearchDate?: string };
    calculation?: { pricePerBed?: number; pricePerSizeUnit?: number };
    // ATTOM sometimes places date/amount fields at the sale level too
    saleAmt?: number; salePrice?: number;
    saleTransDate?: string; saleRecDate?: string; saleSearchDate?: string;
  };
  avm?: { amount?: { value?: number; high?: number; low?: number; scr?: number }; eventDate?: string };
  rentalAvm?: { estimatedRentalValue?: number; estimatedMinRentalValue?: number; estimatedMaxRentalValue?: number; confidenceScore?: number; valuationDate?: string;
    rentalAmount?: { value?: number; low?: number; high?: number; scr?: number }; amount?: { value?: number; low?: number; high?: number; scr?: number } };
  homeEquity?: { avmValue?: number; outstandingBalance?: number; equity?: number; equityAmount?: number; loanToValue?: number; ltv?: number;
    avm?: { amount?: { value?: number } }; estimatedValue?: number; loanBalance?: number; mortgageBalance?: number; estimatedBalance?: number };
  // ATTOM expandedprofile nests mortgage under FirstConcurrent/SecondConcurrent
  mortgage?: {
    amount?: number; lender?: { fullName?: string }; term?: string; date?: string;
    FirstConcurrent?: { amount?: number; lender?: { fullName?: string }; term?: string; date?: string; dueDate?: string; loanType?: string;
      borrower1?: { fullName?: string; lastName?: string; firstNameAndMi?: string };
      borrower2?: { fullName?: string; lastName?: string; firstNameAndMi?: string };
      borrowerVesting?: string; borrowerMailFullStreetAddress?: string; borrowerMailCity?: string; borrowerMailState?: string; borrowerMailZip?: string; companyName?: string;
    };
    SecondConcurrent?: { amount?: number; lender?: { fullName?: string }; term?: string; date?: string };
    // Mortgagor (borrower) fields — the borrower IS the property owner
    borrower1?: { fullName?: string; lastName?: string; firstNameAndMi?: string };
    borrower2?: { fullName?: string; lastName?: string; firstNameAndMi?: string };
    borrowerVesting?: string;
    borrowerMailFullStreetAddress?: string; borrowerMailCity?: string; borrowerMailState?: string; borrowerMailZip?: string;
    companyName?: string;
  };
  foreclosure?: { actionType?: string; filingDate?: string; recordingDate?: string; documentType?: string;
    trusteeFullName?: string; defaultAmount?: number; originalLoanAmount?: number; penaltyInterest?: number;
    auctionDate?: string; auctionLocation?: string; startingBid?: number;
    borrowerName?: string; lenderName?: string; caseNumber?: string };
  utilities?: { coolingType?: string; heatingType?: string; sewerType?: string; waterType?: string };
  // Allow unknown keys since ATTOM responses vary by endpoint
  [key: string]: unknown;
}

// ── Data accessor helpers ──────────────────────────────────────────────────
// ATTOM's response format varies by endpoint. These helpers normalize access.

/**
 * Resolve the owner object from a property.
 * ATTOM expandedprofile nests owner inside assessment.owner. The server-side
 * normalizeAttomProperty() promotes it, but as a safety net we also check
 * assessment.owner client-side and merge when the top-level owner is empty.
 */
function resolveOwner(p: AttomProperty): AttomProperty["owner"] | undefined {
  const top = p.owner;
  const nested = p.assessment?.owner;
  const hasTop = top?.owner1?.fullName || top?.owner2?.fullName || top?.owner3?.fullName
    || top?.corporateIndicator || (top?.mailingAddressOneLine && top.mailingAddressOneLine.trim());
  if (hasTop) return top;
  if (nested) return { ...top, ...nested };
  return top;
}

/** Get the mortgage balance — checks both direct and FirstConcurrent nesting */
function getMortgageAmount(p: AttomProperty): number | null {
  if (typeof p.mortgage?.amount === "number" && p.mortgage.amount > 0) return p.mortgage.amount;
  const fc = p.mortgage?.FirstConcurrent;
  if (fc?.amount != null && fc.amount > 0) return fc.amount;
  const sc = p.mortgage?.SecondConcurrent;
  if (sc?.amount != null && sc.amount > 0) return sc.amount;
  return null;
}

/** Get the mortgage lender (mortgagee) name */
function getMortgageLender(p: AttomProperty): string | null {
  return p.mortgage?.lender?.fullName || p.mortgage?.FirstConcurrent?.lender?.fullName || null;
}

/**
 * Get the mortgagor (borrower) name from the mortgage record.
 * The mortgagor IS the property owner — they're the one who took the loan.
 * Checks borrower1/borrower2 fields, then falls back to borrowerVesting.
 */
function getMortgagorName(p: AttomProperty): string | null {
  return p.mortgage?.borrower1?.fullName
    || p.mortgage?.FirstConcurrent?.borrower1?.fullName
    || p.mortgage?.borrower2?.fullName
    || p.mortgage?.FirstConcurrent?.borrower2?.fullName
    || p.mortgage?.borrowerVesting
    || p.mortgage?.FirstConcurrent?.borrowerVesting
    || null;
}

/**
 * Get the mortgagor (borrower) mailing address from the mortgage record.
 * Assembles a single-line address from the borrower mailing fields.
 */
function getMortgagorAddress(p: AttomProperty): string | null {
  const m = p.mortgage;
  const fc = m?.FirstConcurrent;
  const street = m?.borrowerMailFullStreetAddress || fc?.borrowerMailFullStreetAddress;
  if (!street) return null;
  const city = m?.borrowerMailCity || fc?.borrowerMailCity || "";
  const state = m?.borrowerMailState || fc?.borrowerMailState || "";
  const zip = m?.borrowerMailZip || fc?.borrowerMailZip || "";
  return [street, city, state, zip].filter(Boolean).join(", ");
}

/** Get the sale amount — checks multiple possible field locations */
function getSaleAmount(p: AttomProperty): number | null {
  return p.sale?.amount?.saleAmt ?? p.sale?.amount?.salePrice ?? p.sale?.saleAmt ?? p.sale?.salePrice ?? null;
}

/** Get the sale/transaction date string — checks multiple possible locations */
function getSaleDateStr(p: AttomProperty): string | null {
  return p.sale?.amount?.saleTransDate ?? p.sale?.amount?.saleRecDate ?? p.sale?.amount?.saleSearchDate
    ?? p.sale?.saleTransDate ?? p.sale?.saleRecDate ?? p.sale?.saleSearchDate ?? null;
}

/**
 * Get the owner name — falls back to mortgagor (borrower) when owner fields
 * are empty. The mortgagor is the property owner who took the loan.
 */
function getOwnerName(p: AttomProperty): string | null {
  const owner = resolveOwner(p);
  return owner?.owner1?.fullName || owner?.owner2?.fullName || owner?.owner3?.fullName
    || getMortgagorName(p) || null;
}

/** Check whether the displayed owner name is derived from the mortgagor (borrower) */
function isOwnerFromMortgage(p: AttomProperty): boolean {
  const owner = resolveOwner(p);
  return !owner?.owner1?.fullName && !owner?.owner2?.fullName && !owner?.owner3?.fullName && !!getMortgagorName(p);
}

/**
 * Get the best mailing address — falls back to mortgagor address when
 * the owner mailing address is missing.
 */
function getMailingAddress(p: AttomProperty): string | null {
  const owner = resolveOwner(p);
  const ownerMailing = owner?.mailingAddressOneLine?.trim();
  return ownerMailing || getMortgagorAddress(p) || null;
}

/** Check if a property has any useful contact information (name, address, or mortgagor) */
function hasContactInfo(p: AttomProperty): boolean {
  const owner = resolveOwner(p);
  return !!(
    owner?.owner1?.fullName ||
    owner?.owner2?.fullName ||
    owner?.owner3?.fullName ||
    (owner?.mailingAddressOneLine && owner.mailingAddressOneLine.trim()) ||
    getMortgagorName(p) ||
    getMortgagorAddress(p)
  );
}

/**
 * Get the best available property value estimate.
 * ATTOM's expandedprofile endpoint does NOT return AVM data for postal code
 * area searches. We fall back through assessment values which ARE returned:
 *   AVM → market value → appraised value → assessed value
 */
function getPropertyValue(p: AttomProperty): number | null {
  if (p.avm?.amount?.value != null && p.avm.amount.value > 0) return p.avm.amount.value;
  if (p.assessment?.market?.mktTtlValue != null && p.assessment.market.mktTtlValue > 0) return p.assessment.market.mktTtlValue;
  if (p.assessment?.appraised?.apprTtlValue != null && p.assessment.appraised.apprTtlValue > 0) return p.assessment.appraised.apprTtlValue;
  if (p.assessment?.assessed?.assdTtlValue != null && p.assessment.assessed.assdTtlValue > 0) return p.assessment.assessed.assdTtlValue;
  return null;
}

/**
 * Resolve rental AVM data from an ATTOM property.
 * The /valuation/rentalavm endpoint returns data nested under various keys.
 * Returns a normalized rental AVM object or null if no data is available.
 */
function resolveRentalAvm(p: AttomProperty): AttomProperty["rentalAvm"] | null {
  if (p.rentalAvm) return p.rentalAvm;
  // ATTOM sometimes uses different casing / key names
  const r = (p as any).rentalAVM || (p as any).rentalavm || (p as any).rental_avm;
  if (r) return r;
  return null;
}

/**
 * Get the estimated monthly rent from rental AVM data.
 */
function getRentalValue(p: AttomProperty): number | null {
  const r = resolveRentalAvm(p);
  if (!r) return null;
  return r.estimatedRentalValue ?? r.rentalAmount?.value ?? r.amount?.value ?? null;
}

/**
 * Resolve home equity data from a property.
 * Realie provides pre-calculated equity/LTV mapped to homeEquity in the ATTOM shape.
 */
function resolveHomeEquity(p: AttomProperty): AttomProperty["homeEquity"] | null {
  if (p.homeEquity) return p.homeEquity;
  const he = (p as any).homeequity || (p as any).home_equity || (p as any).valuation;
  if (he) return he;
  return null;
}

/**
 * Get the estimated equity from property data.
 * Uses Realie's pre-calculated equityCurrentEstBal when available,
 * otherwise calculates from AVM - mortgage balance.
 */
function getEquityFromValuation(p: AttomProperty): number | null {
  const he = resolveHomeEquity(p);
  if (he) {
    if (he.equity != null) return he.equity;
    if (he.equityAmount != null) return he.equityAmount;
    const avmValue = he.avmValue ?? he.avm?.amount?.value ?? he.estimatedValue;
    const balance = he.outstandingBalance ?? he.loanBalance ?? he.mortgageBalance ?? he.estimatedBalance;
    if (avmValue != null && balance != null) return avmValue - balance;
  }
  // Fallback: calculate from AVM and mortgage balance
  const avmVal = getPropertyValue(p);
  const mortgageAmt = getMortgageAmount(p);
  if (avmVal != null && mortgageAmt != null) return avmVal - mortgageAmt;
  return null;
}

/**
 * Get the LTV percentage from property data.
 * Uses Realie's pre-calculated LTVCurrentEstCombined when available,
 * otherwise calculates from mortgage / AVM.
 */
function getLtvPct(p: AttomProperty): number | null {
  const he = resolveHomeEquity(p);
  if (he?.ltv != null) return he.ltv;
  const mortgageAmt = getMortgageAmount(p);
  const avmVal = getPropertyValue(p);
  if (mortgageAmt != null && avmVal != null && avmVal > 0) return (mortgageAmt / avmVal) * 100;
  return null;
}

type ProspectMode = "absentee" | "equity" | "foreclosure" | "radius" | "investor";

const PROPERTY_TYPES = [
  { value: "SFR", label: "Single Family" },
  { value: "CONDO", label: "Condo" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "MOBILE", label: "Mobile Home" },
];

/**
 * Detect absentee ownership from ATTOM property data.
 * ATTOM uses several fields with varying formats:
 *  - summary.absenteeInd: "ABSENTEE OWNER", "A", "OWNER OCCUPIED", "O", etc.
 *  - owner.absenteeOwnerStatus: "Absentee", "Owner Occupied", etc.
 *  - owner.ownerOccupied: "Y" / "N"
 */
function isAbsenteeOwner(p: AttomProperty): boolean {
  const owner = resolveOwner(p);
  const ind = (p.summary?.absenteeInd || "").toUpperCase();
  const status = (owner?.absenteeOwnerStatus || "").toUpperCase();
  const occupied = (owner?.ownerOccupied || "").toUpperCase();

  // absenteeInd: "ABSENTEE OWNER", "ABSENTEE", or single-char "A"
  if (ind.includes("ABSENTEE") || ind === "A") return true;
  // absenteeOwnerStatus: "Absentee", "Absentee Owner", etc.
  if (status.includes("ABSENTEE")) return true;
  // ownerOccupied: "N", "0", "NO", "FALSE" means not owner-occupied (= absentee)
  if (occupied === "N" || occupied === "0" || occupied === "NO" || occupied === "FALSE") return true;

  return false;
}

/**
 * Detect financial distress signals from ATTOM expanded profile data.
 *
 * The expandedprofile endpoint does NOT return the `foreclosure` object —
 * that data lives in dedicated ATTOM endpoints (preforeclosure/detail,
 * saleshistory/expandedhistory) which don't support area-based searches.
 *
 * Instead we identify distress from mortgage/AVM/assessment data that IS returned:
 *  - Underwater: mortgage balance exceeds AVM value
 *  - High LTV: mortgage >= 80% of AVM (at-risk)
 *  - Assessment drop: market value below assessed total (tax pressure)
 */
interface DistressSignals {
  isDistressed: boolean;
  isUnderwater: boolean;
  highLtv: boolean;
  ltvPct: number | null;
  mortgageAmount: number | null;
  avmValue: number | null;
  assessmentDrop: boolean;
  negativeAppreciation: boolean;
  minimalAppreciation: boolean;
}

function getDistressSignals(p: AttomProperty): DistressSignals {
  const mortgageAmount = getMortgageAmount(p);
  // Use getPropertyValue() which falls back from AVM → assessment values
  const avmValue = getPropertyValue(p);
  const assdTotal = p.assessment?.assessed?.assdTtlValue ?? null;
  const mktTotal = p.assessment?.market?.mktTtlValue ?? null;
  const saleAmount = getSaleAmount(p);

  // Use Realie's pre-calculated LTV when available, otherwise calculate
  const ltvPct = getLtvPct(p);
  const isUnderwater = ltvPct != null ? ltvPct > 100 : false;
  const highLtv = ltvPct != null ? ltvPct >= 80 : false;

  // Assessment drop: market value less than 95% of assessed value → tax overpayment pressure
  // (Broadened from 90% to 95% to catch more borderline cases)
  const assessmentDrop = (mktTotal != null && assdTotal != null && assdTotal > 0)
    ? mktTotal < assdTotal * 0.95
    : false;

  // Negative appreciation: current value is LESS than what the owner paid
  // (Property lost value since purchase — owner may be motivated to sell)
  const negativeAppreciation = (saleAmount != null && saleAmount > 0 && avmValue != null && avmValue > 0)
    ? avmValue < saleAmount
    : false;

  // Minimal appreciation: owned 10+ years but less than 20% total appreciation
  // (Stagnant investment — owner has tied up capital with minimal return)
  let minimalAppreciation = false;
  if (saleAmount != null && saleAmount > 0 && avmValue != null && avmValue > 0) {
    const ownershipDate = getOwnershipDate(p);
    if (ownershipDate) {
      const yearsOwned = (Date.now() - ownershipDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (yearsOwned >= 10) {
        const totalAppreciation = ((avmValue - saleAmount) / saleAmount) * 100;
        minimalAppreciation = totalAppreciation < 20;
      }
    }
  }

  const isDistressed = isUnderwater || highLtv || assessmentDrop || negativeAppreciation || minimalAppreciation;

  return { isDistressed, isUnderwater, highLtv, ltvPct, mortgageAmount, avmValue, assessmentDrop, negativeAppreciation, minimalAppreciation };
}

/**
 * Parse a date string in various formats ATTOM may return:
 *  - "2015-06-02" (ISO)
 *  - "06/02/2015" (US MM/DD/YYYY)
 *  - "2015/06/02"
 *  - "6/2/2015"
 * Returns null if unparseable.
 */
function parseDate(s: string | undefined | null): Date | null {
  if (!s || typeof s !== "string") return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  // Reject clearly invalid dates (NaN, year 0, or dates before 1900)
  if (isNaN(d.getTime()) || d.getFullYear() < 1900) return null;
  return d;
}

/**
 * Extract the best available ownership/purchase date from ATTOM property data.
 * Uses getSaleDateStr() for sale dates, then falls back to mortgage origination.
 */
function getOwnershipDate(p: AttomProperty): Date | null {
  const saleDateStr = getSaleDateStr(p);
  if (saleDateStr) {
    const d = parseDate(saleDateStr);
    if (d) return d;
  }
  // Fallback: mortgage origination date ≈ purchase date
  return (
    parseDate(p.mortgage?.date) ||
    parseDate(p.mortgage?.FirstConcurrent?.date) ||
    null
  );
}

// ── Investor grouping helpers ──────────────────────────────────────────────

interface InvestorGroup {
  ownerName: string;
  mailingAddress: string;
  isCorporate: boolean;
  properties: AttomProperty[];
  totalTaxBurden: number;
  totalAvmValue: number;
  totalRentalIncome: number;
  totalEquity: number | null;
  oldestYearBuilt: number | null;
  avgYearBuilt: number | null;
}

/**
 * Normalize an owner name for grouping/matching.
 * Strips corporate suffixes, punctuation, extra whitespace, and handles
 * "LAST, FIRST" vs "FIRST LAST" formats so the same investor entity
 * matches regardless of how ATTOM records the name.
 */
function normalizeOwnerName(name: string): string {
  let n = name.toLowerCase().trim();

  // Strip common corporate/trust suffixes (order matters — longest first)
  const suffixes = [
    "limited liability company", "limited liability co",
    "living trust", "family trust", "revocable trust", "irrevocable trust",
    "l\\.?l\\.?c\\.?", "inc\\.?", "corp\\.?", "llp\\.?", "lp\\.?",
    "ltd\\.?", "co\\.?", "trust", "trustees?", "etal", "et al\\.?",
    "partnership", "associates?", "enterprises?", "holdings?", "properties",
    "investments?", "ventures?", "group", "company", "management",
  ];
  for (const suffix of suffixes) {
    n = n.replace(new RegExp(`[,\\s]+${suffix}\\s*$`, "i"), "");
    n = n.replace(new RegExp(`\\b${suffix}\\b`, "i"), "");
  }

  // Strip punctuation (periods, commas, apostrophes, hyphens → space)
  n = n.replace(/[.,'''`\-]/g, " ");

  // Collapse multiple spaces
  n = n.replace(/\s+/g, " ").trim();

  // Handle "LAST, FIRST" → "FIRST LAST" for consistent matching
  // Only do this if there's exactly one comma-separated pair
  const commaParts = name.toLowerCase().split(",").map((s) => s.trim());
  if (commaParts.length === 2 && commaParts[0] && commaParts[1]) {
    // Check it looks like "LAST, FIRST" (not "ABC CO, LLC" which we already stripped)
    const secondWord = commaParts[1].split(/\s+/)[0];
    if (secondWord && secondWord.length > 1 && !suffixes.some((s) => secondWord.match(new RegExp(`^${s}$`, "i")))) {
      n = `${commaParts[1]} ${commaParts[0]}`.replace(/[.,'''`\-]/g, " ").replace(/\s+/g, " ").trim();
    }
  }

  return n;
}

function groupByOwner(properties: AttomProperty[]): InvestorGroup[] {
  const groups = new Map<string, AttomProperty[]>();

  for (const p of properties) {
    // Primary: group by normalized owner name
    const ownerName = getOwnerName(p)?.trim();
    if (ownerName) {
      const key = `name:${normalizeOwnerName(ownerName)}`;
      const list = groups.get(key) || [];
      list.push(p);
      groups.set(key, list);

      // Also check owner2/owner3 — an investor may be listed as co-owner
      // on some properties but primary owner on others
      const owner = resolveOwner(p);
      for (const ownerN of [owner?.owner2?.fullName, owner?.owner3?.fullName]) {
        if (ownerN && normalizeOwnerName(ownerN) !== normalizeOwnerName(ownerName)) {
          const altKey = `name:${normalizeOwnerName(ownerN)}`;
          const altList = groups.get(altKey) || [];
          altList.push(p);
          groups.set(altKey, altList);
        }
      }
      continue;
    }

    // Fallback: group by mailing address when owner name is missing.
    // If the mailing address differs from the property address, the owner
    // likely lives elsewhere (investor). Multiple properties sharing the
    // same non-local mailing address = same investor entity.
    const ownerR = resolveOwner(p);
    const mailAddr = ownerR?.mailingAddressOneLine?.trim();
    const propAddr = p.address?.oneLine?.trim();
    if (mailAddr && propAddr && mailAddr.toLowerCase() !== propAddr.toLowerCase()) {
      const key = `mail:${mailAddr.toLowerCase()}`;
      const list = groups.get(key) || [];
      list.push(p);
      groups.set(key, list);
    }
  }

  // Deduplicate: a property might appear in multiple groups (via owner2/owner3).
  // Keep it in the largest group only.
  const propBestGroup = new Map<number, string>(); // attomId → best group key
  for (const [key, props] of groups) {
    for (const p of props) {
      const id = p.identifier?.attomId;
      if (!id) continue;
      const existing = propBestGroup.get(id);
      if (!existing || (groups.get(existing)?.length || 0) < props.length) {
        propBestGroup.set(id, key);
      }
    }
  }
  // Remove properties from non-best groups
  for (const [key, props] of groups) {
    const filtered = props.filter((p) => {
      const id = p.identifier?.attomId;
      return !id || propBestGroup.get(id) === key;
    });
    if (filtered.length > 0) {
      groups.set(key, filtered);
    } else {
      groups.delete(key);
    }
  }

  // Only keep owners with 2+ properties
  const result: InvestorGroup[] = [];
  for (const [key, props] of groups) {
    if (props.length < 2) continue;
    const displayName = getOwnerName(props[0])
      || (key.startsWith("mail:") ? `Unknown Owner (${resolveOwner(props[0])?.mailingAddressOneLine || "Shared Mailing Address"})` : "Unknown");
    const mailingAddress = resolveOwner(props[0])?.mailingAddressOneLine || "";
    const isCorporate = props.some((p) => resolveOwner(p)?.corporateIndicator === "Y");
    const years = props.map((p) => p.building?.summary?.yearBuilt).filter((y): y is number => y != null);

    result.push({
      ownerName: displayName,
      mailingAddress,
      isCorporate,
      properties: props,
      totalTaxBurden: props.reduce((sum, p) => sum + (p.assessment?.tax?.taxAmt || 0), 0),
      totalAvmValue: props.reduce((sum, p) => sum + (getPropertyValue(p) || 0), 0),
      totalRentalIncome: props.reduce((sum, p) => sum + (getRentalValue(p) || 0), 0),
      totalEquity: props.some(p => getEquityFromValuation(p) != null)
        ? props.reduce((sum, p) => sum + (getEquityFromValuation(p) || 0), 0)
        : null,
      oldestYearBuilt: years.length > 0 ? Math.min(...years) : null,
      avgYearBuilt: years.length > 0 ? Math.round(years.reduce((a, b) => a + b, 0) / years.length) : null,
    });
  }

  // Sort by property count (most first)
  return result.sort((a, b) => b.properties.length - a.properties.length);
}

export default function Prospecting() {
  const [mode, setMode] = useState<ProspectMode>("absentee");
  const [zip, setZip] = useState("");
  const [propertyType, setPropertyType] = useState("SFR");

  // Equity-specific
  const [minYearsOwned, setMinYearsOwned] = useState("10");
  const [minAvmValue, setMinAvmValue] = useState("");

  // Radius farming / foreclosure / sales date range
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Radius farming — address-based search
  const [farmAddress, setFarmAddress] = useState("");
  const [farmSearchMode, setFarmSearchMode] = useState<"zip" | "address">("zip");

  // Radius farming radius and reference address
  const [radiusMiles, setRadiusMiles] = useState("0.5");
  const [radiusResults, setRadiusResults] = useState<AttomProperty[]>([]);
  const [radiusLoading, setRadiusLoading] = useState(false);
  const [radiusCenter, setRadiusCenter] = useState<{ address: string; lat: string; lng: string } | null>(null);

  const [results, setResults] = useState<AttomProperty[]>([]);
  const [investorGroups, setInvestorGroups] = useState<InvestorGroup[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [selectedProperty, setSelectedProperty] = useState<AttomProperty | null>(null);
  const [expandedInvestor, setExpandedInvestor] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState("");
  const [salesTrendData, setSalesTrendData] = useState<any>(null);
  const [salesTrendZip, setSalesTrendZip] = useState("");

  // Universal property cache — keyed by attomId, accumulates data from ALL search modes.
  // Every search (radius or not) adds its properties here. Before making supplemental
  // API calls, the fetch loop checks this cache so we never re-fetch data we already have.
  const [propertyCache, setPropertyCache] = useState<Map<number, AttomProperty>>(new Map());
  const [propertyCacheKey, setPropertyCacheKey] = useState(""); // zip:propertyType — cleared on change

  // Shared raw data for non-radius modes — the full result array from the primary endpoint.
  // Since absentee/equity/foreclosure/investor all use the same primary (detailmortgageowner),
  // mode switches just re-filter this array instead of re-fetching.
  const [sharedRawData, setSharedRawData] = useState<AttomProperty[]>([]);
  const [sharedDataKey, setSharedDataKey] = useState("");

  /**
   * Fetch a single page of ATTOM results with the current mode's filters.
   */
  const fetchPage = async (pageNum: number, endpointOverride?: string) => {
    const params = new URLSearchParams();
    params.set("postalcode", zip.trim());
    params.set("propertytype", propertyType);
    params.set("page", String(pageNum));
    params.set("pagesize", String(pageSize));

    if (endpointOverride) {
      params.set("endpoint", endpointOverride);
      // Supplement calls use ATTOM directly — the primary search already
      // got comprehensive data from Realie, so these are just filling gaps.
      // This conserves Realie API tokens.
      params.set("source", "attom");
      // Valuation endpoints don't support pagination — strip page/pagesize
      // (server strips them too, but cleaner to not send them)
      const noPaginationEndpoints = ["rentalavm", "homeequity", "preforeclosure"];
      if (noPaginationEndpoints.includes(endpointOverride)) {
        params.delete("page");
        params.delete("pagesize");
      }
      // These endpoints return ALL properties in the zip — no sale date filters.
      const noSaleDateEndpoints = ["expanded", "avm", "rentalavm", "homeequity", "assessmentsnapshot", "preforeclosure"];
      if (mode === "radius" && startDate && endDate && !noSaleDateEndpoints.includes(endpointOverride)) {
        params.set("startSaleSearchDate", startDate.replace(/-/g, "/"));
        params.set("endSaleSearchDate", endDate.replace(/-/g, "/"));
      }
    } else if (mode === "radius") {
      // Just Sold: primary = sale snapshot (returns recent sales in area)
      params.set("endpoint", "salesnapshot");
      params.set("startSaleSearchDate", startDate.replace(/-/g, "/"));
      params.set("endSaleSearchDate", endDate.replace(/-/g, "/"));
    } else {
      // ALL other modes: use detailmortgageowner as primary.
      // Returns owner names, mailing addresses, corporate indicators, AND
      // mortgage data. Supplemented with expandedprofile for assessment/AVM
      // and detailowner for additional owner data.
      params.set("endpoint", "detailmortgageowner");
    }

    const res = await fetch(`/api/integrations/attom/property?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to fetch data");
    }

    return data;
  };

  /**
   * Search for nearby properties around a lat/lng point using detailmortgageowner.
   * Used for "Just Sold Farming" secondary radius search.
   */
  const handleRadiusSearch = async (lat: string, lng: string, address: string) => {
    setRadiusLoading(true);
    setRadiusCenter({ address, lat, lng });
    setRadiusResults([]);
    try {
      const params = new URLSearchParams();
      params.set("latitude", lat);
      params.set("longitude", lng);
      params.set("radius", radiusMiles);
      params.set("propertytype", propertyType);
      params.set("page", "1");
      params.set("pagesize", String(pageSize));
      params.set("endpoint", "detailmortgageowner");

      const res = await fetch(`/api/integrations/attom/property?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Radius search failed");

      const baseProps: AttomProperty[] = data.property || [];

      const { enriched, needsRentalAvm, needsExpanded, needsOwner } = enrichFromCache(baseProps, propertyCache);

      // Fetch supplements for gaps in the data
      const suppFetches: Promise<any>[] = [];
      if (needsExpanded || needsOwner) {
        const expParams = new URLSearchParams(params);
        expParams.set("endpoint", "expanded");
        expParams.set("source", "attom");
        suppFetches.push(fetch(`/api/integrations/attom/property?${expParams.toString()}`).then(r => r.json()).catch(() => ({ property: [] })));
      }
      if (needsRentalAvm) {
        const rentalParams = new URLSearchParams(params);
        rentalParams.set("endpoint", "rentalavm");
        rentalParams.set("source", "attom");
        rentalParams.delete("page");
        rentalParams.delete("pagesize");
        suppFetches.push(fetch(`/api/integrations/attom/property?${rentalParams.toString()}`).then(r => r.json()).catch(() => ({ property: [] })));
      }

      let merged: AttomProperty[];
      if (suppFetches.length > 0) {
        const suppResults = await Promise.all(suppFetches);
        const suppArrays = suppResults.map((r: any) => (r.property || []) as AttomProperty[]).filter(a => a.length > 0);
        merged = suppArrays.length > 0 ? mergeSupplementalData(enriched, suppArrays) : enriched;
      } else {
        merged = enriched;
      }

      // Contribute to universal cache
      addToPropertyCache(merged);
      setRadiusResults(merged);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Radius search failed");
    } finally {
      setRadiusLoading(false);
    }
  };

  /**
   * Merge supplemental property data into the base array.
   * Matches by attomId first, then by address as fallback.
   * Only fills in fields that are missing from the base data.
   */
  const mergeSupplementalData = (
    base: AttomProperty[],
    supplements: AttomProperty[][]
  ): AttomProperty[] => {
    // Build lookup maps from all supplement arrays
    const byId = new Map<number, AttomProperty>();
    const byAddr = new Map<string, AttomProperty>();

    for (const suppList of supplements) {
      for (const s of suppList) {
        const id = s.identifier?.attomId;
        if (id) {
          const existing = byId.get(id);
          byId.set(id, existing ? { ...existing, ...s } : s);
        }
        const addr = s.address?.oneLine?.toLowerCase().trim();
        if (addr) {
          const existing = byAddr.get(addr);
          byAddr.set(addr, existing ? { ...existing, ...s } : s);
        }
      }
    }

    return base.map((p) => {
      const id = p.identifier?.attomId;
      const addr = p.address?.oneLine?.toLowerCase().trim();
      const supp = (id ? byId.get(id) : null) || (addr ? byAddr.get(addr) : null);
      if (!supp) return p;

      // Deep-merge owner data: supplement fills in any fields the base is missing.
      // The base expandedprofile often returns a partial owner (just a name) while
      // detailmortgageowner/detailowner returns full owner info (mailing address,
      // corporate indicator, occupancy status). We must merge, not choose one or the other.
      // Also check assessment.owner as ATTOM expandedprofile nests owner there.
      const pOwner = resolveOwner(p);
      const sOwner = resolveOwner(supp);
      const mergedOwner = (pOwner || sOwner) ? {
        owner1: {
          fullName: pOwner?.owner1?.fullName || sOwner?.owner1?.fullName,
          lastName: pOwner?.owner1?.lastName || sOwner?.owner1?.lastName,
          firstNameAndMi: pOwner?.owner1?.firstNameAndMi || sOwner?.owner1?.firstNameAndMi,
        },
        owner2: {
          fullName: pOwner?.owner2?.fullName || sOwner?.owner2?.fullName,
          lastName: pOwner?.owner2?.lastName || sOwner?.owner2?.lastName,
          firstNameAndMi: pOwner?.owner2?.firstNameAndMi || sOwner?.owner2?.firstNameAndMi,
        },
        owner3: {
          fullName: pOwner?.owner3?.fullName || sOwner?.owner3?.fullName,
          lastName: pOwner?.owner3?.lastName || sOwner?.owner3?.lastName,
          firstNameAndMi: pOwner?.owner3?.firstNameAndMi || sOwner?.owner3?.firstNameAndMi,
        },
        owner4: {
          fullName: pOwner?.owner4?.fullName || sOwner?.owner4?.fullName,
          lastName: pOwner?.owner4?.lastName || sOwner?.owner4?.lastName,
          firstNameAndMi: pOwner?.owner4?.firstNameAndMi || sOwner?.owner4?.firstNameAndMi,
        },
        corporateIndicator: pOwner?.corporateIndicator || sOwner?.corporateIndicator,
        mailingAddressOneLine: pOwner?.mailingAddressOneLine || sOwner?.mailingAddressOneLine,
        absenteeOwnerStatus: pOwner?.absenteeOwnerStatus || sOwner?.absenteeOwnerStatus,
        ownerOccupied: pOwner?.ownerOccupied || sOwner?.ownerOccupied,
        ownerRelationshipType: pOwner?.ownerRelationshipType || sOwner?.ownerRelationshipType,
        ownerRelationshipRights: pOwner?.ownerRelationshipRights || sOwner?.ownerRelationshipRights,
      } : pOwner;

      // Deep-merge sale data: supplement fills in missing sale fields
      const mergedSale = (p.sale || supp.sale) ? {
        amount: {
          saleAmt: p.sale?.amount?.saleAmt || supp.sale?.amount?.saleAmt,
          salePrice: p.sale?.amount?.salePrice || supp.sale?.amount?.salePrice,
          saleTransDate: p.sale?.amount?.saleTransDate || supp.sale?.amount?.saleTransDate,
          saleRecDate: p.sale?.amount?.saleRecDate || supp.sale?.amount?.saleRecDate,
          saleDocType: p.sale?.amount?.saleDocType || supp.sale?.amount?.saleDocType,
          saleDocNum: p.sale?.amount?.saleDocNum || supp.sale?.amount?.saleDocNum,
          saleTransType: p.sale?.amount?.saleTransType || supp.sale?.amount?.saleTransType,
          saleCode: p.sale?.amount?.saleCode || supp.sale?.amount?.saleCode,
          saleDisclosureType: p.sale?.amount?.saleDisclosureType || supp.sale?.amount?.saleDisclosureType,
        },
        calculation: {
          pricePerBed: p.sale?.calculation?.pricePerBed || supp.sale?.calculation?.pricePerBed,
          pricePerSizeUnit: p.sale?.calculation?.pricePerSizeUnit || supp.sale?.calculation?.pricePerSizeUnit,
        },
        // Preserve any extra sale fields from either source
        ...(supp.sale || {}),
        ...(p.sale || {}),
      } : p.sale;

      // Deep-merge summary: preserve absenteeInd and other fields from supplement
      const mergedSummary = (p.summary || supp.summary) ? {
        ...supp.summary,
        ...p.summary,
        // Explicitly preserve absenteeInd from whichever source has it
        absenteeInd: p.summary?.absenteeInd || supp.summary?.absenteeInd,
      } : p.summary;

      return {
        ...p,
        // Use deep-merged summary so absenteeInd is not lost
        summary: mergedSummary,
        // Use deep-merged owner data so no supplemental fields are lost
        owner: mergedOwner,
        // Use deep-merged sale data so no supplemental fields are lost
        sale: mergedSale,
        // Fill in missing AVM data from supplement
        avm: p.avm?.amount?.value ? p.avm : (supp.avm?.amount?.value ? supp.avm : p.avm),
        // Deep-merge mortgage data: preserve both financial and mortgagor fields from either source
        mortgage: (p.mortgage || supp.mortgage) ? {
          ...(supp.mortgage || {}),
          ...(p.mortgage || {}),
          // Ensure mortgagor (borrower) fields are preserved from supplement if base lacks them
          borrower1: p.mortgage?.borrower1?.fullName ? p.mortgage.borrower1 : (supp.mortgage as any)?.borrower1 || p.mortgage?.borrower1,
          borrower2: p.mortgage?.borrower2?.fullName ? p.mortgage.borrower2 : (supp.mortgage as any)?.borrower2 || p.mortgage?.borrower2,
          borrowerVesting: p.mortgage?.borrowerVesting || (supp.mortgage as any)?.borrowerVesting,
          borrowerMailFullStreetAddress: p.mortgage?.borrowerMailFullStreetAddress || (supp.mortgage as any)?.borrowerMailFullStreetAddress,
          borrowerMailCity: p.mortgage?.borrowerMailCity || (supp.mortgage as any)?.borrowerMailCity,
          borrowerMailState: p.mortgage?.borrowerMailState || (supp.mortgage as any)?.borrowerMailState,
          borrowerMailZip: p.mortgage?.borrowerMailZip || (supp.mortgage as any)?.borrowerMailZip,
          // Preserve FirstConcurrent with deep merge for its borrower fields too
          FirstConcurrent: (p.mortgage?.FirstConcurrent || (supp.mortgage as any)?.FirstConcurrent) ? {
            ...((supp.mortgage as any)?.FirstConcurrent || {}),
            ...(p.mortgage?.FirstConcurrent || {}),
            borrower1: p.mortgage?.FirstConcurrent?.borrower1?.fullName ? p.mortgage.FirstConcurrent.borrower1 : (supp.mortgage as any)?.FirstConcurrent?.borrower1,
            borrower2: p.mortgage?.FirstConcurrent?.borrower2?.fullName ? p.mortgage.FirstConcurrent.borrower2 : (supp.mortgage as any)?.FirstConcurrent?.borrower2,
            borrowerVesting: p.mortgage?.FirstConcurrent?.borrowerVesting || (supp.mortgage as any)?.FirstConcurrent?.borrowerVesting,
            borrowerMailFullStreetAddress: p.mortgage?.FirstConcurrent?.borrowerMailFullStreetAddress || (supp.mortgage as any)?.FirstConcurrent?.borrowerMailFullStreetAddress,
            borrowerMailCity: p.mortgage?.FirstConcurrent?.borrowerMailCity || (supp.mortgage as any)?.FirstConcurrent?.borrowerMailCity,
            borrowerMailState: p.mortgage?.FirstConcurrent?.borrowerMailState || (supp.mortgage as any)?.FirstConcurrent?.borrowerMailState,
            borrowerMailZip: p.mortgage?.FirstConcurrent?.borrowerMailZip || (supp.mortgage as any)?.FirstConcurrent?.borrowerMailZip,
          } : p.mortgage?.FirstConcurrent,
        } : p.mortgage,
        // Fill in missing assessment data from supplement (take richer data)
        assessment: p.assessment?.assessed?.assdTtlValue ? p.assessment : (supp.assessment?.assessed?.assdTtlValue ? supp.assessment : p.assessment),
        // Fill in rental AVM data from supplement (from /valuation/rentalavm)
        rentalAvm: resolveRentalAvm(p) || resolveRentalAvm(supp) || undefined,
        // Fill in home equity data from supplement (from /valuation/homeequity)
        homeEquity: resolveHomeEquity(p) || resolveHomeEquity(supp) || undefined,
        // Fill in foreclosure / pre-foreclosure data from supplement
        foreclosure: p.foreclosure?.actionType ? p.foreclosure : (supp.foreclosure as any)?.actionType ? supp.foreclosure as any : p.foreclosure,
      };
    });
  };

  /**
   * Enrich an array of properties from the universal cache.
   * Returns the enriched properties and flags indicating which supplement
   * endpoints still need to be fetched (true = at least one property on the
   * page is missing that data).
   */
  const enrichFromCache = (
    properties: AttomProperty[],
    cache: Map<number, AttomProperty>
  ): { enriched: AttomProperty[]; needsRentalAvm: boolean; needsExpanded: boolean; needsOwner: boolean } => {
    // Realie provides owner, assessment, AVM, mortgage, and equity data on the
    // primary search response. But when Realie is unavailable and ATTOM is the
    // sole source, the primary endpoint (detailmortgageowner) may lack AVM,
    // assessment, and comprehensive owner data. Detect this and flag supplements.
    if (cache.size === 0) return { enriched: properties, needsRentalAvm: true, needsExpanded: true, needsOwner: true };

    let needsRentalAvm = false;
    let needsExpanded = false;
    let needsOwner = false;

    const enriched = properties.map((p) => {
      const id = p.identifier?.attomId;
      const cached = id ? cache.get(id) : undefined;
      if (!cached) {
        needsRentalAvm = true;
        needsExpanded = true;
        needsOwner = true;
        return p;
      }
      const merged = mergeSupplementalData([p], [[cached]])[0];
      if (!resolveRentalAvm(merged)) needsRentalAvm = true;
      const o = resolveOwner(merged);
      if (!(o?.owner1?.fullName || o?.owner2?.fullName || o?.owner3?.fullName)) needsOwner = true;
      if (!merged.assessment?.assessed?.assdTtlValue && !merged.avm?.amount?.value) needsExpanded = true;
      return merged;
    });

    return { enriched, needsRentalAvm, needsExpanded, needsOwner };
  };

  /**
   * Add properties to the universal cache, merging with any existing entries.
   */
  const addToPropertyCache = (properties: AttomProperty[]) => {
    setPropertyCache((prev) => {
      const next = new Map(prev);
      for (const p of properties) {
        const id = p.identifier?.attomId;
        if (!id) continue;
        const existing = next.get(id);
        if (existing) {
          // Merge new data into existing cached entry
          next.set(id, mergeSupplementalData([existing], [[p]])[0]);
        } else {
          next.set(id, p);
        }
      }
      return next;
    });
  };

  /**
   * Apply mode-specific filtering/sorting to already-fetched raw data.
   * Called both after fresh fetch and on mode switch (instant re-filter).
   */
  const applyModeFilter = (filterMode: ProspectMode, allRaw: AttomProperty[], source?: string) => {
    // Data diagnostics
    const srcLabel = source ? ` [source: ${source}]` : "";
    const withDirectOwner = allRaw.filter((p) => { const o = resolveOwner(p); return o?.owner1?.fullName || o?.owner2?.fullName || o?.owner3?.fullName; }).length;
    const withMortgagor = allRaw.filter((p) => { const o = resolveOwner(p); return !o?.owner1?.fullName && !o?.owner2?.fullName && !o?.owner3?.fullName && !!getMortgagorName(p); }).length;
    const withMailAddr = allRaw.filter((p) => getMailingAddress(p)).length;
    const withContact = allRaw.filter(hasContactInfo).length;
    const withSaleAmt = allRaw.filter((p) => getSaleAmount(p) != null).length;
    const withSaleDate = allRaw.filter((p) => getSaleDateStr(p)).length;
    const withMortgage = allRaw.filter((p) => getMortgageAmount(p) != null).length;
    const withAvm = allRaw.filter((p) => p.avm?.amount?.value != null).length;
    const withValue = allRaw.filter((p) => getPropertyValue(p) != null).length;
    const withAbsentee = allRaw.filter(isAbsenteeOwner).length;

    if (filterMode === "absentee") {
      setDebugInfo(
        `Scanned ${allRaw.length} properties — ${withAbsentee} absentee, ` +
        `${withDirectOwner} with owner names, ${withMortgagor} with mortgagor (via mortgage), ` +
        `${withMailAddr} with mailing addresses, ${withContact} with any contact info, ` +
        `${withValue} with property values, ${withMortgage} with mortgage data` +
        (withContact === 0 && withAbsentee > 0 ? ` (use property addresses for skip tracing or direct mail)` : "") +
        srcLabel
      );

      const matches = allRaw.filter((p) => isAbsenteeOwner(p));
      matches.sort((a, b) => {
        const aHas = hasContactInfo(a) ? 1 : 0;
        const bHas = hasContactInfo(b) ? 1 : 0;
        if (aHas !== bHas) return bHas - aHas;
        return (getPropertyValue(b) || 0) - (getPropertyValue(a) || 0);
      });
      setResults(matches);
      setTotalCount(matches.length);
      setInvestorGroups([]);
    } else if (filterMode === "foreclosure") {
      setDebugInfo(
        `Scanned ${allRaw.length} properties — ${withDirectOwner} with owner names, ${withMortgagor} with mortgagor (via mortgage), ` +
        `${withMailAddr} with mailing addresses, ${withContact} with any contact info, ` +
        `${withSaleAmt} with sale amounts, ${withSaleDate} with sale dates, ${withMortgage} with mortgage data, ` +
        `${withAvm} with AVM, ${withValue} with property values, ${withAbsentee} absentee` + srcLabel
      );

      const matches = allRaw.filter((p) => getDistressSignals(p).isDistressed);
      matches.sort((a, b) => {
        const sa = getDistressSignals(a);
        const sb = getDistressSignals(b);
        if (sa.isUnderwater !== sb.isUnderwater) return sa.isUnderwater ? -1 : 1;
        return (sb.ltvPct ?? 0) - (sa.ltvPct ?? 0);
      });
      setResults(matches);
      setTotalCount(matches.length);
      setInvestorGroups([]);
    } else if (filterMode === "equity") {
      setDebugInfo(
        `Scanned ${allRaw.length} properties — ${withDirectOwner} with owner names, ${withMortgagor} with mortgagor (via mortgage), ` +
        `${withMailAddr} with mailing addresses, ${withContact} with any contact info, ` +
        `${withSaleAmt} with sale amounts, ${withSaleDate} with sale dates, ${withMortgage} with mortgage data, ` +
        `${withAvm} with AVM, ${withValue} with property values, ${withAbsentee} absentee` + srcLabel
      );

      const minYearsVal = parseInt(minYearsOwned, 10) || 10;
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - minYearsVal);
      const minAvm = minAvmValue ? Number(minAvmValue) : 0;

      const matches = allRaw.filter((p) => {
        const propVal = getPropertyValue(p);
        if (!propVal || propVal <= 0) return false;
        if (minAvm > 0 && propVal < minAvm) return false;
        const ownershipDate = getOwnershipDate(p);
        if (!ownershipDate) return false;
        if (ownershipDate > cutoffDate) return false;
        const purchasePrice = getSaleAmount(p) || 0;
        if (purchasePrice > 0 && propVal <= purchasePrice) return false;
        return true;
      });

      matches.sort((a, b) => {
        const aVal = getPropertyValue(a) || 0;
        const aSale = getSaleAmount(a) || 0;
        const bVal = getPropertyValue(b) || 0;
        const bSale = getSaleAmount(b) || 0;
        return (bVal - bSale) - (aVal - aSale);
      });

      setResults(matches);
      setTotalCount(matches.length);
      setInvestorGroups([]);
    } else if (filterMode === "investor") {
      setDebugInfo(
        `Scanned ${allRaw.length} properties — ${withDirectOwner} with owner names, ${withMortgagor} with mortgagor (via mortgage), ` +
        `${withMailAddr} with mailing addresses, ${withContact} with any contact info, ` +
        `${withSaleAmt} with sale amounts, ${withSaleDate} with sale dates, ${withMortgage} with mortgage data, ` +
        `${withAvm} with AVM, ${withValue} with property values, ${withAbsentee} absentee` + srcLabel
      );

      const groups = groupByOwner(allRaw);

      const groupedIds = new Set<number>();
      for (const g of groups) {
        for (const p of g.properties) {
          if (p.identifier?.attomId) groupedIds.add(p.identifier.attomId);
        }
      }
      const singleInvestors = allRaw.filter((p) => {
        if (p.identifier?.attomId && groupedIds.has(p.identifier.attomId)) return false;
        const ownerR = resolveOwner(p);
        const isCorp = ownerR?.corporateIndicator === "Y";
        const isAbsentee = isAbsenteeOwner(p);
        const hasOwnerName = !!getOwnerName(p);
        // Realie provides ownerParcelCount — if they own 2+ properties they're an investor
        const parcelCount = (ownerR as any)?.ownerParcelCount;
        const isMultiProperty = typeof parcelCount === "number" && parcelCount >= 2;
        return hasOwnerName && (isCorp || isAbsentee || isMultiProperty);
      });

      for (const p of singleInvestors) {
        const ownerR = resolveOwner(p);
        const years = p.building?.summary?.yearBuilt ? [p.building.summary.yearBuilt] : [];
        groups.push({
          ownerName: getOwnerName(p) || "Unknown",
          mailingAddress: ownerR?.mailingAddressOneLine || "",
          isCorporate: ownerR?.corporateIndicator === "Y",
          properties: [p],
          totalTaxBurden: p.assessment?.tax?.taxAmt || 0,
          totalAvmValue: getPropertyValue(p) || 0,
          totalRentalIncome: getRentalValue(p) || 0,
          totalEquity: getEquityFromValuation(p),
          oldestYearBuilt: years.length > 0 ? Math.min(...years) : null,
          avgYearBuilt: years.length > 0 ? years[0] : null,
        });
      }

      groups.sort((a, b) => {
        if (a.properties.length !== b.properties.length) return b.properties.length - a.properties.length;
        return b.totalAvmValue - a.totalAvmValue;
      });

      setInvestorGroups(groups);
      setTotalCount(groups.length);
      setResults(allRaw);
    } else if (filterMode === "radius") {
      const withPrice = allRaw.filter((p) => getSaleAmount(p) != null && getSaleAmount(p)! > 0).length;
      const withVal = allRaw.filter((p) => getPropertyValue(p) != null).length;
      const isNonDisclosure = allRaw.length > 0 && withPrice === 0;
      setDebugInfo(
        `Scanned ${allRaw.length} recent sales — ` +
        `${withPrice} with disclosed prices, ${withVal} with estimated values` +
        (isNonDisclosure ? ` (non-disclosure state — using assessed/market values)` : "") +
        srcLabel
      );
      setResults(allRaw);
      setTotalCount(allRaw.length);
      setInvestorGroups([]);
    }

    setHasSearched(true);
  };

  /**
   * Address-based search for Just Sold Farming.
   * Looks up the sold property by address, then shows it in results
   * so the user can open it and use the Nearby Homes tab.
   */
  const handleAddressSearch = async () => {
    if (!farmAddress.trim()) {
      setError("Enter a sold property address.");
      return;
    }
    setError("");
    setIsLoading(true);
    setResults([]);
    setInvestorGroups([]);
    setHasSearched(false);
    setRadiusCenter(null);
    setRadiusResults([]);

    try {
      // Search ATTOM by address using the expanded profile endpoint
      const params = new URLSearchParams({
        address: farmAddress.trim(),
        endpoint: "expanded",
      });
      const res = await fetch(`/api/integrations/attom/property?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Address search failed");

      const props: AttomProperty[] = data.property || [];
      if (props.length === 0) {
        setError(data.message || "No property found at that address. Try a different address or use zip code search.");
        setResults([]);
      } else {
        // Last sale data is already included in the expanded profile response —
        // no need for a separate saleshistory API call (saves 1 ATTOM hit per search)
        setResults(props);
        setTotalCount(props.length);
        setDebugInfo(`Found property at: ${props[0].address?.oneLine || farmAddress}. Click to open and view nearby homes for farming.`);
      }
      setHasSearched(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Address search failed");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (pageNum = 1) => {
    // For radius mode with address search, use the address handler
    if (mode === "radius" && farmSearchMode === "address") {
      handleAddressSearch();
      return;
    }
    if (!zip.trim()) {
      setError("Enter a zip code.");
      return;
    }

    setError("");
    setPage(pageNum);

    // For non-radius modes, reuse shared data if we already fetched for this zip+propertyType.
    // This avoids redundant ATTOM API calls when switching between absentee/equity/foreclosure/investor.
    const currentKey = `${zip.trim()}:${propertyType}`;
    if (mode !== "radius" && sharedRawData.length > 0 && sharedDataKey === currentKey) {
      applyModeFilter(mode, sharedRawData);
      return;
    }

    setIsLoading(true);
    setInvestorGroups([]);

    try {
      // All modes use multi-page scanning to accumulate more results.
      // Before fetching supplements, we check the universal property cache —
      // if a previous search already has owner/expanded data for these properties,
      // we skip the redundant API calls.
      //
      // Primary endpoints by mode:
      //   - absentee / equity / foreclosure / investor: detailmortgageowner
      //   - radius (Just Sold): salesnapshot
      //
      // All modes use the SAME supplement strategy:
      //   1. "expanded" (expandedprofile) — returns owner, assessment, mortgage,
      //      building data. Owner data is normalized server-side from assessment.owner.
      //   2. "detailowner" — secondary supplement for full owner names + mailing addresses
      {
        let allRaw: AttomProperty[] = [];
        const maxPages = mode === "investor" ? 6
          : mode === "foreclosure" ? 5
          : mode === "radius" ? 4
          : 4;

        // Snapshot the cache once at the start of the search so all pages
        // see a consistent view (state updates are async).
        const cacheSnapshot = new Map(propertyCache);

        // Pre-fetch one-shot supplements (endpoints that return all properties
        // for the zip at once and don't support pagination).
        const firstPageCheck = enrichFromCache([], cacheSnapshot);
        let valuationSupps: AttomProperty[][] = [];
        const valuationFetches: Promise<any>[] = [];
        if (firstPageCheck.needsRentalAvm) {
          valuationFetches.push(fetchPage(1, "rentalavm").catch(() => ({ property: [] })));
        }
        if (valuationFetches.length > 0) {
          const valuationResults = await Promise.all(valuationFetches);
          valuationSupps = valuationResults.map((r: any) => (r.property || []) as AttomProperty[]);
        }

        // Fetch sales trend for this zip code (zip-level, not per-property)
        if (salesTrendZip !== zip.trim()) {
          const currentYear = new Date().getFullYear();
          const trendParams = new URLSearchParams({
            endpoint: "salestrend",
            postalcode: zip.trim(),
            interval: "quarterly",
            startyear: String(currentYear - 3),
            endyear: String(currentYear),
            propertytype: "SINGLE FAMILY RESIDENCE",
          });
          fetch(`/api/integrations/attom/property?${trendParams}`)
            .then(r => r.json())
            .then(data => {
              if (data && !data.error) {
                setSalesTrendData(data);
                setSalesTrendZip(zip.trim());
              }
            })
            .catch(() => { /* non-critical */ });
        }

        // Track whether the first page's data is sparse (ATTOM-only without Realie).
        // If so, we need per-page supplements for owner/assessment/AVM data.
        let needsPerPageSupplements = false;
        let detectedDataSource = "unknown";

        for (let pg = 1; pg <= maxPages; pg++) {
          const baseData = await fetchPage(pg);
          const baseProps: AttomProperty[] = baseData.property || [];
          if (baseProps.length === 0) break;

          // Capture data source from first page for diagnostics
          if (pg === 1) {
            detectedDataSource = baseData.dataSource || baseData.cacheHit || "unknown";
          }

          const { enriched: cacheEnriched, needsExpanded, needsOwner } = enrichFromCache(baseProps, cacheSnapshot);

          // On first page, check data quality to decide if supplements are needed.
          // If the primary response already has owner/value data (from Realie or
          // server-side supplementing), skip redundant supplement calls.
          if (pg === 1) {
            const withOwner = cacheEnriched.filter((p) => { const o = resolveOwner(p); return o?.owner1?.fullName || o?.owner2?.fullName; }).length;
            const withValue = cacheEnriched.filter((p) => getPropertyValue(p) != null).length;
            const ownerPct = cacheEnriched.length > 0 ? (withOwner / cacheEnriched.length) * 100 : 0;
            const valuePct = cacheEnriched.length > 0 ? (withValue / cacheEnriched.length) * 100 : 0;
            needsPerPageSupplements = (needsExpanded || needsOwner) && (ownerPct < 25 || valuePct < 25);
          }

          // Fetch per-page supplements if primary data is sparse
          const suppFetches: Promise<any>[] = [];
          if (needsPerPageSupplements) {
            suppFetches.push(fetchPage(pg, "expanded").catch(() => ({ property: [] })));
            if (mode === "radius") {
              suppFetches.push(fetchPage(pg, "detailmortgageowner").catch(() => ({ property: [] })));
            } else {
              suppFetches.push(fetchPage(pg, "detailowner").catch(() => ({ property: [] })));
            }
          }

          let allSuppArrays: AttomProperty[][] = [];
          if (suppFetches.length > 0) {
            const suppResults = await Promise.all(suppFetches);
            allSuppArrays = suppResults.map((r: any) => (r.property || []) as AttomProperty[]);
          }
          // Add one-shot valuation data
          allSuppArrays = allSuppArrays.concat(valuationSupps);

          let merged: AttomProperty[];
          if (allSuppArrays.length > 0) {
            merged = mergeSupplementalData(cacheEnriched, allSuppArrays);
          } else {
            merged = cacheEnriched;
          }

          // Add this page's data to cache snapshot so later pages benefit too
          for (const p of merged) {
            const id = p.identifier?.attomId;
            if (id) {
              const existing = cacheSnapshot.get(id);
              cacheSnapshot.set(id, existing ? mergeSupplementalData([existing], [[p]])[0] : p);
            }
          }

          allRaw = allRaw.concat(merged);
          if (baseProps.length < pageSize) break;
        }

        // Persist the accumulated cache snapshot to state
        addToPropertyCache(allRaw);
        setPropertyCacheKey(currentKey);

        // Store shared data for non-radius modes so mode switches are instant
        if (mode !== "radius") {
          setSharedRawData(allRaw);
          setSharedDataKey(`${zip.trim()}:${propertyType}`);
        }

        // Apply mode-specific filtering, sorting, and diagnostics
        applyModeFilter(mode, allRaw, detectedDataSource);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fmt = (n?: number) => (n != null ? `$${n.toLocaleString()}` : "—");
  const fmtNum = (n?: number) => (n != null ? n.toLocaleString() : "—");

  const getAddress = (p: AttomProperty) =>
    p.address?.oneLine || [p.address?.line1, p.address?.line2].filter(Boolean).join(", ") || "Unknown";

  const totalPages = Math.ceil(totalCount / pageSize);

  const modes: { id: ProspectMode; label: string; desc: string; color: string }[] = [
    {
      id: "absentee",
      label: "Absentee Owners",
      desc: "Non-owner-occupied properties — out-of-state owners, corporate entities, and landlords.",
      color: "#3b82f6",
    },
    {
      id: "equity",
      label: "High Equity / Likely Sellers",
      desc: "Long-tenure owners with significant untapped equity — empty nesters, retirees, potential listers.",
      color: "#059669",
    },
    {
      id: "foreclosure",
      label: "Distressed / Pre-Foreclosure",
      desc: "Underwater mortgages, stagnant values, and assessment drops — owners under financial pressure who may need to sell.",
      color: "#dc2626",
    },
    {
      id: "radius",
      label: "Just Sold Farming",
      desc: "Find a recently sold property and discover nearby homeowners to send \"Your Neighbor's Home Just Sold\" postcards.",
      color: "#7c3aed",
    },
    {
      id: "investor",
      label: "Investor Portfolios",
      desc: "Corporate entities, absentee owners, and multi-property investors — find landlords with contact info and financials.",
      color: "#b45309",
    },
  ];

  // ── Render helpers for each mode ─────────────────────────────────────────

  const renderPropertyCard = (prop: AttomProperty, idx: number) => {
    // Use getPropertyValue() for display — falls back from AVM to assessment
    const avmVal = getPropertyValue(prop);
    const hasRealAvm = prop.avm?.amount?.value != null && prop.avm.amount.value > 0;
    const avmHigh = prop.avm?.amount?.high;
    const avmLow = prop.avm?.amount?.low;
    const lastSale = getSaleAmount(prop);
    const saleDateStr = getSaleDateStr(prop);
    const owner = getOwnerName(prop);
    const ownerObj = resolveOwner(prop);
    // Show absentee badge when ATTOM flags the property as absentee-owned.
    // In absentee mode, always show it since the user explicitly searched for
    // absentee owners. In other modes, require some owner data to back it up.
    const absentee = isAbsenteeOwner(prop) && (mode === "absentee" || owner || ownerObj?.mailingAddressOneLine);
    const equity = avmVal && lastSale ? avmVal - lastSale : null;
    const equityPct = avmVal && lastSale ? ((avmVal - lastSale) / avmVal) * 100 : null;
    const ownershipDate = getOwnershipDate(prop);
    const yearsOwned = ownershipDate
      ? Math.floor((Date.now() - ownershipDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;
    const sqft = prop.building?.size?.livingSize || prop.building?.size?.universalSize || prop.building?.size?.bldgSize;
    const beds = prop.building?.rooms?.beds;
    const baths = prop.building?.rooms?.bathsFull ?? prop.building?.rooms?.bathsTotal;
    const yearBuilt = prop.building?.summary?.yearBuilt;
    const taxAmt = prop.assessment?.tax?.taxAmt;
    const mortgageAmt = getMortgageAmount(prop);
    const lenderName = getMortgageLender(prop);
    const mailingAddr = getMailingAddress(prop);
    const rentalVal = getRentalValue(prop);
    const heEquity = getEquityFromValuation(prop);
    const he = resolveHomeEquity(prop);
    const heLtv = he?.loanToValue ?? he?.ltv ?? (he?.avmValue && he?.outstandingBalance ? (((he.outstandingBalance ?? he.loanBalance ?? he.mortgageBalance ?? he.estimatedBalance ?? 0) / (he.avmValue ?? he.avm?.amount?.value ?? he.estimatedValue ?? 1)) * 100) : null);
    const distress = mode === "foreclosure" ? getDistressSignals(prop) : null;
    const apn = prop.identifier?.apn;
    const isHI = prop.address?.countrySubd?.toUpperCase() === "HI" || prop.address?.countrySubd?.toUpperCase() === "HAWAII";
    // Convert ATTOM APN to 12-digit TMK and build county-specific QPublic link via zip code
    const qpubTmk = isHI && apn ? apn.replace(/[-\s.]/g, "").slice(1).padEnd(12, "0") : null;
    const qpubUrl = qpubTmk ? buildQPublicUrl(apn!, null, prop.address?.postal1) : null;

    return (
      <div
        key={prop.identifier?.attomId || idx}
        onClick={() => setSelectedProperty(prop)}
        style={{
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16,
          cursor: "pointer", transition: "box-shadow 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{getAddress(prop)}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {[
                beds != null ? `${beds} bed` : null,
                baths != null ? `${baths} bath` : null,
                sqft ? `${fmtNum(sqft)} sqft` : null,
                yearBuilt ? `Built ${yearBuilt}` : null,
              ].filter(Boolean).join(" · ")}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              {owner ? (
                <>
                  {isOwnerFromMortgage(prop) ? "Mortgagor" : "Owner"}: {owner}
                  {isOwnerFromMortgage(prop) && (
                    <span style={{ marginLeft: 6, padding: "1px 8px", background: "#e0f2fe", color: "#0369a1", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                      via Mortgage Record
                    </span>
                  )}
                </>
              ) : (mode === "absentee" ? "Owner: Skip trace needed" : "Owner: Not listed")}
              {absentee && (
                <span style={{ marginLeft: 6, padding: "1px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                  Absentee
                </span>
              )}
              {ownerObj?.corporateIndicator === "Y" && (
                <span style={{ marginLeft: 6, padding: "1px 8px", background: "#ede9fe", color: "#6d28d9", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                  Corporate
                </span>
              )}
            </div>
            {/* Additional owners (owner 2, 3, 4) */}
            {ownerObj?.owner2?.fullName && (
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>
                Owner 2: {ownerObj.owner2.fullName}
              </div>
            )}
            {ownerObj?.owner3?.fullName && (
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>
                Owner 3: {ownerObj.owner3.fullName}
              </div>
            )}

            {/* Always show mailing address if available — key contact point for absentee owners.
                Falls back to mortgagor (borrower) address from mortgage record. */}
            {mailingAddr && (
              <div style={{ fontSize: 12, color: owner ? "#6b7280" : "#374151", fontWeight: owner ? 400 : 600, marginTop: 2 }}>
                {ownerObj?.mailingAddressOneLine?.trim() ? "Mailing" : "Mortgagor Address"}: {mailingAddr}
              </div>
            )}

            {/* Ownership & sale intel summary — always visible */}
            {(ownerObj?.absenteeOwnerStatus || prop.summary?.absenteeInd || yearsOwned != null || saleDateStr || ownerObj?.ownerRelationshipType) && (
              <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, color: "#6b7280" }}>
                {(() => {
                  const occ = (ownerObj?.absenteeOwnerStatus || "").toUpperCase();
                  const ind = (prop.summary?.absenteeInd || "").toUpperCase();
                  if (occ.includes("ABSENTEE") || ind.includes("ABSENTEE") || ind === "A") {
                    return <span style={{ padding: "1px 6px", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontWeight: 500 }}>Absentee Owner</span>;
                  }
                  if (occ.includes("OWNER") || ind.includes("OWNER OCC") || ind === "O" || ind === "S") {
                    return <span style={{ padding: "1px 6px", background: "#ecfdf5", color: "#059669", borderRadius: 4, fontWeight: 500 }}>Owner Occupied</span>;
                  }
                  return null;
                })()}
                {yearsOwned != null && yearsOwned > 0 && (
                  <span style={{ padding: "1px 6px", background: "#f0f9ff", color: "#0369a1", borderRadius: 4, fontWeight: 500 }}>
                    Owned {yearsOwned} yr{yearsOwned !== 1 ? "s" : ""}
                  </span>
                )}
                {ownerObj?.ownerRelationshipType && (
                  <span>{ownerObj.ownerRelationshipType}</span>
                )}
                {saleDateStr && !lastSale && (
                  <span>Last transfer: {saleDateStr}</span>
                )}
              </div>
            )}

            {qpubTmk && qpubUrl && (
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#374151" }}>TMK: {qpubTmk}</span>
                <a
                  href={qpubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, textDecoration: "none" }}
                >
                  QPublic &#8599;
                </a>
              </div>
            )}

            {/* Key financial data row — always visible for all modes */}
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "#374151" }}>
              {avmVal != null && (
                <span><strong>Estimated Value:</strong> <span style={{ color: "#059669" }}>{fmt(avmVal)}</span></span>
              )}
              {rentalVal != null && (
                <span><strong>Rent Est.:</strong> <span style={{ color: "#7c3aed" }}>${Number(rentalVal).toLocaleString()}/mo</span></span>
              )}
              {lastSale != null && (
                <span><strong>Last Sale:</strong> {fmt(lastSale)}{saleDateStr ? ` (${saleDateStr})` : ""}</span>
              )}
              {!lastSale && saleDateStr && (
                <span><strong>Last Transfer:</strong> {saleDateStr} (price not disclosed)</span>
              )}
              {mortgageAmt != null && (
                <span><strong>Mortgage:</strong> {fmt(mortgageAmt)}{lenderName ? ` — ${lenderName}` : ""}</span>
              )}
              {heEquity != null ? (
                <span><strong>Equity:</strong> <span style={{ color: heEquity >= 0 ? "#a16207" : "#dc2626", fontWeight: 600 }}>{heEquity >= 0 ? "+" : ""}{fmt(heEquity)}</span>
                  {heLtv != null && <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 4 }}>(LTV {Number(heLtv).toFixed(0)}%)</span>}
                </span>
              ) : equity != null && equity > 0 ? (
                <span><strong>Est. Equity:</strong> <span style={{ color: "#a16207", fontWeight: 600 }}>+{fmt(equity)}</span></span>
              ) : null}
              {taxAmt != null && (
                <span><strong>Tax:</strong> {fmt(taxAmt)}/yr</span>
              )}
              {rentalVal != null && avmVal != null && (
                <span><strong>Yield:</strong> <span style={{ color: "#0891b2", fontWeight: 600 }}>{((rentalVal * 12 / avmVal) * 100).toFixed(1)}%</span></span>
              )}
            </div>

            {/* Equity mode — tenure and purchase info */}
            {mode === "equity" && yearsOwned != null && (
              <div style={{ marginTop: 6, padding: "6px 10px", background: "#f0fdf4", borderRadius: 6, fontSize: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <span style={{
                    padding: "1px 8px",
                    background: yearsOwned >= 20 ? "#059669" : yearsOwned >= 15 ? "#10b981" : "#34d399",
                    color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 700,
                  }}>
                    Owned {yearsOwned} years
                  </span>
                  {ownershipDate && (
                    <span style={{ color: "#6b7280" }}>
                      Purchased: {ownershipDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </span>
                  )}
                  {lastSale != null && (
                    <span style={{ color: "#6b7280" }}>for {fmt(lastSale)}</span>
                  )}
                  {equity != null && equity > 0 && (
                    <span style={{ color: "#059669", fontWeight: 600 }}>
                      Est. appreciation: +{fmt(equity)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Distressed / Pre-Foreclosure info */}
            {mode === "foreclosure" && distress && distress.isDistressed && (
              <div style={{ marginTop: 6, padding: "6px 10px", background: "#fef2f2", borderRadius: 6, fontSize: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 2 }}>
                  {distress.isUnderwater && (
                    <span style={{ padding: "1px 8px", background: "#dc2626", color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                      Underwater
                    </span>
                  )}
                  {distress.highLtv && !distress.isUnderwater && (
                    <span style={{ padding: "1px 8px", background: "#f59e0b", color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                      High LTV
                    </span>
                  )}
                  {distress.assessmentDrop && (
                    <span style={{ padding: "1px 8px", background: "#7c3aed", color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                      Assessment Drop
                    </span>
                  )}
                  {distress.negativeAppreciation && (
                    <span style={{ padding: "1px 8px", background: "#be123c", color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                      Lost Value
                    </span>
                  )}
                  {distress.minimalAppreciation && !distress.negativeAppreciation && (
                    <span style={{ padding: "1px 8px", background: "#9333ea", color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                      Stagnant Value
                    </span>
                  )}
                  {absentee && (
                    <span style={{ padding: "1px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                      Absentee
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
                  {distress.mortgageAmount != null && (
                    <span><strong>Mortgage:</strong> {fmt(distress.mortgageAmount)}</span>
                  )}
                  {distress.avmValue != null && (
                    <span><strong>AVM:</strong> {fmt(distress.avmValue)}</span>
                  )}
                  {distress.ltvPct != null && (
                    <span style={{ color: distress.ltvPct >= 100 ? "#dc2626" : distress.ltvPct >= 80 ? "#d97706" : "#374151", fontWeight: 600 }}>
                      <strong>LTV:</strong> {distress.ltvPct.toFixed(0)}%
                    </span>
                  )}
                  {lenderName && (
                    <span><strong>Lender:</strong> {lenderName}</span>
                  )}
                </div>
                {distress.isUnderwater && distress.mortgageAmount != null && distress.avmValue != null && (
                  <div style={{ marginTop: 4, color: "#dc2626", fontWeight: 600, fontSize: 11 }}>
                    Negative equity: {fmt(distress.mortgageAmount - distress.avmValue)} (mortgage exceeds AVM)
                  </div>
                )}
                {distress.negativeAppreciation && lastSale != null && avmVal != null && (
                  <div style={{ marginTop: 4, color: "#be123c", fontWeight: 600, fontSize: 11 }}>
                    Value decline: purchased for {fmt(lastSale)}, now worth {fmt(avmVal)} ({((avmVal - lastSale) / lastSale * 100).toFixed(1)}%)
                  </div>
                )}
                {distress.minimalAppreciation && !distress.negativeAppreciation && yearsOwned != null && lastSale != null && avmVal != null && (
                  <div style={{ marginTop: 4, color: "#7c3aed", fontWeight: 600, fontSize: 11 }}>
                    Stagnant: owned {yearsOwned} years, only {((avmVal - lastSale) / lastSale * 100).toFixed(0)}% appreciation (purchased {fmt(lastSale)})
                  </div>
                )}
              </div>
            )}

            {/* Pre-Foreclosure details from /preforeclosure/detail supplement */}
            {mode === "foreclosure" && prop.foreclosure?.actionType && (
              <div style={{ marginTop: 6, padding: "6px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: "#991b1b", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  Pre-Foreclosure Filing
                  <span style={{ padding: "1px 8px", background: "#dc2626", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                    {prop.foreclosure.actionType}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {prop.foreclosure.filingDate && (
                    <span><strong>Filed:</strong> {prop.foreclosure.filingDate}</span>
                  )}
                  {prop.foreclosure.recordingDate && (
                    <span><strong>Recorded:</strong> {prop.foreclosure.recordingDate}</span>
                  )}
                  {prop.foreclosure.auctionDate && (
                    <span><strong>Auction:</strong> <span style={{ color: "#dc2626", fontWeight: 600 }}>{prop.foreclosure.auctionDate}</span></span>
                  )}
                  {prop.foreclosure.defaultAmount != null && (
                    <span><strong>Default:</strong> {fmt(prop.foreclosure.defaultAmount)}</span>
                  )}
                  {prop.foreclosure.originalLoanAmount != null && (
                    <span><strong>Original Loan:</strong> {fmt(prop.foreclosure.originalLoanAmount)}</span>
                  )}
                  {prop.foreclosure.startingBid != null && (
                    <span><strong>Starting Bid:</strong> <span style={{ color: "#059669", fontWeight: 600 }}>{fmt(prop.foreclosure.startingBid)}</span></span>
                  )}
                  {prop.foreclosure.trusteeFullName && (
                    <span><strong>Trustee:</strong> {prop.foreclosure.trusteeFullName}</span>
                  )}
                  {prop.foreclosure.auctionLocation && (
                    <span><strong>Location:</strong> {prop.foreclosure.auctionLocation}</span>
                  )}
                </div>
              </div>
            )}

            {/* Radius farming — sale info (always show for this mode) */}
            {mode === "radius" && (
              <div style={{ marginTop: 6, padding: "6px 10px", background: "#f5f3ff", borderRadius: 6, fontSize: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                  {lastSale != null && lastSale > 0 ? (
                    <span><strong>Sold:</strong> {fmt(lastSale)}</span>
                  ) : (
                    <span style={{ color: "#9ca3af" }}>
                      <strong>Sale price:</strong> Not disclosed
                      {avmVal != null && (
                        <span style={{ color: "#6b7280" }}> — <strong>Est. value:</strong> {fmt(avmVal)}</span>
                      )}
                    </span>
                  )}
                  {saleDateStr && (
                    <span><strong>Date:</strong> {saleDateStr}</span>
                  )}
                  {sqft && lastSale && lastSale > 0 ? (
                    <span><strong>$/sqft:</strong> ${Math.round(lastSale / sqft).toLocaleString()}</span>
                  ) : sqft && avmVal ? (
                    <span style={{ color: "#9ca3af" }}><strong>Est. $/sqft:</strong> ~${Math.round(avmVal / sqft).toLocaleString()}</span>
                  ) : null}
                  {prop.location?.latitude && prop.location?.longitude && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRadiusSearch(prop.location!.latitude!, prop.location!.longitude!, getAddress(prop));
                      }}
                      disabled={radiusLoading}
                      style={{
                        padding: "2px 10px", background: "#7c3aed", color: "#fff", borderRadius: 6, border: "none",
                        fontSize: 11, fontWeight: 600, cursor: radiusLoading ? "not-allowed" : "pointer",
                        opacity: radiusLoading ? 0.6 : 1, marginLeft: "auto",
                      }}
                    >
                      {radiusLoading ? "Searching..." : `Search ${radiusMiles} mi Radius`}
                    </button>
                  )}
                </div>
                {hasRealAvm && avmLow != null && avmHigh != null && avmVal != null && (
                  <div style={{ marginTop: 4, fontSize: 11, color: "#6b7280" }}>
                    AVM range: {fmt(avmLow)} – {fmt(avmHigh)} (est. {fmt(avmVal)})
                  </div>
                )}
                <div style={{ marginTop: 4, fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>
                  Click to open &amp; view Nearby Homes for farming postcards
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", textAlign: "right" }}>
            {/* Primary value metric per mode */}
            {mode === "absentee" && avmVal != null && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Estimated Value</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#059669" }}>{fmt(avmVal)}</div>
              </div>
            )}
            {mode === "equity" && equity != null && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Est. Equity</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: equity > 0 ? "#a16207" : "#dc2626" }}>
                  {equity > 0 ? "+" : ""}{fmt(equity)}
                  {equityPct != null && (
                    <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 4 }}>({equityPct.toFixed(0)}%)</span>
                  )}
                </div>
              </div>
            )}
            {mode === "equity" && yearsOwned != null && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Tenure</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: yearsOwned >= 20 ? "#059669" : "#10b981" }}>{yearsOwned} yrs</div>
              </div>
            )}
            {mode === "foreclosure" && distress?.ltvPct != null && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>LTV</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: distress.ltvPct >= 100 ? "#dc2626" : distress.ltvPct >= 80 ? "#d97706" : "#059669" }}>
                  {distress.ltvPct.toFixed(0)}%
                </div>
              </div>
            )}
            {mode === "radius" && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {lastSale != null && lastSale > 0 ? "Sale Price" : "Estimated Value"}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#7c3aed" }}>
                  {lastSale != null && lastSale > 0 ? fmt(lastSale) : avmVal != null ? fmt(avmVal) : "N/A"}
                </div>
                {saleDateStr && (
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{saleDateStr}</div>
                )}
              </div>
            )}
            {mode === "investor" && avmVal != null && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Estimated Value</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#059669" }}>{fmt(avmVal)}</div>
              </div>
            )}
            {/* Rental AVM — shown for all modes when available */}
            {rentalVal != null && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Rent Est.</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#7c3aed" }}>${Number(rentalVal).toLocaleString()}/mo</div>
                {rentalVal != null && avmVal != null && (
                  <div style={{ fontSize: 11, color: "#0891b2", fontWeight: 600 }}>
                    {((rentalVal * 12 / avmVal) * 100).toFixed(1)}% yield
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderInvestorCard = (group: InvestorGroup, idx: number) => {
    const isExpanded = expandedInvestor === `${group.ownerName}|${idx}`;
    return (
      <div
        key={`${group.ownerName}|${idx}`}
        style={{
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden",
        }}
      >
        <div
          onClick={() => setExpandedInvestor(isExpanded ? null : `${group.ownerName}|${idx}`)}
          style={{
            padding: 16, cursor: "pointer", transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{group.ownerName}</div>
                <span style={{
                  padding: "1px 8px",
                  background: group.properties.length >= 5 ? "#fef3c7" : "#e0f2fe",
                  color: group.properties.length >= 5 ? "#92400e" : "#0369a1",
                  borderRadius: 10, fontSize: 11, fontWeight: 700,
                }}>
                  {group.properties.length} properties
                </span>
                {group.isCorporate && (
                  <span style={{ padding: "1px 8px", background: "#ede9fe", color: "#6d28d9", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                    Corporate
                  </span>
                )}
              </div>
              {group.mailingAddress && (
                <div style={{ fontSize: 12, color: "#6b7280" }}>Mailing: {group.mailingAddress}</div>
              )}
              {group.oldestYearBuilt && (
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  Oldest property: Built {group.oldestYearBuilt}
                  {group.oldestYearBuilt < 1980 && (
                    <span style={{ marginLeft: 6, padding: "1px 6px", background: "#fef2f2", color: "#b91c1c", borderRadius: 8, fontSize: 10, fontWeight: 600 }}>
                      Deferred maintenance risk
                    </span>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", textAlign: "right" }}>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Properties</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#3b82f6" }}>{group.properties.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Total Value</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#059669" }}>{fmt(group.totalAvmValue)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Tax Burden/yr</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: group.totalTaxBurden > 20000 ? "#dc2626" : "#374151" }}>
                  {fmt(group.totalTaxBurden)}
                </div>
              </div>
              {group.totalRentalIncome > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Rent Est./mo</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#7c3aed" }}>${group.totalRentalIncome.toLocaleString()}</div>
                  {group.totalAvmValue > 0 && (
                    <div style={{ fontSize: 11, color: "#0891b2", fontWeight: 600 }}>
                      {((group.totalRentalIncome * 12 / group.totalAvmValue) * 100).toFixed(1)}% yield
                    </div>
                  )}
                </div>
              )}
              {group.totalEquity != null && (
                <div>
                  <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Est. Equity</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: group.totalEquity >= 0 ? "#059669" : "#dc2626" }}>
                    {group.totalEquity >= 0 ? "+" : ""}{fmt(group.totalEquity)}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
            {isExpanded ? "Click to collapse" : "Click to see individual properties"}
          </div>
        </div>

        {isExpanded && (
          <div style={{ borderTop: "1px solid #f3f4f6", padding: "8px 16px 16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {group.properties.map((prop, pidx) => renderPropertyCard(prop, pidx))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Mode Selection */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 20 }}>
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              const newMode = m.id;
              setMode(newMode);
              setError("");
              setExpandedInvestor(null);
              // If we have shared data for the current zip and this isn't radius mode,
              // instantly re-filter instead of requiring a new search
              if (newMode !== "radius" && sharedRawData.length > 0 && sharedDataKey === `${zip.trim()}:${propertyType}`) {
                applyModeFilter(newMode, sharedRawData);
              } else {
                setResults([]);
                setInvestorGroups([]);
                setHasSearched(false);
                setDebugInfo("");
              }
            }}
            style={{
              padding: 14, borderRadius: 10, border: mode === m.id ? `2px solid ${m.color}` : "1px solid #e5e7eb",
              background: mode === m.id ? `${m.color}08` : "#fff", cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: mode === m.id ? m.color : "#374151", marginBottom: 4 }}>
              {m.label}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.4 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Search Form */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        {/* Search mode toggle for Just Sold Farming */}
        {mode === "radius" && (
          <div style={{ display: "flex", gap: 0, marginBottom: 12 }}>
            <button
              onClick={() => setFarmSearchMode("zip")}
              style={{
                padding: "6px 16px", fontSize: 12, fontWeight: 600, border: "1px solid #d1d5db",
                borderRadius: "6px 0 0 6px", cursor: "pointer",
                background: farmSearchMode === "zip" ? "#7c3aed" : "#fff",
                color: farmSearchMode === "zip" ? "#fff" : "#374151",
              }}
            >
              Search by Zip Code
            </button>
            <button
              onClick={() => setFarmSearchMode("address")}
              style={{
                padding: "6px 16px", fontSize: 12, fontWeight: 600, border: "1px solid #d1d5db", borderLeft: "none",
                borderRadius: "0 6px 6px 0", cursor: "pointer",
                background: farmSearchMode === "address" ? "#7c3aed" : "#fff",
                color: farmSearchMode === "address" ? "#fff" : "#374151",
              }}
            >
              Search by Address
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          {/* Address input for radius/address mode */}
          {mode === "radius" && farmSearchMode === "address" ? (
            <div style={{ flex: 1, minWidth: 250 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Sold Property Address</label>
              <input
                type="text"
                value={farmAddress}
                onChange={(e) => setFarmAddress(e.target.value)}
                placeholder="e.g. 123 Main St, Denver, CO 80211"
                onKeyDown={(e) => e.key === "Enter" && handleSearch(1)}
                style={{ width: "100%", padding: "8px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 6 }}
              />
            </div>
          ) : (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Zip Code</label>
              <input
                type="text"
                value={zip}
                onChange={(e) => { setZip(e.target.value); if (sharedDataKey || propertyCacheKey) { setSharedRawData([]); setSharedDataKey(""); setPropertyCache(new Map()); setPropertyCacheKey(""); } }}
                placeholder="e.g. 80211"
                onKeyDown={(e) => e.key === "Enter" && handleSearch(1)}
                style={{ width: 140, padding: "8px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 6 }}
              />
            </div>
          )}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Property Type</label>
            <select
              value={propertyType}
              onChange={(e) => { setPropertyType(e.target.value); if (sharedDataKey || propertyCacheKey) { setSharedRawData([]); setSharedDataKey(""); setPropertyCache(new Map()); setPropertyCacheKey(""); } }}
              style={{ padding: "8px 12px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 6 }}
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {mode === "equity" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Min Years Owned</label>
                <input
                  type="number"
                  value={minYearsOwned}
                  onChange={(e) => setMinYearsOwned(e.target.value)}
                  placeholder="e.g. 10"
                  style={{ width: 100, padding: "8px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Min AVM Value</label>
                <input
                  type="number"
                  value={minAvmValue}
                  onChange={(e) => setMinAvmValue(e.target.value)}
                  placeholder="e.g. 300000"
                  style={{ width: 140, padding: "8px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
            </>
          )}

          {mode === "radius" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ padding: "8px 12px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ padding: "8px 12px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Radius (miles)</label>
                <input
                  type="number"
                  value={radiusMiles}
                  onChange={(e) => setRadiusMiles(e.target.value)}
                  placeholder="0.5"
                  step="0.1"
                  min="0.1"
                  max="5"
                  style={{ width: 80, padding: "8px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
            </>
          )}

          <button
            onClick={() => handleSearch(1)}
            disabled={isLoading}
            style={{
              padding: "8px 24px", background: modes.find((m) => m.id === mode)?.color || "#3b82f6", color: "#fff", borderRadius: 8, border: "none",
              fontWeight: 600, fontSize: 14, cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.7 : 1, height: 38,
            }}
          >
            {isLoading ? "Searching..." : "Find Properties"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, background: "#fee2e2", color: "#dc2626", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {isLoading && (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
          Scanning property records (multiple pages)...
        </div>
      )}

      {!isLoading && hasSearched && debugInfo && (
        <div style={{ padding: "6px 12px", background: "#f0f9ff", color: "#0369a1", borderRadius: 6, marginBottom: 12, fontSize: 12, fontFamily: "monospace" }}>
          {debugInfo}
        </div>
      )}

      {/* Sales Trend Summary — zip-level market data from /transaction/salestrend */}
      {!isLoading && hasSearched && salesTrendData && (() => {
        const trendsList: any[] = salesTrendData.salesTrends || salesTrendData.salestrend || [];
        if (trendsList.length === 0) return null;
        const recent = trendsList.slice(-4); // Last 4 quarters
        const areaName = trendsList[0]?.location?.geographyName;
        const firstMed = recent[0]?.salesTrend?.medSalePrice;
        const lastMed = recent[recent.length - 1]?.salesTrend?.medSalePrice;
        const priceChange = (firstMed && lastMed) ? ((lastMed - firstMed) / firstMed * 100) : null;
        const lastPeriod = recent[recent.length - 1];
        const st = lastPeriod?.salesTrend || lastPeriod;
        return (
          <div style={{ padding: "10px 14px", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#7c3aed" }}>
                Market Trends{areaName ? ` — ${areaName}` : ` — ${zip.trim()}`}
              </div>
              {priceChange != null && (
                <span style={{ fontWeight: 600, fontSize: 12, color: priceChange >= 0 ? "#059669" : "#dc2626" }}>
                  {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(1)}% median price (last year)
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 6 }}>
              {st?.medSalePrice != null && (
                <span><strong>Median:</strong> ${Number(st.medSalePrice).toLocaleString()}</span>
              )}
              {st?.avgSalePrice != null && (
                <span><strong>Avg:</strong> ${Number(st.avgSalePrice).toLocaleString()}</span>
              )}
              {st?.homeSaleCount != null && (
                <span><strong>Sales:</strong> {st.homeSaleCount}</span>
              )}
              {st?.avgDaysOnMarket != null && (
                <span><strong>Avg DOM:</strong> {st.avgDaysOnMarket} days</span>
              )}
              {st?.medPricePerSqFt != null && (
                <span><strong>Med $/sqft:</strong> ${Number(st.medPricePerSqFt).toLocaleString()}</span>
              )}
            </div>
          </div>
        );
      })()}

      {!isLoading && hasSearched && results.length === 0 && investorGroups.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: 12 }}>
          No properties found. Try adjusting your filters.
        </div>
      )}

      {/* Investor mode — grouped view */}
      {!isLoading && mode === "investor" && investorGroups.length > 0 && (
        <>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
            {investorGroups.length} multi-property owner{investorGroups.length === 1 ? "" : "s"} found ({results.length} total properties scanned)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {investorGroups.map((group, idx) => renderInvestorCard(group, idx))}
          </div>
        </>
      )}

      {!isLoading && hasSearched && mode === "investor" && investorGroups.length === 0 && results.length > 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: 12 }}>
          No investor-owned properties found in this zip code. All {results.length} properties appear to be owner-occupied individual owners.
        </div>
      )}

      {/* Standard list view for all other modes */}
      {!isLoading && mode !== "investor" && results.length > 0 && (
        <>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
            {totalCount.toLocaleString()} propert{totalCount === 1 ? "y" : "ies"} found
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {results.map((prop, idx) => renderPropertyCard(prop, idx))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
              <button
                onClick={() => handleSearch(page - 1)}
                disabled={page <= 1 || isLoading}
                style={{
                  padding: "8px 16px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff",
                  cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1, fontSize: 13,
                }}
              >
                Previous
              </button>
              <span style={{ padding: "8px 12px", fontSize: 13, color: "#6b7280" }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => handleSearch(page + 1)}
                disabled={page >= totalPages || isLoading}
                style={{
                  padding: "8px 16px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff",
                  cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.5 : 1, fontSize: 13,
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Radius search results — shown when user clicks "Search Radius" on a property */}
      {mode === "radius" && radiusCenter && (
        <div style={{ marginTop: 24, borderTop: "2px solid #7c3aed", paddingTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#7c3aed", margin: 0 }}>
                Nearby Owners — {radiusMiles} mi radius
              </h3>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                Center: {radiusCenter.address}
              </div>
            </div>
            <button
              onClick={() => { setRadiusCenter(null); setRadiusResults([]); }}
              style={{
                padding: "4px 12px", background: "#f3f4f6", color: "#6b7280", borderRadius: 6, border: "1px solid #e5e7eb",
                fontSize: 12, cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
          {radiusLoading && (
            <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
              Searching nearby properties...
            </div>
          )}
          {!radiusLoading && radiusResults.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", background: "#f9fafb", borderRadius: 8 }}>
              No nearby properties found.
            </div>
          )}
          {!radiusLoading && radiusResults.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                {radiusResults.length} nearby propert{radiusResults.length === 1 ? "y" : "ies"} found
                — {radiusResults.filter((p) => getOwnerName(p)).length} with owner/mortgagor info
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {radiusResults.map((prop, idx) => (
                  <div
                    key={prop.identifier?.attomId || idx}
                    onClick={() => setSelectedProperty(prop)}
                    style={{
                      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12,
                      cursor: "pointer", transition: "box-shadow 0.15s", fontSize: 13,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{getAddress(prop)}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, color: "#6b7280" }}>
                      <span>
                        {getOwnerName(prop)
                          ? `${isOwnerFromMortgage(prop) ? "Mortgagor" : "Owner"}: ${getOwnerName(prop)}`
                          : "Owner: Not listed"}
                        {isOwnerFromMortgage(prop) && (
                          <span style={{ marginLeft: 4, padding: "0px 6px", background: "#e0f2fe", color: "#0369a1", borderRadius: 8, fontSize: 10, fontWeight: 600 }}>
                            via Mortgage Record
                          </span>
                        )}
                      </span>
                      {getMailingAddress(prop) && (
                        <span>{resolveOwner(prop)?.mailingAddressOneLine?.trim() ? "Mailing" : "Mortgagor Address"}: {getMailingAddress(prop)}</span>
                      )}
                      {getPropertyValue(prop) != null && (
                        <span><strong>Value:</strong> {fmt(getPropertyValue(prop)!)}</span>
                      )}
                      {getMortgageAmount(prop) != null && (
                        <span><strong>Mortgage:</strong> {fmt(getMortgageAmount(prop)!)}</span>
                      )}
                      {getMortgageLender(prop) && (
                        <span><strong>Lender:</strong> {getMortgageLender(prop)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {!hasSearched && !isLoading && (
        <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", background: "#f9fafb", borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>
            {mode === "absentee" && "\u{1F3E0}"}
            {mode === "equity" && "\u{1F4B0}"}
            {mode === "foreclosure" && "\u{26A0}\u{FE0F}"}
            {mode === "radius" && "\u{1F4CD}"}
            {mode === "investor" && "\u{1F4BC}"}
          </div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {mode === "absentee" && "Find Absentee Owners"}
            {mode === "equity" && "Find High-Equity / Likely Sellers"}
            {mode === "foreclosure" && "Find Distressed Properties"}
            {mode === "radius" && "Just Sold Farming"}
            {mode === "investor" && "Find Investor Portfolios"}
          </div>
          <div style={{ fontSize: 13, maxWidth: 500, margin: "0 auto" }}>
            {mode === "absentee" && "Search for non-owner-occupied properties by zip code. These owners are managing properties remotely and may be motivated to sell."}
            {mode === "equity" && "Search for long-tenure homeowners based on their purchase date. Owners who bought 10+ years ago have built significant equity through appreciation — ideal for \"unlock your equity\" listing campaigns."}
            {mode === "foreclosure" && "Find properties with underwater mortgages, high loan-to-value ratios, or declining assessments. These owners may be under financial pressure and open to selling."}
            {mode === "radius" && "Search by the address of a recently sold property, or find recent sales in a zip code. Click any sold property to view the Nearby Homes tab — it shows all homeowners within your farming radius with names and mailing addresses for postcard campaigns."}
            {mode === "investor" && "Find corporate entities, absentee owners, and multi-property investors in a zip code. Shows owner contact info, mailing addresses, mortgage details, and estimated values."}
          </div>
        </div>
      )}

      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          searchContext={{ absenteeowner: mode === "absentee" ? "absentee" : undefined }}
          onClose={() => setSelectedProperty(null)}
          farmingContext={mode === "radius" ? { radiusMiles, propertyType } : undefined}
        />
      )}
    </div>
  );
}
