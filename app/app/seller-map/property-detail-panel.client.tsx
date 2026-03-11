"use client";

import { useState, useEffect } from "react";
import type { ScoredProperty, SellerFactor } from "@/lib/scoring/seller-motivation-score";
import { getSellerColor, getSellerLabel } from "@/lib/scoring/seller-motivation-score";
import { fmtPrice } from "@/lib/utils";

type DetailTab = "overview" | "building" | "financial" | "comps" | "ownership";

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

  useEffect(() => {
    setLoading(true);
    setTab("overview");

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

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "building", label: "Building" },
    { key: "financial", label: "Financial" },
    { key: "comps", label: "Comps" },
    { key: "ownership", label: "Ownership" },
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
          {property.estimatedValue && (
            <span className="font-medium">
              {fmtPrice(property.estimatedValue)}
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
              <OverviewTab property={property} detail={detail} />
            )}
            {tab === "building" && <BuildingTab detail={detail} />}
            {tab === "financial" && <FinancialTab property={property} detail={detail} />}
            {tab === "comps" && <CompsTab detail={detail} />}
            {tab === "ownership" && <OwnershipTab property={property} detail={detail} />}
          </>
        )}
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
  add("Financial", "Estimated Value", detail?.modelValue || property.estimatedValue);
  add("Financial", "RentCast AVM", detail?.avmValue);
  add("Financial", "AVM Low", detail?.avmLow);
  add("Financial", "AVM High", detail?.avmHigh);
  add("Financial", "Equity", detail?.equity ?? property.equity);
  add("Financial", "LTV %", detail?.ltv ?? property.ltv);
  add("Financial", "HOA Fee", detail?.hoa?.fee);
  add("Financial", "Last Sale Date", detail?.lastSaleDate);
  add("Financial", "Last Sale Price", detail?.lastSalePrice);
  add("Financial", "Total Market Value", detail?.totalMarketValue);
  add("Financial", "Foreclosure Code", detail?.forecloseCode);
  add("Financial", "Lien Count", detail?.totalLienCount);
  add("Financial", "Lien Balance", detail?.totalLienBalance);

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
}: {
  property: ScoredProperty;
  detail: PropertyDetail | null;
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

      {/* Export */}
      <div className="pt-2">
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
            label="RentCast AVM"
            value={`${fmtPrice(detail.avmValue)}${detail.avmLow && detail.avmHigh ? ` (${fmtPrice(detail.avmLow)}–${fmtPrice(detail.avmHigh)})` : ""}`}
          />
        )}
        <InfoRow label="Estimated Value" value={detail?.modelValue || property.estimatedValue ? fmtPrice(detail?.modelValue || property.estimatedValue || 0) : undefined} />
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
