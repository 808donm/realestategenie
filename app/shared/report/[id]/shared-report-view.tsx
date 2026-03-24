"use client";

import { useState } from "react";

interface SharedReportViewProps {
  reportData: any;
  agentName?: string;
  agentEmail?: string;
  agentPhone?: string;
  brandColor?: string;
  createdAt?: string;
}

const fmt = (n?: number) => (n != null ? `$${n.toLocaleString()}` : null);

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
  if (value == null || value === "" || value === "\u2014") return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ fontSize: 13, color: "#6b7280" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{value}</span>
    </div>
  );
}

// ── Mortgage Calculator ────────────────────────────────────────────────────
function MortgageCalculator({ listPrice, taxAnnual, hoaAnnual, agentName, agentPhone, agentEmail }: {
  listPrice: number;
  taxAnnual?: number;
  hoaAnnual?: number;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
}) {
  const [homePrice, setHomePrice] = useState(listPrice);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(6.75);
  const [termYears, setTermYears] = useState(30);

  const downPayment = homePrice * (downPct / 100);
  const loanAmount = homePrice - downPayment;
  const monthlyRate = rate / 100 / 12;
  const numPayments = termYears * 12;
  const monthlyPI = monthlyRate > 0
    ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    : loanAmount / numPayments;
  const monthlyTax = (taxAnnual || 0) / 12;
  const monthlyHOA = (hoaAnnual || 0) / 12;
  const monthlyTotal = monthlyPI + monthlyTax + monthlyHOA;

  const inputStyle = {
    width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6,
    fontSize: 14, outline: "none",
  };
  const labelStyle = { fontSize: 12, fontWeight: 600 as const, color: "#374151", marginBottom: 4, display: "block" as const };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Home Price</label>
          <input type="number" value={homePrice} onChange={(e) => setHomePrice(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Down Payment (%)</label>
          <input type="number" value={downPct} onChange={(e) => setDownPct(Number(e.target.value))} style={inputStyle} min={0} max={100} />
        </div>
        <div>
          <label style={labelStyle}>Interest Rate (%)</label>
          <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} style={inputStyle} step={0.125} />
        </div>
        <div>
          <label style={labelStyle}>Loan Term (years)</label>
          <select value={termYears} onChange={(e) => setTermYears(Number(e.target.value))} style={inputStyle}>
            <option value={30}>30 years</option>
            <option value={15}>15 years</option>
            <option value={20}>20 years</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 16, marginBottom: 12 }}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>Estimated Monthly Payment</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#15803d" }}>${Math.round(monthlyTotal).toLocaleString()}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Row label="Principal & Interest" value={`$${Math.round(monthlyPI).toLocaleString()}`} />
          <Row label="Down Payment" value={`$${Math.round(downPayment).toLocaleString()}`} />
          <Row label="Property Tax" value={monthlyTax > 0 ? `$${Math.round(monthlyTax).toLocaleString()}` : "N/A"} />
          <Row label="HOA" value={monthlyHOA > 0 ? `$${Math.round(monthlyHOA).toLocaleString()}` : "N/A"} />
          <Row label="Loan Amount" value={`$${Math.round(loanAmount).toLocaleString()}`} />
          <Row label="Total Interest" value={`$${Math.round(monthlyPI * numPayments - loanAmount).toLocaleString()}`} />
        </div>
      </div>

      {/* Agent CTA */}
      {agentName && (
        <div style={{ textAlign: "center", padding: "12px 16px", background: "#eff6ff", borderRadius: 8, fontSize: 13, color: "#1e40af" }}>
          Questions about this property? Contact <strong>{agentName}</strong>
          {agentPhone && <span> at <a href={`tel:${agentPhone}`} style={{ color: "#1e40af", fontWeight: 600 }}>{agentPhone}</a></span>}
          {agentEmail && <span> or <a href={`mailto:${agentEmail}`} style={{ color: "#1e40af", fontWeight: 600 }}>{agentEmail}</a></span>}
        </div>
      )}
    </div>
  );
}

export default function SharedReportView({
  reportData: d,
  agentName,
  agentEmail,
  agentPhone,
  brandColor,
  createdAt,
}: SharedReportViewProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  if (!d) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Report Not Available</h1>
          <p style={{ color: "#6b7280" }}>The report data could not be loaded.</p>
        </div>
      </div>
    );
  }

  const primaryColor = brandColor || "#3b82f6";
  const cityLine = [d.city, d.state, d.zip].filter(Boolean).join(", ");
  const photos: string[] = d.photos || [];

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, #1e40af 0%, ${primaryColor} 100%)`, padding: "32px 0 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Property Report
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: 0 }}>{d.address || "Property Report"}</h1>
          {cityLine && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>{cityLine}</div>}
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 8 }}>
            {agentName ? `Prepared by ${agentName}` : ""}
            {createdAt ? ` | ${new Date(createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}` : ""}
          </div>
        </div>
      </div>

      {/* Gold accent bar */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #b48228 0%, #d4a542 100%)" }} />

      {/* Content */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px 60px" }}>

        {/* Photo Gallery */}
        {photos.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            {/* Main photo */}
            <div
              style={{ width: "100%", height: 400, borderRadius: 12, overflow: "hidden", marginBottom: 8, cursor: "pointer" }}
              onClick={() => setSelectedPhoto(0)}
            >
              <img
                src={photos[selectedPhoto ?? 0]}
                alt="Property"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            {/* Thumbnail strip */}
            {photos.length > 1 && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                {photos.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedPhoto(i)}
                    style={{
                      width: 80, height: 60, borderRadius: 6, overflow: "hidden", cursor: "pointer",
                      border: (selectedPhoto ?? 0) === i ? "2px solid #3b82f6" : "2px solid transparent",
                      flexShrink: 0,
                    }}
                  >
                    <img src={url} alt={`Photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Value Cards */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
          {d.listPrice != null && <Card label="List Price" value={fmt(d.listPrice)!} />}
          {d.avmValue != null && <Card label="AVM Value" value={fmt(d.avmValue)!} sub={d.avmLow && d.avmHigh ? `Range: ${fmt(d.avmLow)} – ${fmt(d.avmHigh)}` : undefined} color="#f0f9ff" />}
          {d.beds != null && <Card label="Bedrooms" value={String(d.beds)} color="#f5f3ff" />}
          {d.baths != null && <Card label="Bathrooms" value={String(d.baths)} color="#f5f3ff" />}
          {d.sqft != null && <Card label="Living Area" value={`${d.sqft.toLocaleString()} sqft`} color="#fefce8" />}
          {d.yearBuilt != null && <Card label="Year Built" value={String(d.yearBuilt)} color="#fefce8" />}
        </div>

        {/* Property Overview */}
        <Section title="Property Overview">
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
            <Row label="Annual Tax" value={fmt(d.taxAmount)} />
          </div>
        </Section>

        {/* Hazard & Environmental */}
        {d.hazards && d.hazards.length > 0 && (
          <Section title="Environmental & Hazard Information">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {d.hazards.map((h: any, i: number) => (
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

        {/* No hazards — show positive note */}
        {(!d.hazards || d.hazards.length === 0) && (
          <Section title="Environmental & Hazard Information">
            <div style={{ padding: "12px 16px", background: "#f0fdf4", borderRadius: 8, borderLeft: "4px solid #16a34a" }}>
              <div style={{ fontSize: 13, color: "#15803d", fontWeight: 600 }}>No known environmental hazards detected</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Based on Hawaii state GIS data for tsunami, sea level rise, lava flow, and cesspool zones.</div>
            </div>
            {d.federalData?.floodZone && (
              <div style={{ marginTop: 10 }}>
                <Row label="FEMA Flood Zone" value={d.federalData.floodZone} />
              </div>
            )}
          </Section>
        )}

        {/* Mortgage Calculator */}
        {d.listPrice != null && d.listPrice > 0 && (
          <Section title="Mortgage Calculator">
            <MortgageCalculator
              listPrice={d.listPrice}
              taxAnnual={d.taxAmount || d.taxAnnualAmount}
              hoaAnnual={d.associationFee}
              agentName={agentName}
              agentPhone={agentPhone}
              agentEmail={agentEmail}
            />
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
          {agentName && <span>{agentName}</span>}
          {agentEmail && <span> | {agentEmail}</span>}
          {agentPhone && <span> | {agentPhone}</span>}
          <div style={{ marginTop: 4, fontSize: 11 }}>Powered by Real Estate Genie</div>
        </div>
      </div>
    </div>
  );
}
