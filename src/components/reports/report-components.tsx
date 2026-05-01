"use client";

import React from "react";

// ── Shared Report Layout Components ────────────────────────────────────────
// Used by Property Report, Neighborhood Report, CMA Report, Seller Report
// to render in-browser with the same quality as PDF exports.

// ── Colors ──

// Brand colors (intentional, never themed) + theme-aware neutrals.
// The neutrals resolve via the html.dark class on the live app and stay
// at their light values (matching the original hex) inside the PDF
// render pipeline where the dark class is never set.
export const REPORT_COLORS = {
  brandBlue: "#1e40af",
  brandGold: "#b48228",
  textDark: "hsl(var(--foreground))",
  textMuted: "hsl(var(--muted-foreground))",
  sectionBg: "hsl(var(--muted))",
  greenAccent: "#15803d",
  redAccent: "#dc2626",
  cardBg: "hsl(var(--card))",
  rowAlt: "hsl(var(--muted))",
  lightGray: "hsl(var(--border))",
  white: "hsl(var(--card))",
};

// ── Formatting Helpers ──

export const fmt$ = (n?: number | null) => (n != null ? `$${n.toLocaleString()}` : null);
export const fmtNum = (n?: number | null) => (n != null ? n.toLocaleString() : null);
export const fmtPct = (n?: number | null) => (n != null ? `${n.toFixed(1)}%` : null);
export const fmtK = (n?: number | null) => {
  if (n == null) return null;
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

// ── Report Header ──

export function ReportHeader({
  reportType,
  title,
  subtitle,
  agentName,
  licenseNumber,
  date,
}: {
  reportType: string;
  title: string;
  subtitle?: string;
  agentName?: string;
  licenseNumber?: string;
  date?: string;
}) {
  return (
    <>
      <div style={{ background: `linear-gradient(135deg, ${REPORT_COLORS.brandBlue} 0%, #3b82f6 100%)`, padding: "32px 0 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            {reportType}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: 0 }}>{title}</h1>
          {subtitle && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>{subtitle}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
              {agentName && <>Prepared by {agentName}{licenseNumber ? ` (Lic# ${licenseNumber})` : ""}</>}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>
              Real Estate Genie&trade;
            </div>
          </div>
          {date && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{date}</div>}
        </div>
      </div>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${REPORT_COLORS.brandGold} 0%, #d4a542 100%)` }} />
    </>
  );
}

// ── Section Title ──

export function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }} className="report-section">
      <h3
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: REPORT_COLORS.brandBlue,
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: `2px solid ${REPORT_COLORS.lightGray}`,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── Value Card ──

export function ValueCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 140px",
        minWidth: 130,
        padding: "12px 16px",
        background: color || "#f0f9ff",
        borderRadius: 10,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: REPORT_COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: REPORT_COLORS.textDark, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: REPORT_COLORS.textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Row ──

export function ReportRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "" || value === "-") return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${REPORT_COLORS.sectionBg}` }}>
      <span style={{ fontSize: 13, color: REPORT_COLORS.textMuted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: REPORT_COLORS.textDark }}>{String(value)}</span>
    </div>
  );
}

// ── Two-Column Grid ──

export function TwoColumnGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
      {children}
    </div>
  );
}

// ── Market Type Indicator ──

export function MarketTypeIndicator({ marketType }: { marketType: "sellers" | "balanced" | "buyers" }) {
  const segments = [
    { label: "Seller's Market", color: "#dc2626", active: marketType === "sellers" },
    { label: "Balanced", color: "#eab308", active: marketType === "balanced" },
    { label: "Buyer's Market", color: "#3b82f6", active: marketType === "buyers" },
  ];

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 32 }}>
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: seg.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{seg.label}</span>
            {seg.active && (
              <div
                style={{
                  position: "absolute",
                  top: -8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: `8px solid ${REPORT_COLORS.textDark}`,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Equity Bar ──

export function EquityBar({ propertyValue, loanBalance }: { propertyValue: number; loanBalance: number }) {
  const equity = propertyValue - loanBalance;
  const equityPct = Math.max(0, Math.min(100, (equity / propertyValue) * 100));
  const debtPct = 100 - equityPct;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 28 }}>
        <div
          style={{
            width: `${equityPct}%`,
            background: REPORT_COLORS.greenAccent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: equityPct > 15 ? undefined : 0,
          }}
        >
          {equityPct > 20 && <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>Equity {equityPct.toFixed(0)}%</span>}
        </div>
        <div
          style={{
            width: `${debtPct}%`,
            background: REPORT_COLORS.redAccent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: debtPct > 15 ? undefined : 0,
          }}
        >
          {debtPct > 20 && <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>Debt {debtPct.toFixed(0)}%</span>}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: REPORT_COLORS.textMuted }}>
        <span>Equity: {fmt$(equity)}</span>
        <span>Debt: {fmt$(loanBalance)}</span>
      </div>
    </div>
  );
}

// ── AVM Range Bar ──

export function AvmRangeBar({ low, estimate, high }: { low: number; estimate: number; high: number }) {
  const range = high - low;
  const position = range > 0 ? ((estimate - low) / range) * 100 : 50;

  return (
    <div style={{ marginBottom: 16, padding: "12px 0" }}>
      <div style={{ position: "relative", height: 20, background: REPORT_COLORS.sectionBg, borderRadius: 10 }}>
        <div
          style={{
            position: "absolute",
            left: `${position}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: REPORT_COLORS.brandGold,
            border: "2px solid #fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
        <span style={{ color: REPORT_COLORS.textMuted }}>{fmt$(low)}</span>
        <span style={{ fontWeight: 700, color: REPORT_COLORS.brandBlue }}>{fmt$(estimate)}</span>
        <span style={{ color: REPORT_COLORS.textMuted }}>{fmt$(high)}</span>
      </div>
    </div>
  );
}

// ── Horizontal Bar Chart ──

export function HorizontalBarChart({
  data,
  maxValue,
  barColor,
  labelWidth,
}: {
  data: Array<{ label: string; value: number; displayValue?: string }>;
  maxValue?: number;
  barColor?: string;
  labelWidth?: number;
}) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);
  const color = barColor || REPORT_COLORS.brandBlue;
  const lw = labelWidth || 120;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: lw, fontSize: 12, color: REPORT_COLORS.textDark, textAlign: "right", flexShrink: 0 }}>
            {item.label}
          </div>
          <div style={{ flex: 1, height: 22, background: REPORT_COLORS.sectionBg, borderRadius: 4, position: "relative" }}>
            <div
              style={{
                width: `${Math.max((item.value / max) * 100, 1)}%`,
                height: "100%",
                background: color,
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                paddingLeft: 6,
              }}
            >
              {(item.value / max) * 100 > 20 && (
                <span style={{ fontSize: 10, fontWeight: 600, color: "#fff" }}>{item.displayValue ?? item.value.toLocaleString()}</span>
              )}
            </div>
            {(item.value / max) * 100 <= 20 && (
              <span style={{ position: "absolute", left: `calc(${Math.max((item.value / max) * 100, 1)}% + 6px)`, top: "50%", transform: "translateY(-50%)", fontSize: 10, fontWeight: 600, color: REPORT_COLORS.textMuted }}>
                {item.displayValue ?? item.value.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Comparison Table ──

export function ComparisonTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<{ label: string; values: string[]; highlight?: boolean; changeValues?: number[] }>;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: REPORT_COLORS.brandBlue }}>
            {headers.map((h, i) => (
              <th
                key={i}
                style={{
                  padding: "8px 10px",
                  color: "#fff",
                  fontWeight: 600,
                  textAlign: i === 0 ? "left" : "center",
                  fontSize: 11,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              style={{
                background: row.highlight ? "#f0f9ff" : ri % 2 === 0 ? "#fff" : REPORT_COLORS.rowAlt,
                borderBottom: `1px solid ${REPORT_COLORS.sectionBg}`,
              }}
            >
              <td style={{ padding: "6px 10px", fontWeight: 500, color: REPORT_COLORS.textDark }}>{row.label}</td>
              {row.values.map((val, vi) => {
                let color = REPORT_COLORS.textDark;
                if (row.changeValues && row.changeValues[vi] != null) {
                  color = row.changeValues[vi] > 0 ? REPORT_COLORS.greenAccent : row.changeValues[vi] < 0 ? REPORT_COLORS.redAccent : REPORT_COLORS.textDark;
                }
                return (
                  <td key={vi} style={{ padding: "6px 10px", textAlign: "center", color, fontWeight: 500 }}>
                    {val || "-"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Photo Gallery ──

export function PhotoGallery({ photos, columns = 3 }: { photos: string[]; columns?: number }) {
  if (!photos.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 8 }}>
      {photos.map((photo, i) => (
        <div key={i} style={{ borderRadius: 8, overflow: "hidden", background: REPORT_COLORS.sectionBg, aspectRatio: "4/3" }}>
          <img src={photo} alt={`Photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ))}
    </div>
  );
}

// ── Report Footer ──

export function ReportFooter({ agentName, email, phone }: { agentName?: string; email?: string; phone?: string }) {
  return (
    <div style={{ marginTop: 40 }}>
      <div
        style={{
          padding: "16px 20px",
          background: REPORT_COLORS.sectionBg,
          borderRadius: 10,
          fontSize: 11,
          color: REPORT_COLORS.textMuted,
          lineHeight: 1.6,
        }}
      >
        <strong>DISCLAIMER:</strong> Information obtained from third-party sources has not been independently
        verified. No warranty is made regarding accuracy. Prospective buyers should conduct independent verification.
        Complies with Fair Housing Act principles. Equal Housing Opportunity.
      </div>
      <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
        {agentName && <>{agentName}</>}
        {email && <> | {email}</>}
        {phone && <> | {phone}</>}
        <div style={{ marginTop: 4, fontSize: 11 }}>Powered by Real Estate Genie&trade;</div>
      </div>
    </div>
  );
}

// ── Page Break (for print) ──

export function PageBreak() {
  return <div style={{ pageBreakBefore: "always" }} />;
}
