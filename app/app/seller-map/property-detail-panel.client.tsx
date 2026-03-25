"use client";

import { useState, useEffect, useCallback } from "react";
import type { ScoredProperty, SellerFactor } from "@/lib/scoring/seller-motivation-score";
import { getSellerColor, getSellerLabel } from "@/lib/scoring/seller-motivation-score";
import { fmtPrice } from "@/lib/utils";

type DetailTab = "overview" | "building" | "financial" | "sales-history" | "investment" | "comps" | "ownership" | "neighborhood" | "federal" | "outreach";

interface OutreachDraft {
  address: string;
  ownerName?: string;
  letterBody: string;
  subject: string;
  smsMessage: string;
  talkingPoints: string[];
}

interface OutreachResult {
  drafts: OutreachDraft[];
  campaignTheme: string;
  bestTimeToSend: string;
}

type PropertyDetail = {
  address: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  county?: string;
  lat?: number;
  lng?: number;
  propertyType?: string;
  lastSaleDate?: string;
  lastSalePrice?: number;
  ownerOccupied?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  lotSize?: number;
  yearBuilt?: number;
  features?: {
    architectureType?: string;
    cooling?: boolean;
    coolingType?: string;
    exteriorType?: string;
    fireplace?: boolean;
    fireplaceType?: string;
    floorCount?: number;
    foundationType?: string;
    garage?: boolean;
    garageSpaces?: number;
    garageType?: string;
    heating?: boolean;
    heatingType?: string;
    pool?: boolean;
    poolType?: string;
    roofType?: string;
    roomCount?: number;
    unitCount?: number;
    viewType?: string;
  };
  zoning?: string;
  taxAssessments?: Record<string, { year: number; value: number; land: number; improvements: number }>;
  propertyTaxes?: Record<string, { year: number; total: number }>;
  hoa?: { fee: number };
  equity?: number;
  ltv?: number;
  modelValue?: number;
  avmValue?: number;
  avmLow?: number;
  avmHigh?: number;
  totalMarketValue?: number;
  marketMedianPrice?: number;
  marketMedianPricePerSqft?: number;
  marketAvgDaysOnMarket?: number;
  marketTotalListings?: number;
  marketNewListings?: number;
  marketPriceTrend?: number;
  marketMedianRent?: number;
  forecloseCode?: string;
  totalLienCount?: number;
  totalLienBalance?: number;
  ownerParcelCount?: number;
  ownerResCount?: number;
  ownerComCount?: number;
  // Investment metrics
  rentalAvm?: number;
  rentalAvmLow?: number;
  rentalAvmHigh?: number;
  rentalAvmSource?: string;
  capRate?: number;
  cashOnCash?: number;
  annualRent?: number;
  monthlyMortgage?: number;
  owner?: {
    names: string[];
    type: string;
    mailingAddress?: {
      formattedAddress: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  saleHistory?: Record<string, { event: string; date: string; price: number }>;
  comps?: {
    id: string;
    address: string;
    lat: number;
    lng: number;
    price: number;
    beds: number;
    baths: number;
    sqft: number;
    yearBuilt: number;
    distance: number;
    daysOnMarket: number;
    correlation: number;
    status: string;
    listingType: string;
    listedDate: string;
  }[];
  saleListings?: {
    address: string;
    price: number;
    status: string;
    listedDate: string;
    daysOnMarket: number;
    mlsNumber?: string;
    listingType?: string;
    listingAgent?: {
      name: string;
      phone?: string;
      email?: string;
    };
  }[];
};

type Props = {
  property: ScoredProperty;
  onClose: () => void;
  onAddToCRM?: (property: ScoredProperty) => void;
};

export function PropertyDetailPanel({ property, onClose }: Props) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const [detail, setDetail] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [outreach, setOutreach] = useState<OutreachResult | null>(null);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [outreachError, setOutreachError] = useState("");
  const [neighborhoodData, setNeighborhoodData] = useState<any>(null);
  const [neighborhoodLoading, setNeighborhoodLoading] = useState(false);
  const [federalData, setFederalData] = useState<any>(null);
  const [federalLoading, setFederalLoading] = useState(false);

  const handleDraftOutreach = useCallback(async () => {
    setOutreachLoading(true);
    setOutreachError("");
    setOutreach(null);
    setTab("outreach");
    try {
      const prospectProp = {
        address: property.address,
        ownerName: property.owner,
        isAbsentee: property.absentee,
        avmValue: property.estimatedValue,
        equityAmount: property.equity,
        ltvPct: property.ltv,
        yearsOwned: property.ownershipYears,
        yearBuilt: property.yearBuilt,
        beds: property.beds,
        baths: property.baths,
        sqft: property.sqft,
        propertyType: property.propertyType,
      };

      const res = await fetch("/api/prospecting-ai/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "equity",
          properties: [prospectProp],
          market: { zipCode: property.zip || "unknown" },
          agentName: "Agent",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Outreach generation failed");
      setOutreach(data);
    } catch (err: unknown) {
      setOutreachError(err instanceof Error ? err.message : "Outreach generation failed");
    } finally {
      setOutreachLoading(false);
    }
  }, [property]);

  useEffect(() => {
    setLoading(true);
    setTab("overview");
    setOutreach(null);
    setOutreachError("");
    setNeighborhoodData(null);
    setFederalData(null);

    const params = new URLSearchParams({
      address: property.address,
      ...(property.lat ? { lat: String(property.lat) } : {}),
      ...(property.lng ? { lng: String(property.lng) } : {}),
    });

    fetch(`/api/seller-map/property-detail?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setDetail(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [property.address, property.lat, property.lng]);

  // Fetch neighborhood data when Neighborhood tab is selected
  useEffect(() => {
    if (tab !== "neighborhood" || neighborhoodData || neighborhoodLoading) return;
    const zip = property.zip || detail?.zipCode;
    const lat = property.lat;
    const lng = property.lng;
    if (!zip && !lat) return;

    setNeighborhoodLoading(true);
    const params = new URLSearchParams({ endpoint: "neighborhood" });

    // Parse address parts from the property address string
    const addrParts = property.address.split(",").map((s: string) => s.trim());
    if (addrParts.length >= 1) params.set("address1", addrParts[0]);
    if (property.city && property.state) params.set("address2", `${property.city}, ${property.state}`);
    if (zip) params.set("postalcode", zip);
    if (lat) params.set("latitude", String(lat));
    if (lng) params.set("longitude", String(lng));

    fetch(`/api/integrations/attom/property?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setNeighborhoodData(data);
      })
      .catch(() => {})
      .finally(() => setNeighborhoodLoading(false));
  }, [tab, neighborhoodData, neighborhoodLoading, property, detail?.zipCode]);

  // Fetch federal data when Area Intel tab is selected
  useEffect(() => {
    if (tab !== "federal" || federalData || federalLoading) return;
    const zip = property.zip || detail?.zipCode;
    if (!zip) return;

    setFederalLoading(true);
    const params = new URLSearchParams({
      endpoint: "supplement",
      zipCode: zip,
      ...(property.state ? { state: property.state } : {}),
    });

    // Parse address for more specific data
    const addrParts = property.address.split(",").map((s: string) => s.trim());
    if (addrParts.length >= 1) params.set("address", addrParts[0]);
    if (property.city) params.set("city", property.city);

    fetch(`/api/integrations/federal-data/query?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success !== false) setFederalData(data);
      })
      .catch(() => {})
      .finally(() => setFederalLoading(false));
  }, [tab, federalData, federalLoading, property, detail?.zipCode]);

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "building", label: "Building" },
    { key: "financial", label: "Financial" },
    { key: "sales-history", label: "Sales History" },
    { key: "investment", label: "Investment" },
    { key: "comps", label: "Comps" },
    { key: "ownership", label: "Ownership" },
    { key: "neighborhood", label: "Neighborhood" },
    { key: "federal", label: "Area Intel" },
    { key: "outreach", label: "Outreach" },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{property.address}</h3>
            {property.city && (
              <p className="text-xs text-gray-500">
                {property.city}, {property.state} {property.zip}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col items-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                style={{ backgroundColor: getSellerColor(property.level) }}
              >
                {property.score}
              </div>
              <span
                className="text-[10px] font-medium mt-0.5"
                style={{ color: getSellerColor(property.level) }}
              >
                {getSellerLabel(property.level)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none ml-1"
              title="Close"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex gap-3 mt-2 text-xs text-gray-600">
          {property.beds && <span>{property.beds} bd</span>}
          {property.baths && <span>{property.baths} ba</span>}
          {property.sqft && <span>{property.sqft.toLocaleString()} sqft</span>}
          {property.yearBuilt && <span>Built {property.yearBuilt}</span>}
          {(detail?.avmValue || property.estimatedValue) && (
            <span className="font-medium">
              {fmtPrice(detail?.avmValue || property.estimatedValue || 0)}
            </span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b text-xs">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 font-medium transition-colors ${
              tab === t.key
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-500">
            Loading details...
          </div>
        ) : (
          <>
            {tab === "overview" && (
              <OverviewTab property={property} detail={detail} onDraftOutreach={handleDraftOutreach} outreachLoading={outreachLoading} />
            )}
            {tab === "building" && <BuildingTab detail={detail} />}
            {tab === "financial" && <FinancialTab property={property} detail={detail} />}
            {tab === "sales-history" && <SalesHistoryTab property={property} />}
            {tab === "investment" && <InvestmentTab property={property} detail={detail} />}
            {tab === "comps" && <CompsTab detail={detail} />}
            {tab === "ownership" && <OwnershipTab property={property} detail={detail} />}
            {tab === "neighborhood" && <NeighborhoodTab data={neighborhoodData} loading={neighborhoodLoading} />}
            {tab === "federal" && <FederalTab data={federalData} loading={federalLoading} />}
            {tab === "outreach" && (
              <OutreachTab
                outreach={outreach}
                loading={outreachLoading}
                error={outreachError}
                onGenerate={handleDraftOutreach}
              />
            )}
          </>
        )}

        {/* Reliability Disclaimer */}
        <div className="px-4 py-3 border-t border-gray-100 mt-auto">
          <p className="text-[9px] text-gray-400 leading-relaxed text-center">
            Information presented is deemed reliable but not guaranteed and should be used accordingly.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────

function getFactorByName(factors: ScoredProperty["factors"], name: string) {
  return factors.find((f) => f.name === name) || null;
}

/**
 * Re-score equity from detail data when the original factor scored 0
 * (the bulk search may not include LTV/equity fields).
 */
function reScoreEquityFromDetail(
  originalFactor: SellerFactor | null,
  detail: PropertyDetail | null,
  property: ScoredProperty,
): SellerFactor | null {
  if (!originalFactor) return null;
  // If already scored, keep original
  if (originalFactor.points > 0) return originalFactor;

  const max = originalFactor.maxPoints;
  const ltv = detail?.ltv ?? property.ltv;
  const equity = detail?.equity ?? property.equity;
  const value = detail?.modelValue || property.estimatedValue;

  let points = 0;
  let description = originalFactor.description;

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
  } else if (equity != null && value) {
    const equityPct = Math.round((equity / value) * 100);
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

  if (points === 0) return originalFactor;
  return { ...originalFactor, points, description };
}

const INSIGHT_CARDS: {
  name: string;
  icon: string;
  colors: { bg: string; border: string; text: string; bar: string };
}[] = [
  {
    name: "High Equity",
    icon: "\u25B2",
    colors: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", bar: "bg-emerald-500" },
  },
  {
    name: "Distress Signals",
    icon: "\u26A0",
    colors: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", bar: "bg-red-500" },
  },
  {
    name: "Multi-Property Owner",
    icon: "\u229E",
    colors: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", bar: "bg-purple-500" },
  },
  {
    name: "Tax Assessment Gap",
    icon: "\u0024",
    colors: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", bar: "bg-amber-500" },
  },
];

function exportPropertyToExcel(property: ScoredProperty, detail: PropertyDetail | null) {
  // Build rows as tab-separated values (TSV) — pastes cleanly into Excel/Sheets
  const rows: string[][] = [];
  const add = (section: string, label: string, value: any) => {
    if (value == null || value === "") return;
    rows.push([section, label, String(value)]);
  };

  // Property Info
  add("Property", "Address", property.address);
  add("Property", "City", property.city);
  add("Property", "State", property.state);
  add("Property", "Zip", property.zip);
  add("Property", "Type", detail?.propertyType || property.propertyType);
  add("Property", "County", detail?.county);
  add("Property", "Zoning", detail?.zoning);
  add("Property", "Bedrooms", property.beds);
  add("Property", "Bathrooms", property.baths);
  add("Property", "Square Footage", property.sqft);
  add("Property", "Lot Size", detail?.lotSize);
  add("Property", "Year Built", property.yearBuilt);
  add("Property", "Owner Occupied", detail?.ownerOccupied != null ? (detail.ownerOccupied ? "Yes" : "No") : undefined);

  // Building Features
  const f = detail?.features;
  if (f) {
    add("Building", "Architecture", f.architectureType);
    add("Building", "Exterior", f.exteriorType);
    add("Building", "Foundation", f.foundationType);
    add("Building", "Roof", f.roofType);
    add("Building", "Heating", f.heatingType);
    add("Building", "Cooling", f.coolingType);
    add("Building", "Fireplace", f.fireplaceType || (f.fireplace ? "Yes" : undefined));
    add("Building", "Garage", f.garageType ? `${f.garageType}${f.garageSpaces ? ` (${f.garageSpaces})` : ""}` : (f.garage ? "Yes" : undefined));
    add("Building", "Pool", f.poolType || (f.pool ? "Yes" : undefined));
    add("Building", "Stories", f.floorCount);
    add("Building", "Rooms", f.roomCount);
  }

  // Financial
  add("Financial", "AVM", detail?.avmValue);
  add("Financial", "AVM Low", detail?.avmLow);
  add("Financial", "AVM High", detail?.avmHigh);
  if (detail?.avmValue && detail?.avmLow != null && detail?.avmHigh != null) {
    const range = detail.avmHigh - detail.avmLow;
    const pct = range / detail.avmValue;
    const confidence = Math.max(0, Math.min(100, Math.round((1 - pct / 0.4) * 100)));
    add("Financial", "Confidence Score", `${confidence}%`);
  }
  add("Financial", "Equity", detail?.equity ?? property.equity);
  add("Financial", "LTV %", detail?.ltv ?? property.ltv);
  add("Financial", "HOA Fee", detail?.hoa?.fee);
  add("Financial", "Last Sale Date", detail?.lastSaleDate || property.lastSaleDate);
  add("Financial", "Last Sale Price", detail?.lastSalePrice || (property.lastSalePrice ? `$${property.lastSalePrice.toLocaleString()}` : undefined));
  add("Financial", "Ownership Duration", property.ownershipYears != null ? `${property.ownershipYears} years` : (detail?.lastSaleDate || property.lastSaleDate ? undefined : "No sale date available (non-disclosure state)"));
  add("Financial", "Total Market Value", detail?.totalMarketValue);
  add("Financial", "Foreclosure Code", detail?.forecloseCode);
  add("Financial", "Lien Count", detail?.totalLienCount);
  add("Financial", "Lien Balance", detail?.totalLienBalance);

  // Investment metrics
  if (detail?.rentalAvm) {
    add("Investment", "Market Rent", `$${detail.rentalAvm.toLocaleString()}/mo`);
  }
  if (detail?.rentalAvmLow != null && detail?.rentalAvmHigh != null) {
    add("Investment", "Rent Range", `$${detail.rentalAvmLow.toLocaleString()} – $${detail.rentalAvmHigh.toLocaleString()}/mo`);
  }
  if (detail?.annualRent) {
    add("Investment", "Annual Rent", `$${detail.annualRent.toLocaleString()}`);
  }
  if (detail?.capRate != null) {
    add("Investment", "Cap Rate", `${detail.capRate}%`);
  }
  if (detail?.monthlyMortgage) {
    add("Investment", "Est. Monthly Mortgage", `$${detail.monthlyMortgage.toLocaleString()}`);
  }
  if (detail?.cashOnCash != null) {
    add("Investment", "Cash-on-Cash Return", `${detail.cashOnCash}%`);
  }
  if (detail?.ownerParcelCount != null && detail.ownerParcelCount > 1) {
    add("Investment", "Owner Portfolio", `${detail.ownerParcelCount} properties`);
  }

  // Tax Assessments
  if (detail?.taxAssessments) {
    for (const [, a] of Object.entries(detail.taxAssessments).sort(([x], [y]) => y.localeCompare(x))) {
      add("Tax Assessment", `${a.year} Total`, a.value);
      add("Tax Assessment", `${a.year} Land`, a.land);
      add("Tax Assessment", `${a.year} Improvements`, a.improvements);
    }
  }

  // Property Taxes
  if (detail?.propertyTaxes) {
    for (const [, t] of Object.entries(detail.propertyTaxes).sort(([x], [y]) => y.localeCompare(x))) {
      add("Property Tax", `${t.year}`, t.total);
    }
  }

  // Ownership
  add("Ownership", "Owner", detail?.owner?.names?.join(", ") || property.owner);
  add("Ownership", "Owner Type", detail?.owner?.type);
  add("Ownership", "Absentee", property.absentee ? "Yes" : "No");
  add("Ownership", "Ownership Years", property.ownershipYears);
  add("Ownership", "Owner Parcel Count", detail?.ownerParcelCount);
  add("Ownership", "Residential Properties", detail?.ownerResCount);
  add("Ownership", "Commercial Properties", detail?.ownerComCount);
  if (detail?.owner?.mailingAddress) {
    add("Ownership", "Mailing Address", detail.owner.mailingAddress.formattedAddress);
    add("Ownership", "Mailing State", detail.owner.mailingAddress.state);
  }

  // Sale History
  if (detail?.saleHistory) {
    for (const [, ev] of Object.entries(detail.saleHistory).sort(([x], [y]) => y.localeCompare(x))) {
      add("Sale History", `${ev.event} (${new Date(ev.date).toLocaleDateString()})`, ev.price);
    }
  }

  // Market Data
  add("Market", "Median Price", detail?.marketMedianPrice);
  add("Market", "Median $/sqft", detail?.marketMedianPricePerSqft);
  add("Market", "Avg Days on Market", detail?.marketAvgDaysOnMarket);
  add("Market", "Active Listings", detail?.marketTotalListings);
  add("Market", "New Listings", detail?.marketNewListings);
  add("Market", "Price Trend %", detail?.marketPriceTrend);
  add("Market", "Median Rent", detail?.marketMedianRent);

  // Scoring
  add("Scoring", "Total Score", property.score);
  add("Scoring", "Level", property.level);
  for (const fac of property.factors) {
    add("Scoring", `${fac.name} (${fac.points}/${fac.maxPoints})`, fac.description);
  }

  // Comps
  if (detail?.comps) {
    for (const c of detail.comps) {
      add("Comparable", c.address, `$${c.price.toLocaleString()} | ${c.beds}bd/${c.baths}ba | ${c.sqft?.toLocaleString() || "?"} sqft | ${c.distance?.toFixed(1) || "?"} mi`);
    }
  }

  // Generate CSV
  const header = "Section,Field,Value";
  const csv = [header, ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");

  // Download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${property.address.replace(/[^a-zA-Z0-9]/g, "_")}_property_data.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function OverviewTab({
  property,
  detail,
  onDraftOutreach,
  outreachLoading,
}: {
  property: ScoredProperty;
  detail: PropertyDetail | null;
  onDraftOutreach?: () => void;
  outreachLoading?: boolean;
}) {
  // Build a single re-scored factors array used by both insight cards and the full list.
  // This ensures equity (and any future re-scored factors) stay consistent everywhere.
  const factors = property.factors.map((f) => {
    if (f.name === "High Equity") {
      return reScoreEquityFromDetail(f, detail, property) || f;
    }
    return f;
  });

  return (
    <div className="space-y-4">
      {/* Key Score Insights */}
      <div className="grid grid-cols-2 gap-2">
        {INSIGHT_CARDS.map((card) => {
          const factor = factors.find((f) => f.name === card.name);
          if (!factor) return null;
          const pct = factor.maxPoints > 0 ? (factor.points / factor.maxPoints) * 100 : 0;
          return (
            <div
              key={card.name}
              className={`rounded-lg border p-2.5 ${card.colors.bg} ${card.colors.border}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-sm ${card.colors.text}`}>{card.icon}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${card.colors.text}`}>
                  {card.name}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-lg font-bold ${card.colors.text}`}>
                  {factor.points}
                </span>
                <span className="text-[10px] text-gray-400">/ {factor.maxPoints}</span>
              </div>
              <div className="h-1 bg-white/60 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full ${card.colors.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1 leading-tight">{factor.description}</p>
            </div>
          );
        })}
      </div>

      {/* Property info */}
      <Section title="Property Info">
        <InfoRow label="Type" value={detail?.propertyType || property.propertyType} />
        <InfoRow label="County" value={detail?.county} />
        <InfoRow label="Zoning" value={detail?.zoning} />
        <InfoRow
          label="Last Sale"
          value={
            detail?.lastSaleDate
              ? `${new Date(detail.lastSaleDate).toLocaleDateString()} — $${(detail.lastSalePrice || 0).toLocaleString()}`
              : undefined
          }
        />
        <InfoRow
          label="Owner Occupied"
          value={detail?.ownerOccupied != null ? (detail.ownerOccupied ? "Yes" : "No") : undefined}
        />
      </Section>

      {/* Score breakdown */}
      <Section title="All Motivation Factors">
        <div className="space-y-2">
          {[...factors]
            .sort((a, b) => b.points - a.points)
            .map((f) => (
              <div key={f.name}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-700">{f.name}</span>
                  <span className="text-gray-500">
                    {f.points}/{f.maxPoints}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-0.5">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(f.points / f.maxPoints) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{f.description}</p>
              </div>
            ))}
        </div>
      </Section>

      {/* Actions */}
      <div className="pt-2 space-y-2">
        {onDraftOutreach && (
          <button
            onClick={onDraftOutreach}
            disabled={outreachLoading}
            className="w-full text-xs bg-indigo-600 text-white py-2 px-3 rounded hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {outreachLoading ? "Drafting..." : "Draft AI Outreach"}
          </button>
        )}
        <button
          onClick={() => exportPropertyToExcel(property, detail)}
          className="w-full text-xs border border-gray-300 py-2 px-3 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export to Excel
        </button>
      </div>
    </div>
  );
}

// ── Building Tab ──────────────────────────────────────────────────────────

function BuildingTab({ detail }: { detail: PropertyDetail | null }) {
  if (!detail) return <EmptyState text="No building data available" />;

  const f = detail.features;

  return (
    <div className="space-y-4">
      <Section title="Structure">
        <InfoRow label="Bedrooms" value={detail.bedrooms} />
        <InfoRow label="Bathrooms" value={detail.bathrooms} />
        <InfoRow label="Square Footage" value={detail.squareFootage?.toLocaleString()} />
        <InfoRow label="Lot Size" value={detail.lotSize ? `${detail.lotSize.toLocaleString()} sqft` : undefined} />
        <InfoRow label="Year Built" value={detail.yearBuilt} />
        <InfoRow label="Stories" value={f?.floorCount} />
        <InfoRow label="Rooms" value={f?.roomCount} />
        <InfoRow label="Units" value={f?.unitCount} />
      </Section>

      {f && (
        <Section title="Features">
          <InfoRow label="Architecture" value={f.architectureType} />
          <InfoRow label="Exterior" value={f.exteriorType} />
          <InfoRow label="Foundation" value={f.foundationType} />
          <InfoRow label="Roof" value={f.roofType} />
          <InfoRow label="Heating" value={f.heatingType || (f.heating ? "Yes" : undefined)} />
          <InfoRow label="Cooling" value={f.coolingType || (f.cooling ? "Yes" : undefined)} />
          <InfoRow label="Fireplace" value={f.fireplaceType || (f.fireplace ? "Yes" : undefined)} />
          <InfoRow label="Garage" value={f.garageType ? `${f.garageType}${f.garageSpaces ? ` (${f.garageSpaces} spaces)` : ""}` : (f.garage ? "Yes" : undefined)} />
          <InfoRow label="Pool" value={f.poolType || (f.pool ? "Yes" : undefined)} />
          <InfoRow label="View" value={f.viewType} />
        </Section>
      )}
    </div>
  );
}

// ── Financial Tab ──────────────────────────────────────────────────────────

function FinancialTab({
  property,
  detail,
}: {
  property: ScoredProperty;
  detail: PropertyDetail | null;
}) {
  // Get sorted tax assessments
  const assessments = detail?.taxAssessments
    ? Object.entries(detail.taxAssessments)
        .sort(([a], [b]) => b.localeCompare(a))
    : [];

  const taxes = detail?.propertyTaxes
    ? Object.entries(detail.propertyTaxes)
        .sort(([a], [b]) => b.localeCompare(a))
    : [];

  return (
    <div className="space-y-4">

      {/* Value Estimates */}
      <Section title="Value Estimates">
        {detail?.avmValue && (
          <InfoRow
            label="AVM"
            value={`${fmtPrice(detail.avmValue)}${detail.avmLow && detail.avmHigh ? ` (${fmtPrice(detail.avmLow)}–${fmtPrice(detail.avmHigh)})` : ""}`}
          />
        )}
        {detail?.avmValue && detail?.avmLow != null && detail?.avmHigh != null && (() => {
          const range = detail.avmHigh - detail.avmLow;
          const pct = range / detail.avmValue;
          // Narrower range = higher confidence: <10% spread = high, >30% = low
          const confidence = Math.max(0, Math.min(100, Math.round((1 - pct / 0.4) * 100)));
          const label = confidence >= 80 ? "High" : confidence >= 50 ? "Moderate" : "Low";
          return <InfoRow label="Confidence Score" value={`${confidence}% (${label})`} />;
        })()}
        <InfoRow label="Equity" value={detail?.equity != null || property.equity != null ? fmtPrice((detail?.equity ?? property.equity) || 0) : undefined} />
        <InfoRow label="LTV" value={detail?.ltv != null || property.ltv != null ? `${detail?.ltv ?? property.ltv}%` : undefined} />
        <InfoRow label="HOA" value={detail?.hoa ? `$${detail.hoa.fee}/mo` : undefined} />
      </Section>

      {/* Distress Indicators */}
      {(detail?.forecloseCode || detail?.totalLienCount) && (
        <Section title="Distress Indicators">
          <InfoRow label="Foreclosure" value={detail.forecloseCode || "None"} />
          <InfoRow label="Liens" value={detail.totalLienCount != null ? String(detail.totalLienCount) : undefined} />
          <InfoRow label="Lien Balance" value={detail.totalLienBalance ? `$${detail.totalLienBalance.toLocaleString()}` : undefined} />
        </Section>
      )}

      {/* Tax Assessments */}
      {assessments.length > 0 && (
        <Section title="Tax Assessments">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="text-left py-1.5 font-medium">Year</th>
                  <th className="text-right py-1.5 font-medium">Total</th>
                  <th className="text-right py-1.5 font-medium">Land</th>
                  <th className="text-right py-1.5 font-medium">Improvements</th>
                </tr>
              </thead>
              <tbody>
                {assessments.slice(0, 5).map(([key, a]) => (
                  <tr key={key} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-700">{a.year}</td>
                    <td className="py-1.5 text-right">${a.value.toLocaleString()}</td>
                    <td className="py-1.5 text-right text-gray-500">${a.land.toLocaleString()}</td>
                    <td className="py-1.5 text-right text-gray-500">${a.improvements.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Property Taxes */}
      {taxes.length > 0 && (
        <Section title="Property Taxes">
          <div className="space-y-1">
            {taxes.slice(0, 5).map(([key, t]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-gray-600">{t.year}</span>
                <span className="font-medium">${t.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Local Market Context */}
      {detail?.marketMedianPrice != null && (
        <Section title="Local Market (Zip)">
          <InfoRow label="Median Price" value={fmtPrice(detail.marketMedianPrice)} />
          <InfoRow label="$/sqft" value={detail.marketMedianPricePerSqft ? `$${detail.marketMedianPricePerSqft.toFixed(0)}` : undefined} />
          <InfoRow label="Avg Days on Market" value={detail.marketAvgDaysOnMarket != null ? `${Math.round(detail.marketAvgDaysOnMarket)}` : undefined} />
          <InfoRow label="Active Listings" value={detail.marketTotalListings} />
          <InfoRow label="New Listings" value={detail.marketNewListings} />
          {detail.marketPriceTrend != null && (
            <InfoRow
              label="Price Trend"
              value={
                <span className={detail.marketPriceTrend >= 0 ? "text-green-600" : "text-red-600"}>
                  {detail.marketPriceTrend >= 0 ? "+" : ""}{detail.marketPriceTrend.toFixed(1)}%
                </span>
              }
            />
          )}
          <InfoRow label="Median Rent" value={detail.marketMedianRent ? `$${detail.marketMedianRent.toLocaleString()}/mo` : undefined} />
        </Section>
      )}

      {/* Active Sale Listings */}
      {detail?.saleListings && detail.saleListings.length > 0 && (
        <Section title="Active Sale Listings">
          <div className="space-y-2">
            {detail.saleListings.map((listing, idx) => (
              <div key={idx} className="border rounded-lg p-2.5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-xs text-gray-700 flex-1">{listing.address}</p>
                  <span className="text-xs font-semibold text-green-700 shrink-0">
                    ${listing.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-500">
                  <span className={`px-1.5 py-0.5 rounded font-medium ${
                    listing.status === "Active"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {listing.status}
                  </span>
                  {listing.listedDate && (
                    <span>Listed {new Date(listing.listedDate).toLocaleDateString()}</span>
                  )}
                  {listing.daysOnMarket != null && (
                    <span>{listing.daysOnMarket} DOM</span>
                  )}
                  {listing.mlsNumber && <span>MLS# {listing.mlsNumber}</span>}
                </div>
                {listing.listingAgent?.name && (
                  <p className="text-[10px] text-gray-400 mt-1">Agent: {listing.listingAgent.name}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Investment Tab ──────────────────────────────────────────────────────────

function InvestmentTab({
  property,
  detail,
}: {
  property: ScoredProperty;
  detail: PropertyDetail | null;
}) {
  const hasRental = detail?.rentalAvm != null;
  const hasInvestment = detail?.capRate != null || detail?.cashOnCash != null;

  return (
    <div className="space-y-4">
      {/* Rental Income */}
      <Section title="Rental Income Estimate">
        {hasRental ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Market Rent</span>
              <span className="text-lg font-bold text-green-700">${detail!.rentalAvm!.toLocaleString()}/mo</span>
            </div>
            {detail?.rentalAvmLow != null && detail?.rentalAvmHigh != null && (
              <InfoRow label="Rent Range" value={`$${detail.rentalAvmLow.toLocaleString()} – $${detail.rentalAvmHigh.toLocaleString()}/mo`} />
            )}
            <InfoRow label="Annual Rent" value={detail?.annualRent ? `$${detail.annualRent.toLocaleString()}` : undefined} />
            {detail?.rentalAvmSource && (
              <InfoRow label="Source" value={detail.rentalAvmSource === "cache" ? "Cached (30-day)" : "RentCast"} />
            )}
          </>
        ) : (
          <p className="text-xs text-gray-400 italic">Loading rental estimate...</p>
        )}
      </Section>

      {/* Investment Returns */}
      {hasInvestment && (
        <Section title="Investment Returns">
          {detail?.capRate != null && (
            <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
              <div>
                <span className="text-xs font-medium text-gray-700">Cap Rate</span>
                <p className="text-[10px] text-gray-400">Annual Rent ÷ Property Value</p>
              </div>
              <span className={`text-sm font-bold ${detail.capRate >= 5 ? "text-green-700" : detail.capRate >= 3 ? "text-amber-600" : "text-red-600"}`}>
                {detail.capRate}%
              </span>
            </div>
          )}
          {detail?.cashOnCash != null && (
            <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
              <div>
                <span className="text-xs font-medium text-gray-700">Cash-on-Cash Return</span>
                <p className="text-[10px] text-gray-400">(Rent − Mortgage) ÷ Down Payment</p>
              </div>
              <span className={`text-sm font-bold ${detail.cashOnCash >= 8 ? "text-green-700" : detail.cashOnCash >= 0 ? "text-amber-600" : "text-red-600"}`}>
                {detail.cashOnCash}%
              </span>
            </div>
          )}
          {detail?.monthlyMortgage && (
            <InfoRow label="Est. Monthly Mortgage" value={`$${detail.monthlyMortgage.toLocaleString()}`} />
          )}
        </Section>
      )}

      {/* Property Value Context */}
      <Section title="Value Context">
        <InfoRow label="Estimated Value" value={detail?.avmValue ? fmtPrice(detail.avmValue) : (property.estimatedValue ? fmtPrice(property.estimatedValue) : undefined)} />
        <InfoRow label="Equity" value={detail?.equity != null ? fmtPrice(detail.equity) : (property.equity != null ? fmtPrice(property.equity) : undefined)} />
        <InfoRow label="LTV" value={detail?.ltv != null ? `${detail.ltv}%` : (property.ltv != null ? `${property.ltv}%` : undefined)} />
        <InfoRow label="HOA" value={detail?.hoa?.fee ? `$${detail.hoa.fee}/mo` : undefined} />
      </Section>

      {/* Owner Portfolio */}
      {(detail?.ownerParcelCount != null && detail.ownerParcelCount > 1) && (
        <Section title="Owner Portfolio">
          <InfoRow label="Properties Owned" value={String(detail.ownerParcelCount)} />
          {detail?.ownerResCount != null && <InfoRow label="Residential" value={String(detail.ownerResCount)} />}
          {detail?.ownerComCount != null && <InfoRow label="Commercial" value={String(detail.ownerComCount)} />}
        </Section>
      )}

      {/* Market Rent Context */}
      {detail?.marketMedianRent != null && (
        <Section title="Market Context">
          <InfoRow label="Area Median Rent" value={`$${detail.marketMedianRent.toLocaleString()}/mo`} />
          {detail?.rentalAvm && detail.marketMedianRent > 0 && (
            <InfoRow
              label="vs Median"
              value={
                <span className={detail.rentalAvm >= detail.marketMedianRent ? "text-green-600" : "text-red-600"}>
                  {detail.rentalAvm >= detail.marketMedianRent ? "+" : ""}
                  {Math.round(((detail.rentalAvm - detail.marketMedianRent) / detail.marketMedianRent) * 100)}%
                </span>
              }
            />
          )}
        </Section>
      )}
    </div>
  );
}

// ── Sales History Tab ──────────────────────────────────────────────────────────

function SalesHistoryTab({ property }: { property: ScoredProperty }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!property.address) return;
    setLoading(true);
    fetch(`/api/mls/sales-history?address=${encodeURIComponent(property.address)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setHistory(data.transactions || []);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [property.address]);

  if (loading) return <p className="text-xs text-gray-400 p-4">Loading sales history from MLS...</p>;
  if (error) return <p className="text-xs text-red-500 p-4">{error}</p>;
  if (history.length === 0) return <EmptyState text="No closed transactions found in MLS records" />;

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-gray-400 px-1">
        {history.length} transaction{history.length !== 1 ? "s" : ""} from HiCentral MLS
      </p>
      {history.map((tx: any, i: number) => {
        const priceDiff = tx.closePrice && tx.originalListPrice
          ? ((tx.closePrice - tx.originalListPrice) / tx.originalListPrice * 100).toFixed(1)
          : null;

        return (
          <div key={tx.listingKey || i} className="border rounded-lg p-3">
            {/* Price + Date header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span className="text-sm font-bold text-green-700">
                  {tx.closePrice ? `$${tx.closePrice.toLocaleString()}` : "Price Not Disclosed"}
                </span>
                {tx.closeDate && (
                  <span className="text-xs text-gray-500 ml-2">
                    Closed {new Date(tx.closeDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              {tx.daysOnMarket != null && (
                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                  {tx.daysOnMarket} DOM
                </span>
              )}
            </div>

            {/* Price comparison */}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600 mb-2">
              {tx.listPrice && (
                <span>List: ${tx.listPrice.toLocaleString()}</span>
              )}
              {tx.originalListPrice && tx.originalListPrice !== tx.listPrice && (
                <span>Original: ${tx.originalListPrice.toLocaleString()}</span>
              )}
              {priceDiff && (
                <span className={Number(priceDiff) >= 0 ? "text-green-600" : "text-red-600"}>
                  {Number(priceDiff) >= 0 ? "+" : ""}{priceDiff}% vs ask
                </span>
              )}
            </div>

            {/* Property details */}
            <div className="flex flex-wrap gap-x-3 text-[10px] text-gray-500 mb-2">
              {tx.beds && <span>{tx.beds} bd</span>}
              {tx.baths && <span>{tx.baths} ba</span>}
              {tx.sqft && <span>{tx.sqft.toLocaleString()} sqft</span>}
              {tx.ownershipType && (
                <span className={tx.ownershipType === "Leasehold" ? "text-amber-600 font-medium" : "text-blue-600 font-medium"}>
                  {tx.ownershipType}
                </span>
              )}
            </div>

            {/* Agents */}
            <div className="text-[10px] text-gray-500 space-y-0.5">
              {tx.listAgentName && (
                <div>
                  <span className="text-gray-400">List Agent:</span> {tx.listAgentName}
                  {tx.listOfficeName && <span className="text-gray-400"> / {tx.listOfficeName}</span>}
                </div>
              )}
              {tx.buyerAgentName && (
                <div>
                  <span className="text-gray-400">Buyer Agent:</span> {tx.buyerAgentName}
                  {tx.buyerOfficeName && <span className="text-gray-400"> / {tx.buyerOfficeName}</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Comps Tab ──────────────────────────────────────────────────────────

function CompsTab({ detail }: { detail: PropertyDetail | null }) {
  const comps = detail?.comps || [];

  if (comps.length === 0) {
    return <EmptyState text="No comparable properties found" />;
  }

  return (
    <div className="space-y-3">
      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-[10px] text-amber-700 leading-relaxed">
          These comparable properties are estimates only and are not a substitute for official comps generated by a certified real estate appraiser.
        </p>
      </div>
      <p className="text-xs text-gray-500">{comps.length} comparable properties</p>
      {comps.map((c) => (
        <div
          key={c.id}
          className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-xs font-medium text-gray-800 flex-1">{c.address}</p>
            <span className="text-xs font-semibold text-green-700 shrink-0">
              ${c.price.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-500">
            {c.beds && <span>{c.beds} bd</span>}
            {c.baths && <span>{c.baths} ba</span>}
            {c.sqft && <span>{c.sqft.toLocaleString()} sqft</span>}
            {c.yearBuilt && <span>Built {c.yearBuilt}</span>}
            {c.distance != null && <span>{c.distance.toFixed(1)} mi away</span>}
            {c.daysOnMarket != null && <span>{c.daysOnMarket} DOM</span>}
            {c.correlation != null && (
              <span>{(c.correlation * 100).toFixed(0)}% match</span>
            )}
          </div>
          <div className="flex gap-2 mt-1.5 text-[10px]">
            <span
              className={`px-1.5 py-0.5 rounded font-medium ${
                c.status === "Active"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {c.status}
            </span>
            {c.listingType && c.listingType !== "Standard" && (
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                {c.listingType}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Ownership Tab ──────────────────────────────────────────────────────────

function OwnershipTab({
  property,
  detail,
}: {
  property: ScoredProperty;
  detail: PropertyDetail | null;
}) {
  const owner = detail?.owner;
  const history = detail?.saleHistory
    ? Object.entries(detail.saleHistory).sort(([a], [b]) => b.localeCompare(a))
    : [];

  return (
    <div className="space-y-4">
      {/* Current Owner */}
      <Section title="Current Owner">
        <InfoRow label="Name" value={owner?.names?.join(", ") || property.owner} />
        <InfoRow label="Type" value={owner?.type} />
        <InfoRow
          label="Absentee"
          value={
            property.absentee ? (
              <span className="text-amber-600 font-medium">Yes</span>
            ) : (
              "No"
            )
          }
        />
        <InfoRow label="Ownership" value={property.ownershipYears != null ? `${property.ownershipYears} years` : undefined} />
      </Section>

      {/* Mailing Address */}
      {owner?.mailingAddress && (
        <Section title="Owner Mailing Address">
          <p className="text-xs text-gray-700">{owner.mailingAddress.formattedAddress}</p>
          {owner.mailingAddress.state !== detail?.state && (
            <p className="text-[10px] text-amber-600 mt-1 font-medium">
              Out-of-state owner ({owner.mailingAddress.state})
            </p>
          )}
        </Section>
      )}

      {/* Investor Portfolio (from Realie) */}
      {detail?.ownerParcelCount != null && detail.ownerParcelCount > 1 && (
        <Section title="Investor Portfolio">
          <InfoRow label="Total Properties" value={detail.ownerParcelCount} />
          <InfoRow label="Residential" value={detail.ownerResCount} />
          <InfoRow label="Commercial" value={detail.ownerComCount} />
        </Section>
      )}

      {/* Sale History */}
      {history.length > 0 && (
        <Section title="Sale History">
          <div className="space-y-2">
            {history.map(([date, event]) => (
              <div
                key={date}
                className="flex items-center justify-between text-xs border-b border-gray-50 pb-2"
              >
                <div>
                  <p className="text-gray-700 font-medium">{event.event}</p>
                  <p className="text-[10px] text-gray-500">
                    {new Date(event.date).toLocaleDateString()}
                  </p>
                </div>
                <span className="font-semibold">
                  ${event.price.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Outreach Tab ──────────────────────────────────────────────────────────

function OutreachTab({
  outreach,
  loading,
  error,
  onGenerate,
}: {
  outreach: OutreachResult | null;
  loading: boolean;
  error: string;
  onGenerate: () => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-sm text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
        <p className="font-medium text-indigo-600">Drafting AI outreach...</p>
        <p className="text-xs text-gray-400 mt-1">Generating letter, SMS, and talking points</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
        <button
          onClick={onGenerate}
          className="w-full text-xs bg-indigo-600 text-white py-2 px-3 rounded hover:bg-indigo-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!outreach || outreach.drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40">
        <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="text-sm font-medium text-gray-600 mb-1">No outreach drafted yet</p>
        <p className="text-xs text-gray-400 mb-3 text-center px-4">
          AI will generate a personalized letter, SMS message, and phone talking points for this property.
        </p>
        <button
          onClick={onGenerate}
          className="text-xs bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition-colors"
        >
          Draft AI Outreach
        </button>
      </div>
    );
  }

  const draft = outreach.drafts[0];

  return (
    <div className="space-y-4">
      {/* Campaign context */}
      {outreach.campaignTheme && (
        <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
          <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide mb-0.5">Campaign Theme</p>
          <p className="text-xs text-gray-700">{outreach.campaignTheme}</p>
        </div>
      )}

      {/* Subject line */}
      <Section title="Subject Line">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-700 italic flex-1">{draft.subject}</p>
          <button
            onClick={() => copyToClipboard(draft.subject, "subject")}
            className="text-[10px] text-gray-400 hover:text-indigo-600 ml-2 shrink-0"
          >
            {copiedField === "subject" ? "Copied!" : "Copy"}
          </button>
        </div>
      </Section>

      {/* Letter / Email */}
      <Section title="Letter / Email">
        <div className="relative">
          <button
            onClick={() => copyToClipboard(draft.letterBody, "letter")}
            className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 border border-gray-200 rounded bg-white text-gray-400 hover:text-indigo-600 hover:border-indigo-300"
          >
            {copiedField === "letter" ? "Copied!" : "Copy"}
          </button>
          <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100 pr-14">
            {draft.letterBody}
          </div>
        </div>
      </Section>

      {/* SMS Message */}
      <Section title="SMS Message">
        <div className="relative">
          <button
            onClick={() => copyToClipboard(draft.smsMessage, "sms")}
            className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 border border-gray-200 rounded bg-white text-gray-400 hover:text-indigo-600 hover:border-indigo-300"
          >
            {copiedField === "sms" ? "Copied!" : "Copy"}
          </button>
          <div className="text-xs text-gray-700 bg-amber-50 p-3 rounded-lg border border-amber-200 pr-14">
            {draft.smsMessage}
          </div>
        </div>
      </Section>

      {/* Talking Points */}
      {draft.talkingPoints.length > 0 && (
        <Section title="Phone Talking Points">
          <ul className="space-y-1.5">
            {draft.talkingPoints.map((tp, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-700">
                <span className="text-indigo-500 font-bold shrink-0">{i + 1}.</span>
                <span>{tp}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Best time to send */}
      {outreach.bestTimeToSend && (
        <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
          <span className="font-medium">Best time to send:</span> {outreach.bestTimeToSend}
        </div>
      )}

      {/* Regenerate button */}
      <button
        onClick={onGenerate}
        className="w-full text-xs border border-indigo-300 text-indigo-600 py-2 px-3 rounded hover:bg-indigo-50 transition-colors"
      >
        Regenerate Outreach
      </button>

      {/* AI Disclaimer */}
      <p className="text-[9px] text-gray-400 leading-relaxed text-center mt-3">
        This content was generated using AI. AI can make mistakes. Check AI generated content against reliable information before using.
      </p>
    </div>
  );
}

// ── Neighborhood Tab ──────────────────────────────────────────────────────

function NeighborhoodTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <EmptyState text="Loading neighborhood data..." />;
  if (!data) return <EmptyState text="No neighborhood data available" />;

  const communityRaw = data.community;
  const communityObj = communityRaw?.community || communityRaw?.response?.result?.community;
  const geo = communityObj?.geography;
  const demo = communityObj?.demographics;
  const crime = communityObj?.crime;
  const climate = communityObj?.climate;
  const naturalDisasters = communityObj?.naturalDisasters;
  const hasCommunity = !!(demo || crime || climate);

  const d = (key: string) => demo?.[key];
  const pct = (key: string) => { const v = d(key); return v != null ? `${v}%` : undefined; };

  const schoolsRaw = data.schools;
  const schools = schoolsRaw?.school
    || schoolsRaw?.response?.result?.package?.item
    || schoolsRaw?.result?.package?.item
    || schoolsRaw?.property?.[0]?.school
    || (Array.isArray(schoolsRaw) ? schoolsRaw : []);
  const schoolList = Array.isArray(schools) ? schools : schools ? [schools] : [];

  const poiRaw = data.poi;
  const poiItems = poiRaw?.poi
    || poiRaw?.response?.result?.package?.item
    || (Array.isArray(poiRaw) ? poiRaw : []);
  const poiList = Array.isArray(poiItems) ? poiItems : poiItems ? [poiItems] : [];

  const trendsRaw = data.salesTrends;
  const trendsList: any[] = trendsRaw?.salesTrends || trendsRaw?.salestrend || [];

  if (!hasCommunity && schoolList.length === 0 && poiList.length === 0 && trendsList.length === 0) {
    return <EmptyState text="No neighborhood data found for this property" />;
  }

  const idxColor = (v: number) => v >= 150 ? "text-red-600" : v >= 120 ? "text-amber-600" : v >= 80 ? "text-emerald-600" : "text-blue-600";
  const idxLabel = (v: number) => v >= 150 ? "High" : v >= 120 ? "Above Avg" : v >= 80 ? "Average" : "Below Avg";

  return (
    <div className="space-y-4">
      {geo?.geographyName && (
        <div className="p-2.5 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-sm font-bold text-blue-800">{geo.geographyName}</p>
          {geo.geographyTypeName && <p className="text-[10px] text-gray-500">{geo.geographyTypeName}</p>}
        </div>
      )}

      {demo && (
        <Section title="Demographics">
          <InfoRow label="Population" value={d("population") != null ? Number(d("population")).toLocaleString() : undefined} />
          <InfoRow label="Median Age" value={d("median_Age")} />
          <InfoRow label="Households" value={d("households") != null ? Number(d("households")).toLocaleString() : undefined} />
          <InfoRow label="Owner Occupied" value={pct("housing_Units_Owner_Occupied_Pct")} />
          <InfoRow label="Renter Occupied" value={pct("housing_Units_Renter_Occupied_Pct")} />
        </Section>
      )}

      {demo && (d("median_Household_Income") || d("population_In_Poverty_Pct")) && (
        <Section title="Income & Economy">
          <InfoRow label="Median HH Income" value={d("median_Household_Income") != null ? `$${Number(d("median_Household_Income")).toLocaleString()}` : undefined} />
          <InfoRow label="Per Capita Income" value={d("household_Income_Per_Capita") != null ? `$${Number(d("household_Income_Per_Capita")).toLocaleString()}` : undefined} />
          <InfoRow label="Poverty Rate" value={pct("population_In_Poverty_Pct")} />
        </Section>
      )}

      {demo && d("housing_Owner_Households_Median_Value") && (
        <Section title="Housing Market">
          <InfoRow label="Median Home Value" value={d("housing_Owner_Households_Median_Value") != null ? `$${Number(d("housing_Owner_Households_Median_Value")).toLocaleString()}` : undefined} />
          <InfoRow label="Median Rent" value={d("housing_Median_Rent") != null ? `$${Number(d("housing_Median_Rent")).toLocaleString()}/mo` : undefined} />
          <InfoRow label="Median Year Built" value={d("housing_Median_Built_Yr")} />
        </Section>
      )}

      {crime && (
        <Section title="Crime (100 = National Avg)">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Overall", val: crime.crime_Index },
              { label: "Burglary", val: crime.burglary_Index },
              { label: "Larceny", val: crime.larceny_Index },
              { label: "Vehicle Theft", val: crime.motor_Vehicle_Theft_Index },
              { label: "Assault", val: crime.aggravated_Assault_Index },
              { label: "Robbery", val: crime.forcible_Robbery_Index },
            ].filter((c) => c.val != null).map((c) => (
              <div key={c.label} className="p-2 bg-gray-50 rounded text-center">
                <div className="text-[9px] font-semibold uppercase text-gray-500">{c.label}</div>
                <div className={`text-lg font-bold ${idxColor(c.val!)}`}>{c.val}</div>
                <div className={`text-[9px] ${idxColor(c.val!)}`}>{idxLabel(c.val!)}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {naturalDisasters && (
        <Section title="Natural Disaster Risk (100 = Avg)">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Earthquake", val: naturalDisasters.earthquake_Index },
              { label: "Hurricane", val: naturalDisasters.hurricane_Index },
              { label: "Tornado", val: naturalDisasters.tornado_Index },
              { label: "Hail", val: naturalDisasters.hail_Index },
              { label: "Wind", val: naturalDisasters.wind_Index },
            ].filter((c) => c.val != null).map((c) => (
              <div key={c.label} className="p-2 bg-gray-50 rounded text-center">
                <div className="text-[9px] font-semibold uppercase text-gray-500">{c.label}</div>
                <div className={`text-lg font-bold ${idxColor(c.val!)}`}>{c.val}</div>
                <div className={`text-[9px] ${idxColor(c.val!)}`}>{idxLabel(c.val!)}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {climate && (
        <Section title="Climate">
          <InfoRow label="Avg Annual Temp" value={climate.annual_Avg_Temp != null ? `${climate.annual_Avg_Temp}°F` : undefined} />
          <InfoRow label="Annual Rainfall" value={climate.annual_Precip_In != null ? `${climate.annual_Precip_In}"` : undefined} />
          <InfoRow label="Clear Days/Yr" value={climate.clear_Day_Mean} />
        </Section>
      )}

      {trendsList.length > 0 && (() => {
        const recent = trendsList.slice(-8);
        const firstMed = recent[0]?.salesTrend?.medSalePrice;
        const lastMed = recent[recent.length - 1]?.salesTrend?.medSalePrice;
        const priceChange = (firstMed && lastMed) ? ((lastMed - firstMed) / firstMed * 100) : null;
        return (
          <Section title="Sales Trends">
            {priceChange != null && (
              <p className={`text-xs font-semibold mb-2 ${priceChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(1)}% median price change
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="text-left py-1.5 font-medium">Period</th>
                    <th className="text-right py-1.5 font-medium">Median</th>
                    <th className="text-right py-1.5 font-medium">Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((t: any, i: number) => {
                    const period = t.dateRange?.start || "";
                    const st = t.salesTrend || t;
                    return (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1.5 text-gray-700">{period}</td>
                        <td className="py-1.5 text-right">{st.medSalePrice != null ? `$${Number(st.medSalePrice).toLocaleString()}` : "—"}</td>
                        <td className="py-1.5 text-right">{st.homeSaleCount ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        );
      })()}

      {schoolList.length > 0 && (
        <Section title="Nearby Schools">
          <div className="space-y-2">
            {schoolList.slice(0, 10).map((school: any, i: number) => {
              const det = school.detail || school;
              const loc = school.location || {};
              const name = det.schoolName || det.InstitutionName || school.schoolName;
              const type = det.institutionType || det.schoolType || school.schoolType;
              const gradeSpan = (det.gradeSpanLow && det.gradeSpanHigh) ? `${det.gradeSpanLow}–${det.gradeSpanHigh}` : school.gradeRange;
              const students = det.studentCnt || school.enrollment;
              const dist = loc.distance ?? school.distance;
              return (
                <div key={i} className="p-2 bg-gray-50 rounded">
                  <p className="text-xs font-semibold text-gray-800">{name}</p>
                  <p className="text-[10px] text-gray-500">
                    {[type, gradeSpan ? `Grades ${gradeSpan}` : null, students ? `${Number(students).toLocaleString()} students` : null, dist != null ? `${Number(dist).toFixed(1)} mi` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {poiList.length > 0 && (
        <Section title="Nearby Amenities">
          <div className="space-y-1.5">
            {poiList.slice(0, 15).map((poi: any, i: number) => {
              const biz = poi.businessLocation || {};
              const cat = poi.category || {};
              const det = poi.details || {};
              const poiName = biz.businessStandardName || det.businessShortName || poi.name || poi.Name;
              const category = cat.condensedHeading || cat.industry || poi.businessCategory;
              const dist = det.distance ?? poi.distance;
              return (
                <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-50">
                  <span className="text-gray-700">{poiName}</span>
                  <span className="text-gray-400 text-right">{[category, dist != null ? `${Number(dist).toFixed(1)} mi` : null].filter(Boolean).join(" · ")}</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Federal / Area Intel Tab ──────────────────────────────────────────────

function FederalTab({ data, loading }: { data: any; loading: boolean }) {
  if (loading) return <EmptyState text="Loading federal data sources..." />;
  if (!data) return <EmptyState text="No federal data available" />;

  const fmt = (n?: number) => {
    if (n == null) return null;
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <div className="space-y-4">
      {data.vacancy && (
        <Section title="Vacancy Status">
          {data.vacancy.source === "usps" && (
            <InfoRow label="USPS Vacancy" value={data.vacancy.vacant ? "Vacant" : "Active Mail Delivery"} />
          )}
          {data.vacancy.vacancyRate != null && (
            <InfoRow label="Area Vacancy Rate" value={`${data.vacancy.vacancyRate.toFixed(1)}%`} />
          )}
        </Section>
      )}

      {data.fairMarketRent && (
        <Section title="HUD Fair Market Rents">
          <InfoRow label="Area" value={data.fairMarketRent.areaName || data.fairMarketRent.countyName} />
          <InfoRow label="Studio" value={fmt(data.fairMarketRent.efficiency)} />
          <InfoRow label="1 Bedroom" value={fmt(data.fairMarketRent.oneBedroom)} />
          <InfoRow label="2 Bedroom" value={fmt(data.fairMarketRent.twoBedroom)} />
          <InfoRow label="3 Bedroom" value={fmt(data.fairMarketRent.threeBedroom)} />
          <InfoRow label="4 Bedroom" value={fmt(data.fairMarketRent.fourBedroom)} />
          <InfoRow label="Year" value={data.fairMarketRent.year} />
        </Section>
      )}

      {data.demographics && (
        <Section title="Census Demographics">
          <InfoRow label="Population" value={data.demographics.totalPopulation?.toLocaleString()} />
          <InfoRow label="Median Age" value={data.demographics.medianAge} />
          <InfoRow label="Median HH Income" value={fmt(data.demographics.medianHouseholdIncome)} />
          <InfoRow label="Median Home Value" value={fmt(data.demographics.medianHomeValue)} />
          <InfoRow label="Median Gross Rent" value={fmt(data.demographics.medianGrossRent)} />
          <InfoRow label="Housing Units" value={data.demographics.totalHousingUnits?.toLocaleString()} />
          <InfoRow label="Owner Occupied" value={data.demographics.ownerOccupied?.toLocaleString()} />
          <InfoRow label="Renter Occupied" value={data.demographics.renterOccupied?.toLocaleString()} />
          <InfoRow label="Vacant Units" value={data.demographics.vacantUnits?.toLocaleString()} />
        </Section>
      )}

      {data.floodRisk && (
        <Section title="FEMA Flood Insurance">
          <InfoRow label="Flood Zone" value={data.floodRisk.floodZone} />
          <InfoRow label="NFIP Policies" value={data.floodRisk.policyCount?.toLocaleString()} />
          <InfoRow label="Avg Premium" value={fmt(Math.round(data.floodRisk.averagePremium))} />
          <InfoRow label="Total Coverage" value={fmt(data.floodRisk.totalCoverage)} />
        </Section>
      )}

      {data.conformingLoanLimit && (
        <Section title="Conforming Loan Limits">
          <InfoRow label="1 Unit" value={fmt(data.conformingLoanLimit.oneUnit)} />
          <InfoRow label="2 Units" value={fmt(data.conformingLoanLimit.twoUnit)} />
          <InfoRow label="3 Units" value={fmt(data.conformingLoanLimit.threeUnit)} />
          <InfoRow label="4 Units" value={fmt(data.conformingLoanLimit.fourUnit)} />
          <InfoRow label="Year" value={data.conformingLoanLimit.year} />
        </Section>
      )}

      {data.localEmployment?.unemploymentRate && (
        <Section title="Employment Data">
          <InfoRow label="State Unemployment" value={`${data.localEmployment.unemploymentRate}%`} />
        </Section>
      )}

      {data.lendingData && (
        <Section title="HMDA Mortgage Lending">
          <InfoRow label="Applications" value={data.lendingData.totalApplications?.toLocaleString()} />
          <InfoRow label="Originations" value={data.lendingData.totalOriginations?.toLocaleString()} />
          <InfoRow label="Approval Rate" value={data.lendingData.approvalRate ? `${data.lendingData.approvalRate.toFixed(1)}%` : undefined} />
          <InfoRow label="Median Loan" value={fmt(data.lendingData.medianLoanAmount)} />
        </Section>
      )}

      {data.environmentalSites && data.environmentalSites.length > 0 && (
        <Section title="EPA Environmental Sites">
          {data.environmentalSites.slice(0, 5).map((site: any, i: number) => (
            <InfoRow key={i} label={site.siteType} value={site.facilityName} />
          ))}
        </Section>
      )}

      {data.recentDisasters && data.recentDisasters.length > 0 && (
        <Section title="Recent FEMA Disasters">
          {data.recentDisasters.slice(0, 5).map((d: any, i: number) => (
            <InfoRow key={i} label={d.incidentType} value={`${d.title} (${d.declarationDate?.substring(0, 10)})`} />
          ))}
        </Section>
      )}
    </div>
  );
}

// ── Shared UI Components ──────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-800 mb-2 uppercase tracking-wide">
        {title}
      </h4>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode | string | number | null | undefined;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between text-xs py-1 border-b border-gray-50">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium text-right">{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-sm text-gray-400">
      {text}
    </div>
  );
}
