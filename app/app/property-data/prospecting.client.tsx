"use client";

import { useState } from "react";
import PropertyDetailModal from "./property-detail-modal.client";

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
    owner1?: { fullName?: string }; owner2?: { fullName?: string };
    corporateIndicator?: string; absenteeOwnerStatus?: string; mailingAddressOneLine?: string; ownerOccupied?: string;
  };
  assessment?: {
    appraised?: { apprTtlValue?: number };
    assessed?: { assdTtlValue?: number; assdImprValue?: number; assdLandValue?: number };
    market?: { mktTtlValue?: number };
    tax?: { taxAmt?: number; taxYear?: number };
  };
  sale?: {
    amount?: { saleAmt?: number; saleTransDate?: string; saleRecDate?: string; saleDocType?: string; salePrice?: number };
    // ATTOM sometimes places date fields at the sale level too
    saleTransDate?: string; saleRecDate?: string; saleSearchDate?: string;
  };
  avm?: { amount?: { value?: number; high?: number; low?: number; scr?: number }; eventDate?: string };
  mortgage?: { amount?: number; lender?: { fullName?: string }; term?: string; date?: string };
  foreclosure?: { actionType?: string; filingDate?: string; auctionDate?: string; defaultAmount?: number; originalLoanAmount?: number; auctionLocation?: string };
  utilities?: { coolingType?: string; heatingType?: string; sewerType?: string; waterType?: string };
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
  const ind = (p.summary?.absenteeInd || "").toUpperCase();
  const status = (p.owner?.absenteeOwnerStatus || "").toUpperCase();
  const occupied = (p.owner?.ownerOccupied || "").toUpperCase();

  // absenteeInd: "ABSENTEE OWNER", "ABSENTEE", or single-char "A"
  if (ind.includes("ABSENTEE") || ind === "A") return true;
  // absenteeOwnerStatus: "Absentee", "Absentee Owner", etc.
  if (status.includes("ABSENTEE")) return true;
  // ownerOccupied: "N" means not owner-occupied (= absentee)
  if (occupied === "N") return true;

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
}

function getDistressSignals(p: AttomProperty): DistressSignals {
  const mortgageAmount = p.mortgage?.amount ?? null;
  const avmValue = p.avm?.amount?.value ?? null;
  const assdTotal = p.assessment?.assessed?.assdTtlValue ?? null;
  const mktTotal = p.assessment?.market?.mktTtlValue ?? null;

  let ltvPct: number | null = null;
  let isUnderwater = false;
  let highLtv = false;

  if (mortgageAmount != null && avmValue != null && avmValue > 0) {
    ltvPct = (mortgageAmount / avmValue) * 100;
    isUnderwater = mortgageAmount > avmValue;
    highLtv = ltvPct >= 80;
  }

  // Assessment drop: market value less than 90% of assessed value → tax overpayment pressure
  const assessmentDrop = (mktTotal != null && assdTotal != null && assdTotal > 0)
    ? mktTotal < assdTotal * 0.9
    : false;

  const isDistressed = isUnderwater || highLtv || assessmentDrop;

  return { isDistressed, isUnderwater, highLtv, ltvPct, mortgageAmount, avmValue, assessmentDrop };
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
 *
 * ATTOM nests sale dates inconsistently across response formats:
 *  - sale.amount.saleTransDate  (most common in expandedprofile)
 *  - sale.amount.saleRecDate    (recording date — close to transaction)
 *  - sale.saleTransDate         (sometimes at sale root level)
 *  - sale.saleRecDate
 *  - sale.saleSearchDate
 *  - mortgage.date              (fallback — mortgage origination ~ purchase)
 */
function getOwnershipDate(p: AttomProperty): Date | null {
  return (
    parseDate(p.sale?.amount?.saleTransDate) ||
    parseDate(p.sale?.amount?.saleRecDate) ||
    parseDate(p.sale?.saleTransDate) ||
    parseDate(p.sale?.saleRecDate) ||
    parseDate(p.sale?.saleSearchDate) ||
    parseDate(p.mortgage?.date) ||
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
  oldestYearBuilt: number | null;
  avgYearBuilt: number | null;
}

function groupByOwner(properties: AttomProperty[]): InvestorGroup[] {
  const groups = new Map<string, AttomProperty[]>();

  for (const p of properties) {
    const ownerName = p.owner?.owner1?.fullName?.trim();
    const mail = p.owner?.mailingAddressOneLine?.trim();
    if (!ownerName) continue;
    // Group by name + mailing address for accuracy
    const key = `${ownerName.toLowerCase()}|${(mail || "").toLowerCase()}`;
    const list = groups.get(key) || [];
    list.push(p);
    groups.set(key, list);
  }

  // Only keep owners with 2+ properties
  const result: InvestorGroup[] = [];
  for (const [, props] of groups) {
    if (props.length < 2) continue;
    const ownerName = props[0].owner?.owner1?.fullName || "Unknown";
    const mailingAddress = props[0].owner?.mailingAddressOneLine || "";
    const isCorporate = props[0].owner?.corporateIndicator === "Y";
    const years = props.map((p) => p.building?.summary?.yearBuilt).filter((y): y is number => y != null);

    result.push({
      ownerName,
      mailingAddress,
      isCorporate,
      properties: props,
      totalTaxBurden: props.reduce((sum, p) => sum + (p.assessment?.tax?.taxAmt || 0), 0),
      totalAvmValue: props.reduce((sum, p) => sum + (p.avm?.amount?.value || 0), 0),
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

  // Radius farming radius
  const [radiusMiles, setRadiusMiles] = useState("0.5");

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

  /**
   * Fetch a single page of ATTOM results with the current mode's filters.
   */
  const fetchPage = async (pageNum: number) => {
    const params = new URLSearchParams();
    params.set("postalcode", zip.trim());
    params.set("propertytype", propertyType);
    params.set("page", String(pageNum));
    params.set("pagesize", String(pageSize));

    if (mode === "absentee" || mode === "equity" || mode === "investor") {
      params.set("endpoint", "expanded");
    }
    if (mode === "foreclosure") {
      params.set("endpoint", "expanded");
    }
    if (mode === "radius") {
      params.set("endpoint", "salesnapshot");
      params.set("startSaleSearchDate", startDate);
      params.set("endSaleSearchDate", endDate);
    }

    const res = await fetch(`/api/integrations/attom/property?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to fetch data");
    }

    return data;
  };

  const handleSearch = async (pageNum = 1) => {
    if (!zip.trim()) {
      setError("Enter a zip code.");
      return;
    }

    setIsLoading(true);
    setError("");
    setPage(pageNum);
    setInvestorGroups([]);

    try {
      // Modes that require client-side filtering or multi-page accumulation.
      // ATTOM's expandedprofile doesn't support server-side filtering for
      // absentee status, distress signals, owner tenure, or multi-property
      // owner grouping, so we scan multiple pages and filter/group locally.
      const needsMultiPage = mode === "absentee" || mode === "foreclosure" || mode === "investor" || mode === "equity";

      if (needsMultiPage) {
        let allRaw: AttomProperty[] = [];
        const maxPages = 3;

        for (let pg = 1; pg <= maxPages; pg++) {
          const data = await fetchPage(pg);
          const raw: AttomProperty[] = data.property || [];
          if (raw.length === 0) break;
          allRaw = allRaw.concat(raw);
          // Stop if ATTOM returned fewer than a full page (no more data)
          if (raw.length < pageSize) break;
        }

        if (mode === "absentee") {
          const matches = allRaw.filter(isAbsenteeOwner);
          setResults(matches);
          setTotalCount(matches.length);
          setInvestorGroups([]);
        } else if (mode === "foreclosure") {
          // Detect distress from mortgage/AVM/assessment data
          const matches = allRaw.filter((p) => getDistressSignals(p).isDistressed);
          // Sort: underwater first, then by LTV descending
          matches.sort((a, b) => {
            const sa = getDistressSignals(a);
            const sb = getDistressSignals(b);
            if (sa.isUnderwater !== sb.isUnderwater) return sa.isUnderwater ? -1 : 1;
            return (sb.ltvPct ?? 0) - (sa.ltvPct ?? 0);
          });
          setResults(matches);
          setTotalCount(matches.length);
          setInvestorGroups([]);
        } else if (mode === "equity") {
          // Filter by owner tenure using the actual purchase/sale date.
          // The old maxYearBuilt filter only checked when the property was
          // BUILT, not when the current owner purchased it.
          const minYears = parseInt(minYearsOwned, 10) || 10;
          const cutoffDate = new Date();
          cutoffDate.setFullYear(cutoffDate.getFullYear() - minYears);
          const minAvm = minAvmValue ? Number(minAvmValue) : 0;

          const matches = allRaw.filter((p) => {
            // Must have AVM data to estimate equity
            const avmVal = p.avm?.amount?.value;
            if (!avmVal || avmVal <= 0) return false;
            // Client-side AVM floor filter (replaces broken server-side minavmvalue)
            if (minAvm > 0 && avmVal < minAvm) return false;

            // Must have a sale/ownership date to determine tenure
            const ownershipDate = getOwnershipDate(p);
            if (!ownershipDate) return false;
            // Owner must have purchased before the cutoff
            if (ownershipDate > cutoffDate) return false;

            // Must have positive equity (AVM > purchase price)
            const purchasePrice = p.sale?.amount?.saleAmt || p.sale?.amount?.salePrice || 0;
            if (purchasePrice > 0 && avmVal <= purchasePrice) return false;
            return true;
          });

          // Sort by estimated equity descending (highest equity first)
          matches.sort((a, b) => {
            const aAvm = a.avm?.amount?.value || 0;
            const aSale = a.sale?.amount?.saleAmt || a.sale?.amount?.salePrice || 0;
            const bAvm = b.avm?.amount?.value || 0;
            const bSale = b.sale?.amount?.saleAmt || b.sale?.amount?.salePrice || 0;
            return (bAvm - bSale) - (aAvm - aSale);
          });

          setResults(matches);
          setTotalCount(matches.length);
          setInvestorGroups([]);
        } else {
          // Investor mode: group across all fetched pages
          const groups = groupByOwner(allRaw);
          setInvestorGroups(groups);
          setTotalCount(groups.length);
          setResults(allRaw);
        }

        setHasSearched(true);
        return;
      }

      // Standard fetch for non-filtered modes (radius)
      const data = await fetchPage(pageNum);
      const properties: AttomProperty[] = data.property || [];

      setInvestorGroups([]);
      setResults(properties);
      setTotalCount(data.status?.total || properties.length);
      setHasSearched(true);
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
      desc: "Underwater mortgages, high LTV, and assessment drops — owners under financial pressure who may need to sell.",
      color: "#dc2626",
    },
    {
      id: "radius",
      label: "Just Sold Farming",
      desc: "Recent sales for \"Your Neighbor Just Sold\" campaigns with real AVM data and owner context.",
      color: "#7c3aed",
    },
    {
      id: "investor",
      label: "Investor Portfolios",
      desc: "Multi-property owners in a zip code — find \"tired landlords\" with high tax burdens and aging properties.",
      color: "#b45309",
    },
  ];

  // ── Render helpers for each mode ─────────────────────────────────────────

  const renderPropertyCard = (prop: AttomProperty, idx: number) => {
    const avmVal = prop.avm?.amount?.value;
    const avmHigh = prop.avm?.amount?.high;
    const avmLow = prop.avm?.amount?.low;
    const lastSale = prop.sale?.amount?.saleAmt || prop.sale?.amount?.salePrice;
    const owner = prop.owner?.owner1?.fullName;
    const absentee = isAbsenteeOwner(prop);
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
    const distress = mode === "foreclosure" ? getDistressSignals(prop) : null;

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
            {owner && (
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                Owner: {owner}
                {absentee && (
                  <span style={{ marginLeft: 6, padding: "1px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                    Absentee
                  </span>
                )}
                {prop.owner?.corporateIndicator === "Y" && (
                  <span style={{ marginLeft: 6, padding: "1px 8px", background: "#ede9fe", color: "#6d28d9", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                    Corporate
                  </span>
                )}
                {prop.owner?.mailingAddressOneLine && (
                  <span style={{ marginLeft: 6, fontSize: 12, color: "#9ca3af" }}>
                    (Mail: {prop.owner.mailingAddressOneLine})
                  </span>
                )}
              </div>
            )}

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
                  {prop.mortgage?.lender?.fullName && (
                    <span><strong>Lender:</strong> {prop.mortgage.lender.fullName}</span>
                  )}
                </div>
                {distress.isUnderwater && distress.mortgageAmount != null && distress.avmValue != null && (
                  <div style={{ marginTop: 4, color: "#dc2626", fontWeight: 600, fontSize: 11 }}>
                    Negative equity: {fmt(distress.mortgageAmount - distress.avmValue)} (mortgage exceeds AVM)
                  </div>
                )}
              </div>
            )}

            {/* Radius farming — sale info */}
            {mode === "radius" && lastSale != null && (
              <div style={{ marginTop: 6, padding: "6px 10px", background: "#f5f3ff", borderRadius: 6, fontSize: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  <span><strong>Sold:</strong> {fmt(lastSale)}</span>
                  {prop.sale?.amount?.saleTransDate && (
                    <span><strong>Date:</strong> {prop.sale.amount.saleTransDate}</span>
                  )}
                  {sqft && lastSale ? (
                    <span><strong>$/sqft:</strong> ${Math.round(lastSale / sqft).toLocaleString()}</span>
                  ) : null}
                </div>
                {avmVal != null && (
                  <div style={{ marginTop: 4, fontSize: 11, color: "#6b7280" }}>
                    AVM range: {fmt(avmLow)} – {fmt(avmHigh)} (est. {fmt(avmVal)})
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", textAlign: "right" }}>
            {(mode === "radius") && lastSale != null && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Sale Price</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#7c3aed" }}>{fmt(lastSale)}</div>
                {prop.sale?.amount?.saleTransDate && (
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{prop.sale.amount.saleTransDate}</div>
                )}
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
            {mode === "foreclosure" && distress?.mortgageAmount != null && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Mortgage</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{fmt(distress.mortgageAmount)}</div>
              </div>
            )}
            {(mode === "absentee" || mode === "equity") && avmVal != null && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>AVM</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#059669" }}>{fmt(avmVal)}</div>
              </div>
            )}
            {mode === "equity" && equity != null && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Est. Equity</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: equity > 0 ? "#a16207" : "#dc2626" }}>
                  {equity > 0 ? "+" : ""}{fmt(equity)}
                  {equityPct != null && (
                    <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 4 }}>
                      ({equityPct.toFixed(0)}%)
                    </span>
                  )}
                </div>
              </div>
            )}
            {mode === "absentee" && lastSale != null && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Last Sale</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{fmt(lastSale)}</div>
              </div>
            )}
            {mode === "equity" && yearsOwned != null && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Tenure</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: yearsOwned >= 20 ? "#059669" : "#10b981" }}>{yearsOwned} yrs</div>
              </div>
            )}
            {taxAmt != null && (mode === "investor" || mode === "equity") && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Tax/yr</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{fmt(taxAmt)}</div>
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
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Total AVM</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#059669" }}>{fmt(group.totalAvmValue)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Tax Burden/yr</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: group.totalTaxBurden > 20000 ? "#dc2626" : "#374151" }}>
                  {fmt(group.totalTaxBurden)}
                </div>
              </div>
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
            onClick={() => { setMode(m.id); setResults([]); setInvestorGroups([]); setHasSearched(false); setError(""); setExpandedInvestor(null); }}
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
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Zip Code</label>
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="e.g. 80211"
              onKeyDown={(e) => e.key === "Enter" && handleSearch(1)}
              style={{ width: 140, padding: "8px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 6 }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Property Type</label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
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
          {(mode === "absentee" || mode === "foreclosure" || mode === "investor" || mode === "equity")
            ? "Scanning ATTOM records (multiple pages)..."
            : "Searching ATTOM records..."}
        </div>
      )}

      {!isLoading && hasSearched && results.length === 0 && (
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
          No multi-property owners found in this zip code. All {results.length} properties are individually owned.
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
            {mode === "radius" && "Just Sold Radius Farming"}
            {mode === "investor" && "Find Investor Portfolios"}
          </div>
          <div style={{ fontSize: 13, maxWidth: 500, margin: "0 auto" }}>
            {mode === "absentee" && "Search for non-owner-occupied properties by zip code. These owners are managing properties remotely and may be motivated to sell."}
            {mode === "equity" && "Search for long-tenure homeowners based on their purchase date. Owners who bought 10+ years ago have built significant equity through appreciation — ideal for \"unlock your equity\" listing campaigns."}
            {mode === "foreclosure" && "Find properties with underwater mortgages, high loan-to-value ratios, or declining assessments. These owners may be under financial pressure and open to selling."}
            {mode === "radius" && "Find recent sales in a zip code. Use the data to build \"Your Neighbor's Home Just Sold for $X\" prospecting campaigns with real comparable data."}
            {mode === "investor" && "Identify multi-property owners in a zip code. Find \"tired landlords\" with high tax burdens and aging properties who may want to sell."}
          </div>
        </div>
      )}

      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}
