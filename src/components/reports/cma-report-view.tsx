"use client";

import React from "react";
import type { CMAAnalysis, AdjustedComp, StatusGroupStats } from "@/lib/mls/cma-adjustments";
import {
  ReportHeader,
  ReportSection,
  ReportRow,
  ReportFooter,
  ValueCard,
  TwoColumnGrid,
  AvmRangeBar,
  MarketTypeIndicator,
  ComparisonTable,
  PhotoGallery,
  HorizontalBarChart,
  fmt$,
  fmtPct,
  REPORT_COLORS,
} from "./report-components";

interface AgentBranding {
  displayName: string;
  email: string;
  phone?: string | null;
  licenseNumber?: string | null;
}

interface CMAReportProps {
  analysis: CMAAnalysis;
  branding: AgentBranding;
  date?: string;
  avmValue?: number;
  avmLow?: number;
  avmHigh?: number;
  avmConfidence?: number;
  marketType?: "sellers" | "balanced" | "buyers";
  photos?: string[];
  mapImageUrl?: string;
}

export default function CMAReportView({ analysis, branding: b, date, avmValue, avmLow, avmHigh, avmConfidence, marketType, photos, mapImageUrl }: CMAReportProps) {
  const s = analysis.subject;
  const dateStr = date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <ReportHeader
        reportType="CMA Report"
        title={s.address}
        agentName={b.displayName}
        licenseNumber={b.licenseNumber || undefined}
        date={dateStr}
      />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 60px" }}>

        {/* ═══ Property Overview ═══ */}
        <div style={{ display: "flex", gap: 20, marginBottom: 28, flexWrap: "wrap" }}>
          {/* Left: Valuation */}
          <div style={{ flex: "1 1 300px" }}>
            {avmValue != null && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: REPORT_COLORS.textMuted, textTransform: "uppercase" }}>AVM Value</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: REPORT_COLORS.textDark }}>{fmt$(avmValue)}</div>
                {avmConfidence != null && <div style={{ fontSize: 11, color: REPORT_COLORS.textMuted }}>Confidence: {avmConfidence}/10</div>}
              </div>
            )}
            {avmLow != null && avmHigh != null && avmValue != null && (
              <AvmRangeBar low={avmLow} estimate={avmValue} high={avmHigh} />
            )}
            <div style={{ display: "flex", gap: 12, fontSize: 13, color: REPORT_COLORS.textMuted, marginTop: 8 }}>
              {s.beds != null && <span><strong>{s.beds}</strong> beds</span>}
              {s.baths != null && <span><strong>{s.baths}</strong> baths</span>}
              {s.sqft != null && <span><strong>{s.sqft.toLocaleString()}</strong> sqft</span>}
              {s.lotSizeSqft != null && <span><strong>{s.lotSizeSqft.toLocaleString()}</strong> lot sqft</span>}
            </div>
          </div>

          {/* Right: CMA Value */}
          <div style={{ flex: "1 1 280px" }}>
            <div style={{ padding: "16px 20px", background: "#fffbeb", border: "2px solid #fbbf24", borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#92400e", textTransform: "uppercase" }}>Your CMA</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#111827" }}>{fmt$(analysis.recommendedPrice)}</div>
              <div style={{ fontSize: 11, color: REPORT_COLORS.textMuted }}>
                Price per Sq. Ft. ${analysis.recommendedPricePerSqft}
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: REPORT_COLORS.textMuted, marginBottom: 4 }}>CMA Range</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700 }}>
                  <span>{fmt$(analysis.cmaRange.low)}</span>
                  <span>{fmt$(analysis.cmaRange.high)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Property Facts ═══ */}
        <ReportSection title="Property Information">
          <TwoColumnGrid>
            <ReportRow label="Property Type" value={s.propertyType} />
            <ReportRow label="Bedrooms" value={s.beds} />
            <ReportRow label="Bathrooms" value={s.baths} />
            <ReportRow label="Living Area" value={s.sqft ? `${s.sqft.toLocaleString()} sqft` : null} />
            <ReportRow label="Lot Size" value={s.lotSizeSqft ? `${s.lotSizeSqft.toLocaleString()} sqft` : null} />
            <ReportRow label="Year Built" value={s.yearBuilt} />
            <ReportRow label="Garage" value={s.garageSpaces != null ? `${s.garageSpaces} spaces` : null} />
            <ReportRow label="Stories" value={s.stories} />
            <ReportRow label="Condition" value={s.condition} />
          </TwoColumnGrid>
        </ReportSection>

        {/* ═══ Market Type ═══ */}
        {marketType && (
          <ReportSection title="Market Trends">
            <MarketTypeIndicator marketType={marketType} />
          </ReportSection>
        )}

        {/* ═══ Comp Stats by Status ═══ */}
        {(analysis.activeStats || analysis.pendingStats || analysis.closedStats) && (
          <ReportSection title="Comp Property Stats">
            {[
              { label: "Active", stats: analysis.activeStats, color: "#3b82f6" },
              { label: "Pending", stats: analysis.pendingStats, color: "#eab308" },
              { label: "Closed", stats: analysis.closedStats, color: "#15803d" },
            ].map(({ label, stats, color }) => stats && (
              <div key={label} style={{ marginBottom: 20, padding: "16px 20px", background: "#fff", border: `1px solid ${REPORT_COLORS.lightGray}`, borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: REPORT_COLORS.textDark }}>
                    {label} Comp Property Stats ({stats.count} properties)
                  </span>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <ValueCard label={`Avg ${label === "Closed" ? "Closed" : "List"} Price`} value={fmt$(stats.avgPrice)!} />
                  <ValueCard label="Avg $/Sqft" value={`$${stats.avgPricePerSqft}`} />
                  <ValueCard label="Avg DOM" value={String(stats.avgDOM)} />
                </div>
                <div style={{ display: "flex", gap: 20, fontSize: 12, color: REPORT_COLORS.textMuted }}>
                  <span>Low: {fmt$(stats.lowPrice)}</span>
                  <span>High: {fmt$(stats.highPrice)}</span>
                  <span>Avg Sqft: {stats.avgLivingArea.toLocaleString()}</span>
                  <span>Avg Age: {stats.avgAge} yrs</span>
                </div>
              </div>
            ))}
          </ReportSection>
        )}

        {/* ═══ Comparable Properties ═══ */}
        <ReportSection title={`Comparable Properties (${analysis.adjustedComps.length})`}>
          <ComparisonTable
            headers={["Address", "Status", "Price", "Bd/Ba", "Sqft", "DOM", "$/Sqft"]}
            rows={analysis.adjustedComps.map((ac) => ({
              label: (ac.comp.address || "-").substring(0, 28),
              values: [
                ac.comp.status,
                fmt$(ac.price) || "-",
                `${ac.comp.beds || "?"}/${ac.comp.baths || "?"}`,
                ac.comp.sqft ? ac.comp.sqft.toLocaleString() : "-",
                ac.comp.dom != null ? String(ac.comp.dom) : "-",
                `$${ac.pricePerSqft}`,
              ],
            }))}
          />
        </ReportSection>

        {/* ═══ Comp Adjustments ═══ */}
        {analysis.adjustedComps.length > 0 && (
          <ReportSection title="Comp Property Adjustments">
            {analysis.adjustedComps.map((ac, i) => (
              <CompAdjustmentCard key={i} subject={analysis.subject} adjustedComp={ac} index={i + 1} />
            ))}
          </ReportSection>
        )}

        {/* ═══ Pricing Summary ═══ */}
        <ReportSection title="Pricing Summary">
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
            {avmValue != null && (
              <div style={{ flex: "1 1 180px" }}>
                <div style={{ fontSize: 11, color: REPORT_COLORS.textMuted, fontWeight: 600, textTransform: "uppercase" }}>AVM Value</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: REPORT_COLORS.textDark }}>{fmt$(avmValue)}</div>
              </div>
            )}
            <div style={{ flex: "1 1 180px" }}>
              <div style={{ fontSize: 11, color: "#92400e", fontWeight: 600, textTransform: "uppercase" }}>CMA Value</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: REPORT_COLORS.textDark }}>{fmt$(analysis.recommendedPrice)}</div>
              <div style={{ fontSize: 11, color: REPORT_COLORS.textMuted }}>Based on {analysis.adjustedComps.length} comps</div>
            </div>
          </div>

          <div style={{ padding: "16px 20px", background: "#f9fafb", borderRadius: 10, border: `1px solid ${REPORT_COLORS.lightGray}` }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: REPORT_COLORS.textDark, marginBottom: 12 }}>CMA Summary</h4>
            <ReportRow label="Average of Comps" value={fmt$(analysis.averageOfComps)} />
            <ReportRow label="Adjustments" value={analysis.totalAdjustment !== 0 ? `${analysis.totalAdjustment > 0 ? "+" : ""}${fmt$(analysis.totalAdjustment)}` : "$0"} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: `2px solid ${REPORT_COLORS.brandBlue}`, marginTop: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: REPORT_COLORS.brandBlue }}>Recommended Price</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: REPORT_COLORS.brandBlue }}>{fmt$(analysis.recommendedPrice)}</span>
            </div>
            {analysis.recommendedPricePerSqft > 0 && (
              <div style={{ fontSize: 11, color: REPORT_COLORS.textMuted, textAlign: "right" }}>
                (at ${analysis.recommendedPricePerSqft}/sq. ft.)
              </div>
            )}
          </div>
        </ReportSection>

        {/* ═══ Photos ═══ */}
        {photos && photos.length > 0 && (
          <ReportSection title="Photos">
            <PhotoGallery photos={photos.slice(0, 9)} columns={3} />
          </ReportSection>
        )}

        <ReportFooter agentName={b.displayName} email={b.email} phone={b.phone || undefined} />
      </div>
    </div>
  );
}

// ── Comp Adjustment Card ──

function CompAdjustmentCard({ subject, adjustedComp, index }: { subject: any; adjustedComp: AdjustedComp; index: number }) {
  const ac = adjustedComp;
  const c = ac.comp;

  return (
    <div style={{ marginBottom: 20, padding: "16px 20px", background: "#fff", border: `1px solid ${REPORT_COLORS.lightGray}`, borderRadius: 10 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: REPORT_COLORS.textDark }}>
            Comp #{index}: {c.address}
          </div>
          <div style={{ fontSize: 12, color: REPORT_COLORS.textMuted }}>
            {c.city && `${c.city} | `}{c.status} | {c.mlsNumber && `MLS# ${c.mlsNumber}`}
          </div>
        </div>
        {c.photoUrl && (
          <img src={c.photoUrl} alt={c.address} style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6 }} />
        )}
      </div>

      {/* Side-by-side: Subject vs Comp */}
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 100px", gap: 0, fontSize: 12 }}>
        {/* Header row */}
        <div style={{ padding: "6px 8px", background: REPORT_COLORS.brandBlue, color: "#fff", fontWeight: 600 }}>Feature</div>
        <div style={{ padding: "6px 8px", background: REPORT_COLORS.brandBlue, color: "#fff", fontWeight: 600, textAlign: "center" }}>Subject</div>
        <div style={{ padding: "6px 8px", background: REPORT_COLORS.brandBlue, color: "#fff", fontWeight: 600, textAlign: "center" }}>Comp</div>
        <div style={{ padding: "6px 8px", background: REPORT_COLORS.brandBlue, color: "#fff", fontWeight: 600, textAlign: "right" }}>Adjustment</div>

        {/* Data rows */}
        <AdjRow label="Price" subVal={"-"} compVal={fmt$(ac.price) || "-"} adj={null} i={0} />
        <AdjRow label="Price/Sqft" subVal={subject.pricePerSqft ? `$${subject.pricePerSqft}` : "-"} compVal={`$${ac.pricePerSqft}`} adj={null} i={1} />

        {ac.adjustments.map((adj, i) => (
          <AdjRow
            key={i}
            label={adj.label}
            subVal={adj.subjectValue}
            compVal={adj.compValue}
            adj={adj.adjustment}
            i={i + 2}
          />
        ))}
      </div>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, padding: "8px 12px", background: "#f0f9ff", borderRadius: 6 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: REPORT_COLORS.textDark }}>Adjusted Value: </span>
          <span style={{ fontSize: 16, fontWeight: 800, color: REPORT_COLORS.brandBlue }}>{fmt$(ac.adjustedPrice)}</span>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: REPORT_COLORS.textMuted }}>
          <span>Net Adj: <strong style={{ color: ac.netAdjustmentPct >= 0 ? REPORT_COLORS.greenAccent : REPORT_COLORS.redAccent }}>{ac.netAdjustmentPct > 0 ? "+" : ""}{ac.netAdjustmentPct}%</strong></span>
          <span>Gross Adj: <strong>{ac.grossAdjustmentPct}%</strong></span>
        </div>
      </div>
    </div>
  );
}

function AdjRow({ label, subVal, compVal, adj, i }: { label: string; subVal: string; compVal: string; adj: number | null; i: number }) {
  const bg = i % 2 === 0 ? "#fff" : REPORT_COLORS.rowAlt;
  return (
    <>
      <div style={{ padding: "5px 8px", background: bg, color: REPORT_COLORS.textMuted, fontWeight: 500 }}>{label}</div>
      <div style={{ padding: "5px 8px", background: bg, textAlign: "center", color: REPORT_COLORS.textDark }}>{subVal}</div>
      <div style={{ padding: "5px 8px", background: bg, textAlign: "center", color: REPORT_COLORS.textDark }}>{compVal}</div>
      <div style={{
        padding: "5px 8px",
        background: bg,
        textAlign: "right",
        fontWeight: adj ? 600 : 400,
        color: adj ? (adj > 0 ? REPORT_COLORS.greenAccent : adj < 0 ? REPORT_COLORS.redAccent : REPORT_COLORS.textDark) : REPORT_COLORS.textMuted,
      }}>
        {adj != null ? `${adj > 0 ? "+" : ""}${fmt$(adj)}` : "-"}
      </div>
    </>
  );
}
