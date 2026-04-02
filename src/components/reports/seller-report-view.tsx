"use client";

import React from "react";
import type { PropertyReportData } from "@/lib/documents/property-intelligence-report";
import type { CMAAnalysis } from "@/lib/mls/cma-adjustments";
import {
  ReportHeader,
  ReportSection,
  ReportRow,
  ReportFooter,
  ValueCard,
  TwoColumnGrid,
  AvmRangeBar,
  EquityBar,
  MarketTypeIndicator,
  ComparisonTable,
  PhotoGallery,
  fmt$,
  fmtPct,
  REPORT_COLORS,
} from "./report-components";

interface AgentBranding {
  displayName: string;
  email: string;
  phone?: string | null;
  licenseNumber?: string | null;
  photoUrl?: string | null;
  brokerageName?: string;
}

interface SellerReportProps {
  property: PropertyReportData;
  branding: AgentBranding;
  cma?: CMAAnalysis;
  personalNote?: string;
  photos?: string[];
  date?: string;
}

export default function SellerReportView({ property: d, branding: b, cma, personalNote, photos, date }: SellerReportProps) {
  const cityLine = [d.city, d.state, d.zip].filter(Boolean).join(", ");
  const dateStr = date || d.generatedAt;

  // Mortgage estimate
  const price = d.listPrice || d.avmValue;
  let monthlyTotal: number | null = null;
  if (price && price > 0) {
    const loanAmt = price * 0.8;
    const monthlyRate = 6.75 / 100 / 12;
    const monthlyPI = (loanAmt * (monthlyRate * Math.pow(1 + monthlyRate, 360))) / (Math.pow(1 + monthlyRate, 360) - 1);
    monthlyTotal = monthlyPI + (d.taxAmount || d.taxAnnualAmount || 0) / 12 + (d.associationFee || 0) / 12;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <ReportHeader
        reportType="Seller Report"
        title={d.address}
        subtitle={cityLine}
        agentName={b.displayName}
        licenseNumber={b.licenseNumber || undefined}
        date={dateStr}
      />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 60px" }}>

        {/* ═══ Personal Note ═══ */}
        {personalNote && (
          <div style={{ marginBottom: 28, padding: "20px 24px", background: "#fff", border: `1px solid ${REPORT_COLORS.lightGray}`, borderRadius: 10, display: "flex", gap: 20 }}>
            {photos && photos[0] && (
              <div style={{ flexShrink: 0, width: 280, borderRadius: 8, overflow: "hidden" }}>
                <img src={photos[0]} alt="Property" style={{ width: "100%", height: "auto" }} />
              </div>
            )}
            <div>
              <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                {personalNote}
              </div>
              <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: REPORT_COLORS.textDark }}>
                {b.displayName}
              </div>
              {b.brokerageName && <div style={{ fontSize: 12, color: REPORT_COLORS.textMuted }}>{b.brokerageName}</div>}
            </div>
          </div>
        )}

        {/* ═══ Valuation Summary ═══ */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
          {d.avmValue != null && (
            <ValueCard label="Estimated Value" value={fmt$(d.avmValue)!} sub={d.avmDate ? `As of ${d.avmDate}` : undefined} />
          )}
          {cma && (
            <ValueCard label="CMA Value" value={fmt$(cma.recommendedPrice)!} sub={`Based on ${cma.adjustedComps.length} comps`} color="#fffbeb" />
          )}
          {d.lastSalePrice != null && (
            <ValueCard label="Last Sale" value={fmt$(d.lastSalePrice)!} sub={d.lastSaleDate || undefined} color="#eff6ff" />
          )}
          {d.estimatedEquity != null && (
            <ValueCard
              label="Est. Equity"
              value={`${d.estimatedEquity >= 0 ? "+" : ""}${fmt$(d.estimatedEquity)}`}
              color={d.estimatedEquity >= 0 ? "#ecfdf5" : "#fef2f2"}
            />
          )}
        </div>

        {/* AVM Range */}
        {d.avmLow != null && d.avmHigh != null && d.avmValue != null && (
          <AvmRangeBar low={d.avmLow} estimate={d.avmValue} high={d.avmHigh} />
        )}

        {/* CMA Range */}
        {cma && (
          <div style={{ marginBottom: 20, padding: "12px 16px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#92400e", textTransform: "uppercase" }}>CMA Range</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 16, fontWeight: 700 }}>
              <span>{fmt$(cma.cmaRange.low)}</span>
              <span style={{ color: "#92400e" }}>{fmt$(cma.recommendedPrice)}</span>
              <span>{fmt$(cma.cmaRange.high)}</span>
            </div>
          </div>
        )}

        {/* ═══ Property Details ═══ */}
        <ReportSection title="Property Facts">
          <TwoColumnGrid>
            <ReportRow label="Property Type" value={d.propertyType} />
            <ReportRow label="Year Built" value={d.yearBuilt} />
            <ReportRow label="Bedrooms" value={d.beds} />
            <ReportRow label="Bathrooms" value={d.baths} />
            <ReportRow label="Living Area" value={d.sqft ? `${d.sqft.toLocaleString()} sqft` : null} />
            <ReportRow label="Lot Size" value={d.lotSizeSqft ? `${d.lotSizeSqft.toLocaleString()} sqft` : null} />
            <ReportRow label="Stories" value={d.stories} />
            <ReportRow label="Parking" value={d.garageSpaces} />
            <ReportRow label="APN / TMK" value={d.apn} />
            <ReportRow label="County" value={d.county} />
            <ReportRow label="Land Tenure" value={d.ownershipType} />
          </TwoColumnGrid>
        </ReportSection>

        {/* ═══ Building Details ═══ */}
        {(d.constructionType || d.roofType || d.heatingType || d.coolingType) && (
          <ReportSection title="Building Details">
            <TwoColumnGrid>
              <ReportRow label="Architecture" value={d.architectureStyle} />
              <ReportRow label="Construction" value={d.constructionType} />
              <ReportRow label="Roof" value={d.roofType} />
              <ReportRow label="Foundation" value={d.foundationType} />
              <ReportRow label="Heating" value={d.heatingType} />
              <ReportRow label="Cooling" value={d.coolingType} />
              <ReportRow label="Fireplaces" value={d.fireplaceCount} />
              <ReportRow label="Condition" value={d.condition} />
            </TwoColumnGrid>
          </ReportSection>
        )}

        {/* ═══ Tax Assessment ═══ */}
        {(d.assessedTotal != null || d.taxAmount != null) && (
          <ReportSection title="Tax Assessment">
            <TwoColumnGrid>
              <ReportRow label="Assessed Total" value={fmt$(d.assessedTotal)} />
              <ReportRow label="Land Value" value={fmt$(d.assessedLand)} />
              <ReportRow label="Improvement Value" value={fmt$(d.assessedImpr)} />
              <ReportRow label="Market Value" value={fmt$(d.marketTotal)} />
              <ReportRow label="Annual Tax" value={fmt$(d.taxAmount)} />
              <ReportRow label="Tax Year" value={d.taxYear} />
            </TwoColumnGrid>
          </ReportSection>
        )}

        {/* ═══ Mortgage & Equity ═══ */}
        {(d.loanBalance != null || d.estimatedEquity != null) && (
          <ReportSection title="Estimated Equity">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              {d.avmValue != null && <ValueCard label="Property Value" value={fmt$(d.avmValue)!} />}
              {d.loanBalance != null && <ValueCard label="Loan Balance" value={fmt$(d.loanBalance)!} color="#fef2f2" />}
              {d.estimatedEquity != null && (
                <ValueCard
                  label="Estimated Equity"
                  value={`${d.estimatedEquity >= 0 ? "+" : ""}${fmt$(d.estimatedEquity)}`}
                  color={d.estimatedEquity >= 0 ? "#ecfdf5" : "#fef2f2"}
                />
              )}
            </div>
            {d.avmValue && d.loanBalance && d.avmValue > 0 && (
              <EquityBar propertyValue={d.avmValue} loanBalance={d.loanBalance} />
            )}
            <TwoColumnGrid>
              <ReportRow label="Lender" value={d.lender} />
              <ReportRow label="Loan Type" value={d.loanType} />
              <ReportRow label="LTV Ratio" value={fmtPct(d.ltv)} />
            </TwoColumnGrid>
          </ReportSection>
        )}

        {/* ═══ Market Trends ═══ */}
        {(d.marketStats || d.marketType) && (
          <ReportSection title="Market Trends">
            {d.marketType && <MarketTypeIndicator marketType={d.marketType} />}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              {d.monthsOfInventory != null && <ValueCard label="Months Inventory" value={d.monthsOfInventory.toFixed(1)} />}
              {d.soldToListRatio != null && <ValueCard label="Sold-to-List" value={`${d.soldToListRatio.toFixed(1)}%`} />}
              {d.marketStats?.avgDOM != null && <ValueCard label="Avg DOM" value={String(d.marketStats.avgDOM)} />}
              {d.marketStats?.medianPrice != null && <ValueCard label="Median Price" value={fmt$(d.marketStats.medianPrice)!} />}
            </div>
          </ReportSection>
        )}

        {/* ═══ Sales History ═══ */}
        {d.salesHistory && d.salesHistory.length > 0 && (
          <ReportSection title="Sales History">
            <ComparisonTable
              headers={["Date", "Amount", "Buyer", "Seller"]}
              rows={d.salesHistory.slice(0, 10).map((s) => ({
                label: s.date || "-",
                values: [
                  s.amount != null ? fmt$(s.amount) || "-" : "-",
                  (s.buyer || "-").substring(0, 25),
                  (s.seller || "-").substring(0, 25),
                ],
              }))}
            />
          </ReportSection>
        )}

        {/* ═══ Comparable Sales ═══ */}
        {cma && cma.adjustedComps.length > 0 && (
          <ReportSection title="Comparable Sales">
            <ComparisonTable
              headers={["Address", "Status", "Price", "Adjusted", "Bd/Ba", "Sqft"]}
              rows={cma.adjustedComps.map((ac) => ({
                label: (ac.comp.address || "-").substring(0, 28),
                values: [
                  ac.comp.status,
                  fmt$(ac.price) || "-",
                  fmt$(ac.adjustedPrice) || "-",
                  `${ac.comp.beds || "?"}/${ac.comp.baths || "?"}`,
                  ac.comp.sqft ? ac.comp.sqft.toLocaleString() : "-",
                ],
              }))}
            />
          </ReportSection>
        )}

        {/* ═══ CMA Summary ═══ */}
        {cma && (
          <ReportSection title="Pricing Summary">
            <div style={{ padding: "20px 24px", background: "#fff", border: `2px solid ${REPORT_COLORS.brandGold}`, borderRadius: 10 }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#92400e", textTransform: "uppercase" }}>Recommended Price</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: REPORT_COLORS.textDark }}>{fmt$(cma.recommendedPrice)}</div>
                {cma.recommendedPricePerSqft > 0 && (
                  <div style={{ fontSize: 12, color: REPORT_COLORS.textMuted }}>at ${cma.recommendedPricePerSqft}/sq. ft.</div>
                )}
              </div>
              <ReportRow label="Average of Comps" value={fmt$(cma.averageOfComps)} />
              <ReportRow label="Adjustments" value={cma.totalAdjustment !== 0 ? `${cma.totalAdjustment > 0 ? "+" : ""}${fmt$(cma.totalAdjustment)}` : "$0"} />
              <div style={{ marginTop: 8, padding: "8px 0", borderTop: `2px solid ${REPORT_COLORS.brandGold}`, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: REPORT_COLORS.textMuted }}>CMA Range</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{fmt$(cma.cmaRange.low)} - {fmt$(cma.cmaRange.high)}</span>
              </div>
            </div>
          </ReportSection>
        )}

        {/* ═══ Hazards ═══ */}
        {d.hazards && d.hazards.length > 0 && (
          <ReportSection title="Environmental & Hazard Zones">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {d.hazards.map((h, i) => (
                <div key={i} style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 8, borderLeft: "4px solid #dc2626" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>{h.label}</div>
                  <div style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>{h.value}</div>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {/* ═══ Photos ═══ */}
        {photos && photos.length > 1 && (
          <ReportSection title="Photos">
            <PhotoGallery photos={photos.slice(1, 10)} columns={3} />
          </ReportSection>
        )}

        <ReportFooter agentName={b.displayName} email={b.email} phone={b.phone || undefined} />
      </div>
    </div>
  );
}
