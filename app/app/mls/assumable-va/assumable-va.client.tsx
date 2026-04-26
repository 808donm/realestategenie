"use client";

import { useState, useMemo } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Listing = {
  ListingKey?: string;
  ListingId?: string;
  UnparsedAddress?: string;
  StreetNumber?: string;
  StreetName?: string;
  StreetSuffix?: string;
  UnitNumber?: string;
  City?: string;
  StateOrProvince?: string;
  PostalCode?: string;
  ListPrice?: number;
  BedroomsTotal?: number;
  BathroomsTotalInteger?: number;
  LivingArea?: number;
  YearBuilt?: number;
  PropertySubType?: string;
  PublicRemarks?: string;
  ListAgentFullName?: string;
  ListOfficeName?: string;
  ListingURL?: string;
  PhotosCount?: number;
  matchTier?: "explicit" | "remarks" | "unspecified";
  extractedRate?: string;
  remarksSnippet?: string;
};

type SearchResponse = {
  provider?: string;
  tier1Explicit: Listing[];
  tier2Remarks: Listing[];
  tier3Unspecified: Listing[];
  summary: {
    total: number;
    explicitCount: number;
    remarksCount: number;
    unspecifiedCount: number;
  };
};

const DEFAULT_MARKET_RATE = 6.5;

export default function AssumableVaPage() {
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [marketRate, setMarketRate] = useState(String(DEFAULT_MARKET_RATE));
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHasSearched(true);

    const params = new URLSearchParams();
    if (city.trim()) params.append("city", city.trim());
    if (zip.trim()) params.append("zip", zip.trim());
    if (minBeds) params.append("minBeds", minBeds);
    if (minPrice) params.append("minPrice", minPrice);
    if (maxPrice) params.append("maxPrice", maxPrice);

    try {
      const res = await fetch(`/api/mls/search-assumable-va?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Search failed (${res.status})`);
      }
      const data = (await res.json()) as SearchResponse;
      setResults(data);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const onClear = () => {
    setCity("");
    setZip("");
    setMinBeds("");
    setMinPrice("");
    setMaxPrice("");
    setResults(null);
    setHasSearched(false);
    setError(null);
  };

  const marketRateNum = Number(marketRate) || DEFAULT_MARKET_RATE;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 0" }}>
      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #061A3A 0%, #153a73 70%, #204e8e 100%)",
          color: "#fff",
          borderRadius: 12,
          padding: "32px 36px",
          marginBottom: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            background: "radial-gradient(circle, rgba(232,184,74,0.25), transparent 70%)",
          }}
        />
        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            letterSpacing: "0.22em",
            color: "#E8B84A",
            marginBottom: 8,
          }}
        >
          BUYER&apos;S MARKET ADVANTAGE
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.15 }}>
          VA Assumable Loan Search
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", margin: 0, maxWidth: "70ch", lineHeight: 1.55 }}>
          Find active listings where a buyer can assume the seller&apos;s existing VA mortgage, inheriting the
          locked-in 2-4% rate from the original origination. VA-eligible buyers preserve the seller&apos;s
          entitlement; non-VA buyers can also assume but consume it. Funding fee on assumption is just{" "}
          <strong>0.5%</strong> vs. <strong>2.15-3.3%</strong> on a fresh origination.
        </p>
      </div>

      {/* Search form */}
      <form
        onSubmit={onSearch}
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 20,
          marginBottom: 20,
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
            gap: 12,
            alignItems: "end",
          }}
        >
          <FieldGroup label="City">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Honolulu"
              style={inputStyle}
            />
          </FieldGroup>
          <FieldGroup label="ZIP">
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="96825"
              style={inputStyle}
            />
          </FieldGroup>
          <FieldGroup label="Min Beds">
            <input
              type="number"
              value={minBeds}
              onChange={(e) => setMinBeds(e.target.value)}
              placeholder="3"
              min="0"
              style={inputStyle}
            />
          </FieldGroup>
          <FieldGroup label="Min Price">
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="500000"
              style={inputStyle}
            />
          </FieldGroup>
          <FieldGroup label="Max Price">
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="1500000"
              style={inputStyle}
            />
          </FieldGroup>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid #f3f4f6",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
            <span>Compare savings against market rate of</span>
            <input
              type="number"
              step="0.125"
              value={marketRate}
              onChange={(e) => setMarketRate(e.target.value)}
              style={{ ...inputStyle, width: 80, padding: "6px 8px" }}
            />
            <span>%</span>
            <span style={{ color: "#9ca3af", fontSize: 11, marginLeft: 4 }}>
              (used to compute monthly savings on assumed loans)
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onClear}
              style={{ ...btnSecondaryStyle }}
              disabled={loading}
            >
              Clear
            </button>
            <button type="submit" style={btnPrimaryStyle} disabled={loading}>
              {loading ? "Searching…" : "Search VA Assumable"}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 13,
          }}
        >
          <strong>Search failed:</strong> {error}
        </div>
      )}

      {results && <ResultsView results={results} marketRate={marketRateNum} />}

      {!results && hasSearched && !loading && !error && (
        <div
          style={{
            background: "#f9fafb",
            border: "1px dashed #d1d5db",
            padding: 32,
            textAlign: "center",
            borderRadius: 8,
            color: "#6b7280",
          }}
        >
          No results yet — try adjusting filters.
        </div>
      )}

      {!hasSearched && (
        <EmptyHero />
      )}
    </div>
  );
}

function ResultsView({ results, marketRate }: { results: SearchResponse; marketRate: number }) {
  const all: Listing[] = [
    ...results.tier1Explicit,
    ...results.tier2Remarks,
    ...results.tier3Unspecified,
  ];

  return (
    <div>
      {/* Summary bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <SummaryCard
          label="Total matches"
          value={String(results.summary.total)}
          accent="#061A3A"
        />
        <SummaryCard
          label="Explicit (Tier 1)"
          value={String(results.summary.explicitCount)}
          accent="#15803d"
          sub="ListingTerms includes both Assumable + VA"
        />
        <SummaryCard
          label="Remarks (Tier 2)"
          value={String(results.summary.remarksCount)}
          accent="#C6932E"
          sub="Public remarks mention VA + assumable"
        />
        <SummaryCard
          label="Unspecified (Tier 3)"
          value={String(results.summary.unspecifiedCount)}
          accent="#6b7280"
          sub="Assumable but loan type unclear"
        />
      </div>

      {all.length === 0 && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            padding: 32,
            textAlign: "center",
            borderRadius: 10,
            color: "#6b7280",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
            No VA assumable listings matched.
          </div>
          <div style={{ fontSize: 13 }}>
            Try widening price range, removing the city filter, or dropping minimum beds. Most
            listing agents tag VA-assumable in remarks rather than the structured fields, so very
            tight filters may miss real inventory.
          </div>
        </div>
      )}

      {results.tier1Explicit.length > 0 && (
        <TierSection
          title="Tier 1 — Explicit MLS Tags"
          subtitle="Listing terms include both 'Assumable' and 'VA'. Highest confidence."
          listings={results.tier1Explicit}
          marketRate={marketRate}
          accent="#15803d"
        />
      )}
      {results.tier2Remarks.length > 0 && (
        <TierSection
          title="Tier 2 — Mentioned in Remarks"
          subtitle="Public remarks mention VA + assumable. Most real inventory lives here."
          listings={results.tier2Remarks}
          marketRate={marketRate}
          accent="#C6932E"
        />
      )}
      {results.tier3Unspecified.length > 0 && (
        <TierSection
          title="Tier 3 — Assumable, Loan Type Unclear"
          subtitle="Listing terms include 'Assumable' but loan type isn't specified. Manual review needed."
          listings={results.tier3Unspecified}
          marketRate={marketRate}
          accent="#6b7280"
        />
      )}
    </div>
  );
}

function TierSection({
  title,
  subtitle,
  listings,
  marketRate,
  accent,
}: {
  title: string;
  subtitle: string;
  listings: Listing[];
  marketRate: number;
  accent: string;
}) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div
        style={{
          borderLeft: `4px solid ${accent}`,
          paddingLeft: 14,
          marginBottom: 12,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#061A3A" }}>{title}</h2>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{subtitle}</div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: 12,
        }}
      >
        {listings.map((l) => (
          <ListingCard key={l.ListingKey} listing={l} marketRate={marketRate} accent={accent} />
        ))}
      </div>
    </section>
  );
}

function ListingCard({
  listing,
  marketRate,
  accent,
}: {
  listing: Listing;
  marketRate: number;
  accent: string;
}) {
  const address = listing.UnparsedAddress
    || [listing.StreetNumber, listing.StreetName, listing.StreetSuffix, listing.UnitNumber].filter(Boolean).join(" ").trim()
    || "Address unavailable";
  const cityState = [listing.City, listing.StateOrProvince, listing.PostalCode].filter(Boolean).join(", ");
  const fmt$ = (n?: number) => (n != null ? `$${n.toLocaleString()}` : "—");
  const beds = listing.BedroomsTotal ?? "?";
  const baths = listing.BathroomsTotalInteger ?? "?";
  const sqft = listing.LivingArea ? listing.LivingArea.toLocaleString() : "?";

  const savings = useMemo(() => {
    if (!listing.extractedRate || !listing.ListPrice) return null;
    return computeMonthlySavings(listing.ListPrice, parseFloat(listing.extractedRate), marketRate);
  }, [listing.extractedRate, listing.ListPrice, marketRate]);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderTop: `3px solid ${accent}`,
        borderRadius: 8,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#061A3A", lineHeight: 1.25 }}>{address}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{cityState}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#061A3A" }}>{fmt$(listing.ListPrice)}</div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#374151", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <span>
          <strong>{beds}</strong> bd · <strong>{baths}</strong> ba
        </span>
        <span>
          <strong>{sqft}</strong> sqft
        </span>
        {listing.YearBuilt && <span>Built {listing.YearBuilt}</span>}
        {listing.PropertySubType && <span>{listing.PropertySubType}</span>}
        {listing.ListingId && (
          <span style={{ marginLeft: "auto", fontFamily: "JetBrains Mono, monospace", color: "#9ca3af" }}>
            MLS {listing.ListingId}
          </span>
        )}
      </div>

      {listing.extractedRate && (
        <div
          style={{
            background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
            border: "1px solid #86efac",
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "#166534", letterSpacing: "0.12em" }}>
              ASSUMABLE RATE
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#166534", lineHeight: 1 }}>
              {listing.extractedRate}%
            </div>
          </div>
          {savings && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "#166534", letterSpacing: "0.12em" }}>
                MONTHLY SAVINGS
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#166534", lineHeight: 1 }}>
                ${savings.monthlySavings.toLocaleString()}/mo
              </div>
              <div style={{ fontSize: 10, color: "#15803d", marginTop: 2 }}>
                vs {marketRate}% market · ${savings.totalSavings.toLocaleString()} over 30 yr
              </div>
            </div>
          )}
        </div>
      )}

      {listing.remarksSnippet && (
        <div
          style={{
            background: "#f9fafb",
            borderLeft: "3px solid #C6932E",
            padding: "8px 12px",
            fontSize: 12,
            color: "#374151",
            lineHeight: 1.5,
            borderRadius: "0 4px 4px 0",
          }}
        >
          <div style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", color: "#9ca3af", letterSpacing: "0.12em", marginBottom: 4 }}>
            FROM LISTING REMARKS
          </div>
          {listing.remarksSnippet}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#6b7280", marginTop: "auto" }}>
        {listing.ListAgentFullName && (
          <span>
            Listed by <strong style={{ color: "#374151" }}>{listing.ListAgentFullName}</strong>
            {listing.ListOfficeName && ` · ${listing.ListOfficeName}`}
          </span>
        )}
      </div>

      {listing.ListingURL && (
        <a
          href={listing.ListingURL}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 12,
            color: "#1e40af",
            textDecoration: "none",
            fontFamily: "JetBrains Mono, monospace",
            letterSpacing: "0.04em",
          }}
        >
          View Listing →
        </a>
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderTop: `3px solid ${accent}`,
        borderRadius: 8,
        padding: "12px 16px",
      }}
    >
      <div style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", color: "#6b7280", letterSpacing: "0.14em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#061A3A", lineHeight: 1, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "#6b7280", letterSpacing: "0.12em", textTransform: "uppercase" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function EmptyHero() {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: "48px 36px",
        textAlign: "center",
        color: "#6b7280",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, color: "#061A3A", marginBottom: 8 }}>
        Search VA-assumable listings
      </div>
      <p style={{ fontSize: 13, maxWidth: "55ch", margin: "0 auto 16px", lineHeight: 1.6 }}>
        Enter a city or ZIP, optional bed and price filters, and we&apos;ll search the MLS in three
        confidence tiers — explicit MLS tags, public-remarks text mining, and unspecified-loan-type
        assumable listings. When listing remarks include the assumable rate, we extract it and
        compute the monthly savings vs current market rates.
      </p>
      <div
        style={{
          fontSize: 11,
          fontFamily: "JetBrains Mono, monospace",
          color: "#9ca3af",
          letterSpacing: "0.1em",
        }}
      >
        TIP — ask Hoku: &quot;Find VA assumable homes in Honolulu under 1.2M&quot;
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────

function computeMonthlySavings(price: number, assumeRate: number, marketRate: number): {
  monthlySavings: number;
  totalSavings: number;
} {
  // Assume 80% LTV on the loan portion. This is approximate — a real
  // assumption would use the seller's actual loan balance, which isn't
  // typically published. 80% gives a conservative estimate.
  const loanAmount = price * 0.8;
  const term = 360; // 30-year mortgage
  const monthlyAssume = monthlyPayment(loanAmount, assumeRate, term);
  const monthlyMarket = monthlyPayment(loanAmount, marketRate, term);
  const monthlySavings = Math.round(monthlyMarket - monthlyAssume);
  return {
    monthlySavings: Math.max(0, monthlySavings),
    totalSavings: Math.max(0, monthlySavings * term),
  };
}

function monthlyPayment(principal: number, annualRatePct: number, months: number): number {
  if (annualRatePct <= 0) return principal / months;
  const r = annualRatePct / 100 / 12;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  fontSize: 13,
  fontFamily: "inherit",
};

const btnPrimaryStyle: React.CSSProperties = {
  background: "#061A3A",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "10px 20px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  letterSpacing: "0.02em",
};

const btnSecondaryStyle: React.CSSProperties = {
  background: "#fff",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  padding: "10px 20px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
