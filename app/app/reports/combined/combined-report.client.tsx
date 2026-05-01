"use client";

import { useState } from "react";
import jsPDF from "jspdf";

interface PropertyReport {
  address: string;
  generatedAt: string;
  property: Record<string, any>;
  valuation: Record<string, any>;
  tax: Record<string, any>;
  sale: Record<string, any>;
  ownership: Record<string, any>;
  mortgage: Record<string, any> | null;
  hazards: Record<string, any> | null;
  demographics: Record<string, any> | null;
  estimatedEquity: number | null;
}

export default function CombinedReportClient() {
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<PropertyReport | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  // FEMA/EPA overlay data
  const [femaData, setFemaData] = useState<Record<string, any> | null>(null);
  const [epaData, setEpaData] = useState<Record<string, any> | null>(null);
  const [femaLoading, setFemaLoading] = useState(false);
  const [epaLoading, setEpaLoading] = useState(false);

  const fetchReport = async () => {
    if (!address.trim()) return;
    setIsLoading(true);
    setError("");
    setReport(null);
    setFemaData(null);
    setEpaData(null);
    try {
      const res = await fetch(`/api/reports/combined?address=${encodeURIComponent(address.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate report");
      setReport(data.report);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFemaOverlay = async () => {
    if (!report) return;
    setFemaLoading(true);
    try {
      const res = await fetch(`/api/integrations/hawaii/hazards?address=${encodeURIComponent(report.address)}`);
      const data = await res.json();
      if (res.ok) setFemaData(data);
    } catch {
    } finally {
      setFemaLoading(false);
    }
  };

  const fetchEpaOverlay = async () => {
    if (!report) return;
    setEpaLoading(true);
    try {
      // EJScreen uses lat/lng or address for lookup
      const res = await fetch(`/api/integrations/epa/ejscreen?address=${encodeURIComponent(report.address)}`);
      const data = await res.json();
      if (res.ok) setEpaData(data);
    } catch {
    } finally {
      setEpaLoading(false);
    }
  };

  const exportPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246);
    doc.text("Combined Property Report", pw / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(14);
    doc.setTextColor(55, 65, 81);
    doc.text(report.address, pw / 2, y, { align: "center" });
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(`Generated ${new Date(report.generatedAt).toLocaleDateString()}`, pw / 2, y, { align: "center" });
    y += 14;

    const addSection = (title: string, fields: [string, string | undefined][]) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text(title, 14, y);
      y += 2;
      doc.setDrawColor(229, 231, 235);
      doc.line(14, y, pw - 14, y);
      y += 6;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      for (const [label, value] of fields) {
        if (!value) continue;
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.setTextColor(107, 114, 128);
        doc.text(`${label}:`, 14, y);
        doc.setTextColor(17, 24, 39);
        doc.text(String(value), 70, y);
        y += 6;
      }
      y += 4;
    };

    addSection("Valuation", [
      ["AVM Value", report.valuation.avm ? `$${report.valuation.avm.toLocaleString()}` : undefined],
      [
        "AVM Range",
        report.valuation.avmLow && report.valuation.avmHigh
          ? `$${report.valuation.avmLow.toLocaleString()} - $${report.valuation.avmHigh.toLocaleString()}`
          : undefined,
      ],
      [
        "Assessed Value",
        report.valuation.assessedValue ? `$${report.valuation.assessedValue.toLocaleString()}` : undefined,
      ],
      ["Market Value", report.valuation.marketValue ? `$${report.valuation.marketValue.toLocaleString()}` : undefined],
      ["Est. Equity", report.estimatedEquity != null ? `$${report.estimatedEquity.toLocaleString()}` : undefined],
    ]);

    addSection("Property Details", [
      ["Type", report.property.type],
      ["Beds", report.property.beds?.toString()],
      ["Baths", report.property.baths?.toString()],
      ["Sq Ft", report.property.sqft?.toLocaleString()],
      ["Year Built", report.property.yearBuilt?.toString()],
      ["Lot Size", report.property.lotSize],
      ["Stories", report.property.stories?.toString()],
    ]);

    addSection("Tax Information", [
      ["Annual Tax", report.tax.annualTax ? `$${report.tax.annualTax.toLocaleString()}` : undefined],
      ["Tax Year", report.tax.taxYear?.toString()],
    ]);

    addSection("Sale History", [
      ["Last Sale Price", report.sale.lastSalePrice ? `$${report.sale.lastSalePrice.toLocaleString()}` : undefined],
      ["Last Sale Date", report.sale.lastSaleDate],
      ["Prior Sale Price", report.sale.priorSalePrice ? `$${report.sale.priorSalePrice.toLocaleString()}` : undefined],
    ]);

    addSection("Ownership", [
      ["Owner", report.ownership.owner],
      ["Owner 2", report.ownership.owner2],
      ["Absentee", report.ownership.absentee],
      ["Mailing Address", report.ownership.mailingAddress],
    ]);

    if (report.mortgage) {
      addSection("Mortgage", [
        ["Loan Amount", report.mortgage.loanAmount ? `$${report.mortgage.loanAmount.toLocaleString()}` : undefined],
        ["Lender", report.mortgage.lender],
        ["Loan Type", report.mortgage.loanType],
      ]);
    }

    if (report.hazards) {
      addSection("Hazard Information", [
        ["Flood Zone", report.hazards.floodZone],
        ["Flood Risk", report.hazards.floodRisk],
        ["Lava Zone", report.hazards.lavaZone],
        ["Tsunami Zone", report.hazards.tsunamiZone],
      ]);
    }

    if (femaData) {
      addSection("FEMA Flood Risk", [
        ["Flood Zone", femaData.floodZone || femaData.femaFloodZone],
        ["Risk Level", femaData.floodRisk || femaData.riskLevel],
        ["Panel Number", femaData.panelNumber],
        ["Map Date", femaData.mapDate],
      ]);
    }

    if (epaData) {
      addSection("EPA EJScreen", [
        ["EJ Index", epaData.ejIndex?.toString()],
        ["Air Toxics Cancer Risk", epaData.airToxicsCancer?.toString()],
        ["Lead Paint Indicator", epaData.leadPaint?.toString()],
        ["Superfund Proximity", epaData.superfundProximity?.toString()],
        ["Wastewater Discharge", epaData.wastewater?.toString()],
      ]);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Page ${i} of ${pageCount}`, pw / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
      doc.text("Real Estate Genie - Combined Property Report", 14, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`Property_Report_${report.address.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}.pdf`);
  };

  const handleShare = async () => {
    if (!report) return;
    setIsSharing(true);
    try {
      const res = await fetch("/api/reports/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      });
      const data = await res.json();
      if (res.ok && data.shareUrl) {
        setShareUrl(data.shareUrl);
      }
    } catch {
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div>
      {/* Address Search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchReport()}
          placeholder="Enter property address (e.g. 123 Main St, Honolulu, HI 96815)"
          style={{ flex: 1, padding: 14, border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 14 }}
        />
        <button
          onClick={fetchReport}
          disabled={isLoading || !address.trim()}
          style={{
            padding: "14px 28px",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: isLoading ? "wait" : "pointer",
            opacity: isLoading || !address.trim() ? 0.6 : 1,
          }}
        >
          {isLoading ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: 16,
            background: "#fee2e2",
            color: "#dc2626",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {isLoading && (
        <div style={{ padding: 60, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Generating combined report...</div>
          <div style={{ fontSize: 13 }}>Fetching property data, tax records, valuations, and hazard info</div>
        </div>
      )}

      {report && (
        <div>
          {/* Action Bar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={exportPDF}
              style={{
                padding: "8px 16px",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Export PDF
            </button>
            <button
              onClick={handleShare}
              disabled={isSharing}
              style={{
                padding: "8px 16px",
                background: "#8b5cf6",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {isSharing ? "Creating Link..." : "Share Link"}
            </button>
            {!femaData && (
              <button
                onClick={fetchFemaOverlay}
                disabled={femaLoading}
                style={{
                  padding: "8px 16px",
                  background: "#f59e0b",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {femaLoading ? "Loading..." : "+ FEMA Flood Risk"}
              </button>
            )}
            {!epaData && (
              <button
                onClick={fetchEpaOverlay}
                disabled={epaLoading}
                style={{
                  padding: "8px 16px",
                  background: "#059669",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {epaLoading ? "Loading..." : "+ EPA EJScreen"}
              </button>
            )}
            {shareUrl && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  style={{
                    padding: "6px 10px",
                    fontSize: 12,
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    width: 280,
                  }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => navigator.clipboard.writeText(shareUrl)}
                  style={{
                    padding: "6px 10px",
                    fontSize: 11,
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    background: "hsl(var(--card))",
                    cursor: "pointer",
                  }}
                >
                  Copy
                </button>
              </div>
            )}
          </div>

          {/* Report Header */}
          <div
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 24, marginBottom: 16 }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>{report.address}</h2>
            <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
              Generated {new Date(report.generatedAt).toLocaleString()}
            </div>
          </div>

          {/* Value Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {report.valuation.avm != null && (
              <ValueCard
                label="AVM Value"
                value={`$${report.valuation.avm.toLocaleString()}`}
                color="#059669"
                bg="#ecfdf5"
              />
            )}
            {report.sale.lastSalePrice != null && (
              <ValueCard
                label="Last Sale"
                value={`$${report.sale.lastSalePrice.toLocaleString()}`}
                color="#3b82f6"
                bg="#eff6ff"
                sub={report.sale.lastSaleDate}
              />
            )}
            {report.valuation.assessedValue != null && (
              <ValueCard
                label="Assessed"
                value={`$${report.valuation.assessedValue.toLocaleString()}`}
                color="#7c3aed"
                bg="#f5f3ff"
              />
            )}
            {report.tax.annualTax != null && (
              <ValueCard
                label="Annual Tax"
                value={`$${report.tax.annualTax.toLocaleString()}`}
                color="#dc2626"
                bg="#fef2f2"
              />
            )}
            {report.estimatedEquity != null && (
              <ValueCard
                label="Est. Equity"
                value={`$${report.estimatedEquity.toLocaleString()}`}
                color="#a16207"
                bg="#fefce8"
              />
            )}
          </div>

          {/* Property Details */}
          <Section title="Property Details">
            <Grid>
              <Field label="Type" value={report.property.type} />
              <Field label="Beds" value={report.property.beds} />
              <Field label="Baths" value={report.property.baths} />
              <Field label="Sq Ft" value={report.property.sqft?.toLocaleString()} />
              <Field label="Year Built" value={report.property.yearBuilt} />
              <Field label="Lot Size" value={report.property.lotSize} />
              <Field label="Stories" value={report.property.stories} />
              <Field label="Parking" value={report.property.parking} />
            </Grid>
          </Section>

          {/* Ownership */}
          <Section title="Ownership">
            <Grid>
              <Field label="Owner" value={report.ownership.owner} />
              {report.ownership.owner2 && <Field label="Owner 2" value={report.ownership.owner2} />}
              <Field label="Absentee" value={report.ownership.absentee} />
              <Field label="Mailing Address" value={report.ownership.mailingAddress} />
            </Grid>
          </Section>

          {/* Mortgage */}
          {report.mortgage && (
            <Section title="Mortgage">
              <Grid>
                <Field
                  label="Loan Amount"
                  value={report.mortgage.loanAmount ? `$${report.mortgage.loanAmount.toLocaleString()}` : undefined}
                />
                <Field label="Lender" value={report.mortgage.lender} />
                <Field label="Loan Type" value={report.mortgage.loanType} />
                <Field label="Term" value={report.mortgage.term} />
                <Field label="Rate" value={report.mortgage.rate ? `${report.mortgage.rate}%` : undefined} />
              </Grid>
            </Section>
          )}

          {/* Hazards */}
          {report.hazards && (
            <Section title="Natural Hazards">
              <Grid>
                <Field label="Flood Zone" value={report.hazards.floodZone} />
                <Field label="Flood Risk" value={report.hazards.floodRisk} />
                <Field label="Lava Zone" value={report.hazards.lavaZone} />
                <Field label="Tsunami Zone" value={report.hazards.tsunamiZone} />
                <Field label="Slope Failure" value={report.hazards.slopeFailure} />
                <Field label="Erosion" value={report.hazards.erosion} />
              </Grid>
            </Section>
          )}

          {/* FEMA Overlay */}
          {femaData && (
            <Section title="FEMA Flood Risk Overlay" color="#f59e0b">
              <Grid>
                <Field label="Flood Zone" value={femaData.floodZone || femaData.femaFloodZone || femaData.zone} />
                <Field label="Risk Level" value={femaData.floodRisk || femaData.riskLevel || femaData.risk} />
                <Field label="Panel Number" value={femaData.panelNumber || femaData.panel} />
                <Field label="Map Date" value={femaData.mapDate || femaData.effectiveDate} />
                <Field label="Community" value={femaData.community || femaData.communityName} />
                <Field label="SFHA" value={femaData.sfha || femaData.specialFloodHazardArea} />
              </Grid>
              <div
                style={{
                  marginTop: 8,
                  padding: 10,
                  background: "#fffbeb",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#92400e",
                }}
              >
                FEMA flood data sourced from National Flood Hazard Layer. Always verify with local flood maps for
                insurance purposes.
              </div>
            </Section>
          )}

          {/* EPA EJScreen Overlay */}
          {epaData && (
            <Section title="EPA EJScreen Environmental Justice" color="#059669">
              <Grid>
                <Field label="EJ Index" value={epaData.ejIndex} />
                <Field label="Air Toxics Cancer Risk" value={epaData.airToxicsCancer} />
                <Field label="Respiratory Hazard" value={epaData.respiratoryHazard} />
                <Field label="Lead Paint Indicator" value={epaData.leadPaint} />
                <Field label="Superfund Proximity" value={epaData.superfundProximity} />
                <Field label="Wastewater Discharge" value={epaData.wastewater} />
                <Field label="PM2.5" value={epaData.pm25} />
                <Field label="Ozone" value={epaData.ozone} />
                <Field label="Diesel PM" value={epaData.dieselPM} />
                <Field label="Traffic Proximity" value={epaData.trafficProximity} />
              </Grid>
              <div
                style={{
                  marginTop: 8,
                  padding: 10,
                  background: "#ecfdf5",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#065f46",
                }}
              >
                EPA EJScreen data provides environmental justice indices. Higher percentiles indicate greater
                environmental burden relative to other areas.
              </div>
            </Section>
          )}

          {/* Demographics */}
          {report.demographics && (
            <Section title="Demographics & Neighborhood">
              <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>
                  {typeof report.demographics === "string"
                    ? report.demographics
                    : JSON.stringify(report.demographics, null, 2)}
                </pre>
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function ValueCard({
  label,
  value,
  color,
  bg,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
  sub?: string;
}) {
  return (
    <div style={{ padding: 16, background: bg, borderRadius: 10, textAlign: "center" }}>
      <div style={{ fontSize: 11, color, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{sub}</div>}
    </div>
  );
}

function Section({ title, children, color }: { title: string; children: React.ReactNode; color?: string }) {
  return (
    <div
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: 10,
        padding: 20,
        marginBottom: 16,
        borderLeft: color ? `4px solid ${color}` : undefined,
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: color || "#374151" }}>{title}</h3>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px 20px" }}>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: "hsl(var(--foreground))", fontWeight: 500 }}>{value}</div>
    </div>
  );
}
