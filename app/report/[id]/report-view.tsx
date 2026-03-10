"use client";

import type { PropertyReportData } from "@/lib/documents/property-intelligence-report";

interface ReportRecord {
  id: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  report_data: PropertyReportData;
  agent_branding: {
    displayName: string;
    email: string;
    phone?: string;
    licenseNumber?: string;
  };
  created_at: string;
}

const fmt = (n?: number) => (n != null ? `$${n.toLocaleString()}` : null);
const pct = (n?: number) => (n != null ? `${n.toFixed(1)}%` : null);

function Card({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ flex: "1 1 140px", minWidth: 130, padding: "12px 16px", background: color || "#f0f9ff", borderRadius: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{
        fontSize: 14, fontWeight: 700, color: "#1e40af", marginBottom: 12,
        paddingBottom: 8, borderBottom: "2px solid #e5e7eb", textTransform: "uppercase",
        letterSpacing: 0.5,
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ fontSize: 13, color: "#6b7280" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{value}</span>
    </div>
  );
}

export default function ReportView({ report }: { report: ReportRecord }) {
  const d = report.report_data;
  const b = report.agent_branding;
  const cityLine = [d.city, d.state, d.zip].filter(Boolean).join(", ");

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)", padding: "32px 0 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Property Intelligence Report
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: 0 }}>{d.address}</h1>
          {cityLine && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>{cityLine}</div>}
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 8 }}>
            Prepared by {b.displayName}{b.licenseNumber ? ` (Lic# ${b.licenseNumber})` : ""}
            {" | "}
            {new Date(report.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
      </div>

      {/* Gold accent bar */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #b48228 0%, #d4a542 100%)" }} />

      {/* Content */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px 60px" }}>

        {/* Value Cards */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
          {d.avmValue != null && <Card label="AVM Value" value={fmt(d.avmValue)!} sub={d.avmDate ? `As of ${d.avmDate}` : undefined} />}
          {d.lastSalePrice != null && <Card label="Last Sale" value={fmt(d.lastSalePrice)!} sub={d.lastSaleDate || undefined} color="#eff6ff" />}
          {d.estimatedEquity != null && (
            <Card
              label="Est. Equity"
              value={`${d.estimatedEquity >= 0 ? "+" : ""}${fmt(d.estimatedEquity)}`}
              color={d.estimatedEquity >= 0 ? "#ecfdf5" : "#fef2f2"}
            />
          )}
          {d.ltv != null && <Card label="LTV" value={pct(d.ltv)!} color={d.ltv > 80 ? "#fef2f2" : "#f0fdf4"} />}
          {d.rentalEstimate != null && (
            <Card
              label="Rent Est."
              value={`${fmt(d.rentalEstimate)}/mo`}
              sub={d.grossYield != null ? `${d.grossYield.toFixed(1)}% gross yield` : undefined}
              color="#f5f3ff"
            />
          )}
        </div>

        {/* Property Details */}
        <Section title="Property Details">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
            <Row label="Property Type" value={d.propertyType} />
            <Row label="Year Built" value={d.yearBuilt} />
            <Row label="Bedrooms" value={d.beds} />
            <Row label="Bathrooms" value={d.baths} />
            <Row label="Living Area" value={d.sqft ? `${d.sqft.toLocaleString()} sqft` : null} />
            <Row label="Lot Size" value={d.lotSizeSqft ? `${d.lotSizeSqft.toLocaleString()} sqft` : null} />
            <Row label="Stories" value={d.stories} />
            <Row label="Parking" value={d.garageSpaces} />
            <Row label="Pool" value={d.pool != null ? (d.pool ? "Yes" : "No") : null} />
            <Row label="APN / TMK" value={d.apn} />
            <Row label="County" value={d.county} />
          </div>
        </Section>

        {/* Tax Assessment */}
        {(d.assessedTotal != null || d.taxAmount != null) && (
          <Section title="Tax Assessment">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
              <Row label="Assessed Total" value={fmt(d.assessedTotal)} />
              <Row label="Land Value" value={fmt(d.assessedLand)} />
              <Row label="Improvement Value" value={fmt(d.assessedImpr)} />
              <Row label="Market Value" value={fmt(d.marketTotal)} />
              <Row label="Annual Tax" value={fmt(d.taxAmount)} />
              <Row label="Tax Year" value={d.taxYear} />
            </div>
          </Section>
        )}

        {/* Mortgage & Equity */}
        {(d.loanBalance != null || d.loanAmount != null || d.lender) && (
          <Section title="Mortgage & Equity">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
              <Row label="Loan Balance" value={fmt(d.loanBalance)} />
              <Row label="Original Loan" value={fmt(d.loanAmount)} />
              <Row label="Lender" value={d.lender} />
              <Row label="Loan Type" value={d.loanType} />
              <Row label="Active Loans" value={d.loanCount} />
              <Row label="LTV Ratio" value={pct(d.ltv)} />
              <Row label="Est. Equity" value={d.estimatedEquity != null ? fmt(d.estimatedEquity) : null} />
            </div>
          </Section>
        )}

        {/* Ownership */}
        {(d.owner1 || d.owner2) && (
          <Section title="Ownership">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
              <Row label="Owner" value={d.owner1} />
              <Row label="Co-Owner" value={d.owner2} />
              <Row label="Owner Occupied" value={d.ownerOccupied} />
              <Row label="Absentee Owner" value={d.absenteeOwner} />
              <Row label="Corporate" value={d.corporateOwner} />
              <Row label="Mailing Address" value={d.mailingAddress} />
            </div>
          </Section>
        )}

        {/* Hazard & Environmental */}
        {d.hazards && d.hazards.length > 0 && (
          <Section title="Hazard & Environmental Zones">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {d.hazards.map((h, i) => (
                <div key={i} style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 8, borderLeft: "4px solid #dc2626" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>{h.label}</div>
                  <div style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>{h.value}</div>
                </div>
              ))}
            </div>
            {d.federalData?.floodZone && (
              <div style={{ marginTop: 10 }}>
                <Row label="FEMA Flood Zone" value={d.federalData.floodZone} />
              </div>
            )}
          </Section>
        )}

        {/* Neighborhood & Economic */}
        {d.federalData && (
          <Section title="Neighborhood & Economic Context">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
              <Row label="Median Household Income" value={fmt(d.federalData.medianIncome)} />
              <Row label="Median Home Value (Area)" value={fmt(d.federalData.medianHomeValue)} />
              <Row label="Median Age" value={d.federalData.medianAge != null ? String(d.federalData.medianAge) : null} />
              <Row label="Population Density" value={d.federalData.populationDensity != null ? `${d.federalData.populationDensity.toLocaleString()} /sq mi` : null} />
              <Row label="Unemployment Rate" value={pct(d.federalData.unemploymentRate)} />
              <Row label="Poverty Rate" value={pct(d.federalData.povertyRate)} />
              <Row label="Owner-Occupied" value={pct(d.federalData.ownerOccupiedPct)} />
              <Row label="Renter-Occupied" value={pct(d.federalData.renterOccupiedPct)} />
              <Row label="30-yr Mortgage Rate" value={pct(d.federalData.mortgageRate30yr)} />
            </div>
          </Section>
        )}

        {/* Sales History */}
        {d.salesHistory && d.salesHistory.length > 0 && (
          <Section title="Sales History">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Date</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Amount</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Buyer</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Seller</th>
                  </tr>
                </thead>
                <tbody>
                  {d.salesHistory.map((s, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                      <td style={{ padding: "6px 8px" }}>{s.date || "—"}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{s.amount != null ? fmt(s.amount) : "—"}</td>
                      <td style={{ padding: "6px 8px" }}>{s.buyer || "—"}</td>
                      <td style={{ padding: "6px 8px" }}>{s.seller || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* Disclaimer */}
        <div style={{ marginTop: 32, padding: "16px 20px", background: "#f3f4f6", borderRadius: 10, fontSize: 11, color: "#6b7280", lineHeight: 1.6 }}>
          <strong>DISCLAIMER:</strong> Information obtained from third-party sources has not been independently verified.
          No warranty is made regarding accuracy. Prospective buyers should conduct independent verification.
          Complies with Fair Housing Act principles. Data may not reflect the most recent transactions or changes.
        </div>

        {/* Agent footer */}
        <div style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
          {b.displayName} | {b.email}{b.phone ? ` | ${b.phone}` : ""}
          <div style={{ marginTop: 4, fontSize: 11 }}>Powered by Real Estate Genie</div>
        </div>
      </div>
    </div>
  );
}
