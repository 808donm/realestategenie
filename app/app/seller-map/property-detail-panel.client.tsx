"use client";

import { useState, useEffect } from "react";
import type { ScoredProperty } from "@/lib/scoring/seller-motivation-score";
import { getSellerColor, getSellerLabel } from "@/lib/scoring/seller-motivation-score";

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
  totalMarketValue?: number;
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

export function PropertyDetailPanel({ property, onClose, onAddToCRM }: Props) {
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
              ${(property.estimatedValue / 1000).toFixed(0)}K
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
              <OverviewTab property={property} detail={detail} onAddToCRM={onAddToCRM} />
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

function OverviewTab({
  property,
  detail,
  onAddToCRM,
}: {
  property: ScoredProperty;
  detail: PropertyDetail | null;
  onAddToCRM?: (p: ScoredProperty) => void;
}) {
  return (
    <div className="space-y-4">
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
      <Section title="Seller Motivation Factors">
        <div className="space-y-2">
          {property.factors
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
      <div className="flex gap-2 pt-2">
        {onAddToCRM && (
          <button
            onClick={() => onAddToCRM(property)}
            className="flex-1 text-xs bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors"
          >
            Add to CRM
          </button>
        )}
        <a
          href={`/app/property-data?address=${encodeURIComponent(property.address)}`}
          target="_blank"
          className="flex-1 text-xs text-center border border-gray-300 py-2 px-3 rounded hover:bg-gray-50 transition-colors"
        >
          Full Report
        </a>
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
      {/* Equity Analysis (from Realie) */}
      <Section title="Equity Analysis">
        <InfoRow label="Estimated Value" value={detail?.modelValue || property.estimatedValue ? `$${((detail?.modelValue || property.estimatedValue || 0) / 1000).toFixed(0)}K` : undefined} />
        <InfoRow label="Equity" value={detail?.equity != null || property.equity != null ? `$${(((detail?.equity ?? property.equity) || 0) / 1000).toFixed(0)}K` : undefined} />
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
