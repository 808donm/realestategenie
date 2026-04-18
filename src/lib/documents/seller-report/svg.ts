/**
 * Seller Report v2 — SVG chart primitives.
 *
 * All chart rendering happens server-side as inline SVG strings.
 * No Chart.js, no client-side script evaluation. Paths are computed
 * from data arrays, axis ranges, and the chart's viewBox.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── decorative SVGs ──────────────────────────────────────────────────

/** Palm-tree silhouette used on the cover when no hero photo is available. */
export function svgPalm(): string {
  return `
    <svg class="cover-palm" viewBox="0 0 160 340" fill="none">
      <path d="M80 340 L80 180" stroke="#1a1408" stroke-width="5"/>
      <path d="M80 180 C60 160, 30 150, 10 155 C30 145, 60 130, 80 170" fill="#2d4020" opacity="0.9"/>
      <path d="M80 180 C100 160, 130 150, 150 155 C130 145, 100 130, 80 170" fill="#2d4020" opacity="0.9"/>
      <path d="M80 170 C60 140, 20 120, 5 125 C30 105, 60 100, 80 160" fill="#3a5028" opacity="0.85"/>
      <path d="M80 170 C100 140, 140 120, 155 125 C130 105, 100 100, 80 160" fill="#3a5028" opacity="0.85"/>
      <path d="M80 160 C70 130, 45 110, 35 105 C55 95, 75 100, 80 150" fill="#4a6032" opacity="0.8"/>
      <path d="M80 160 C90 130, 115 110, 125 105 C105 95, 85 100, 80 150" fill="#4a6032" opacity="0.8"/>
    </svg>
  `;
}

/** AVM confidence — 5 stars, `filled` of them lit gold. */
export function svgConfidenceStars(filled: number): string {
  const n = Math.max(0, Math.min(5, Math.round(filled)));
  return `<span class="stars">${Array.from({ length: 5 }, (_, i) => `<span${i < n ? "" : ' class="off"'}></span>`).join("")}</span>`;
}

/**
 * Inline range bar for the AVM estimated-value range.
 * Dot position is interpolated between low and high. Wraps in .range-bar container.
 */
export function avmRangeBar(low: number, high: number, current: number, label = "Estimated Value Range"): string {
  const pct = (() => {
    if (!(high > low)) return 50;
    const p = ((current - low) / (high - low)) * 100;
    return Math.max(2, Math.min(98, p));
  })();
  return `
    <div class="range-bar">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <div class="label" style="color: var(--ink-mute); font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;">${label}</div>
        <div style="font-family: var(--font-mono); font-size: 9px; color: var(--ink-mute);">±10% confidence band</div>
      </div>
      <div class="track" style="margin-top: 32px;">
        <div class="marker" style="left: ${pct.toFixed(1)}%;">
          <div class="marker-label">$${Math.round(current).toLocaleString()}</div>
        </div>
      </div>
      <div class="labels">
        <span>$${Math.round(low).toLocaleString()}</span>
        <span>$${Math.round(high).toLocaleString()}</span>
      </div>
    </div>
  `;
}

// ─── axis-math helpers (shared across line/bar charts) ────────────────

/** Round up to a "nice" tick like 500K, 1M, 2M. */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  if (norm <= 1) return 1 * mag;
  if (norm <= 2) return 2 * mag;
  if (norm <= 2.5) return 2.5 * mag;
  if (norm <= 5) return 5 * mag;
  return 10 * mag;
}

function fmtMoneyAxis(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}

// ─── line chart (used on pages 7, 8, 9) ───────────────────────────────

export type LineSeries = { label: string; data: number[]; color: string; width?: number };

/**
 * Multi-series line chart, inline SVG. Y-axis auto-scales to max value.
 * X-axis labels are evenly distributed.
 */
export function lineChart(opts: {
  labels: string[];
  series: LineSeries[];
  width?: number;
  height?: number;
  yFormat?: "money" | "number";
  fillGoldLast?: boolean; // fill gradient under last series (subject highlight)
}): string {
  const width = opts.width ?? 680;
  const height = opts.height ?? 180;
  const plotLeft = 40;
  const plotRight = width - 10;
  const plotTop = 20;
  const plotBottom = height - 30;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;

  const allValues = opts.series.flatMap((s) => s.data).filter((v) => v != null && isFinite(v));
  const maxV = allValues.length > 0 ? niceCeil(Math.max(...allValues) * 1.05) : 1;
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => (maxV * (ticks - i)) / ticks);
  const tickFmt = opts.yFormat === "money" ? fmtMoneyAxis : (v: number) => Math.round(v).toLocaleString();

  const n = opts.labels.length;
  const xOf = (i: number) => plotLeft + (n > 1 ? (i * plotW) / (n - 1) : plotW / 2);
  const yOf = (v: number) => plotTop + plotH * (1 - v / maxV);

  const gridLines = tickVals.map((_, i) => {
    const y = plotTop + (plotH * i) / ticks;
    return `<line x1="${plotLeft}" y1="${y}" x2="${plotRight}" y2="${y}"/>`;
  }).join("");

  const yLabels = tickVals.map((v, i) => {
    const y = plotTop + (plotH * i) / ticks;
    return `<text x="4" y="${y + 3}">${tickFmt(v)}</text>`;
  }).join("");

  // X-axis labels (show up to ~7 to avoid clutter)
  const step = Math.max(1, Math.ceil(n / 8));
  const xLabels = opts.labels.map((lbl, i) => {
    if (i % step !== 0 && i !== n - 1) return "";
    const x = xOf(i);
    return `<text x="${x}" y="${plotBottom + 18}" text-anchor="middle">${escText(lbl)}</text>`;
  }).join("");

  const paths = opts.series.map((s, idx) => {
    const isLast = idx === opts.series.length - 1;
    const points = s.data.map((v, i) => `${xOf(i)} ${yOf(v ?? 0)}`);
    const d = `M${points.join(" L ")}`;
    const fillAttr = (opts.fillGoldLast && isLast)
      ? ` <path d="${d} L ${xOf(n - 1)} ${plotBottom} L ${xOf(0)} ${plotBottom} Z" fill="url(#lineGoldGrad)" opacity="0.15"/>`
      : "";
    const marker = isLast ? `<circle cx="${xOf(n - 1)}" cy="${yOf(s.data[n - 1] ?? 0)}" r="3" fill="${s.color}"/>` : "";
    return `${fillAttr}<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width ?? 1.5}" stroke-linejoin="round" stroke-linecap="round"/>${marker}`;
  }).join("");

  const legend = opts.series.map((s) => `<span><span class="dot" style="background: ${s.color}; height: 2.5px;"></span>${escText(s.label)}</span>`).join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: ${height}px;">
      <defs>
        <linearGradient id="lineGoldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#C6932E"/>
          <stop offset="1" stop-color="#C6932E" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <g stroke="#EEE7D6" stroke-width="0.5" stroke-dasharray="2 3">${gridLines}</g>
      <g font-family="JetBrains Mono, monospace" font-size="8" fill="#5B6680">${yLabels}</g>
      <g font-family="JetBrains Mono, monospace" font-size="8" fill="#5B6680">${xLabels}</g>
      ${paths}
    </svg>
    <div class="chart-legend">${legend}</div>
  `;
}

// ─── dual-axis chart (page 10) ────────────────────────────────────────

/**
 * Dual-axis chart: bars on right axis (count), line on left axis ($).
 */
export function dualAxisChart(opts: {
  labels: string[];
  prices: number[];      // left axis, $ line
  counts: number[];      // right axis, bar
  barColor: string;
  lineColor: string;
  priceLabel: string;
  countLabel: string;
  width?: number;
  height?: number;
}): string {
  const width = opts.width ?? 720;
  const height = opts.height ?? 200;
  const plotLeft = 50;
  const plotRight = width - 50;
  const plotTop = 20;
  const plotBottom = height - 30;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;

  const maxPrice = niceCeil(Math.max(...opts.prices.filter((v) => isFinite(v)), 1) * 1.1);
  const maxCount = niceCeil(Math.max(...opts.counts.filter((v) => isFinite(v)), 1) * 1.1);
  const ticks = 4;
  const priceTicks = Array.from({ length: ticks + 1 }, (_, i) => (maxPrice * (ticks - i)) / ticks);
  const countTicks = Array.from({ length: ticks + 1 }, (_, i) => (maxCount * (ticks - i)) / ticks);

  const n = opts.labels.length;
  const bandW = plotW / n;
  const barW = Math.max(8, bandW * 0.6);
  const xOf = (i: number) => plotLeft + bandW * (i + 0.5);

  const gridLines = priceTicks.map((_, i) => {
    const y = plotTop + (plotH * i) / ticks;
    return `<line x1="${plotLeft}" y1="${y}" x2="${plotRight}" y2="${y}"/>`;
  }).join("");

  const yLeftLabels = priceTicks.map((v, i) => {
    const y = plotTop + (plotH * i) / ticks;
    return `<text x="4" y="${y + 3}">${fmtMoneyAxis(v)}</text>`;
  }).join("");

  const yRightLabels = countTicks.map((v, i) => {
    const y = plotTop + (plotH * i) / ticks;
    return `<text x="${plotRight + 8}" y="${y + 3}">${Math.round(v)}</text>`;
  }).join("");

  const step = Math.max(1, Math.ceil(n / 8));
  const xLabels = opts.labels.map((lbl, i) => {
    if (i % step !== 0 && i !== n - 1) return "";
    return `<text x="${xOf(i)}" y="${plotBottom + 18}" text-anchor="middle">${escText(lbl)}</text>`;
  }).join("");

  const bars = opts.counts.map((c, i) => {
    const h = (c / maxCount) * plotH;
    const x = xOf(i) - barW / 2;
    const y = plotBottom - h;
    return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${opts.barColor}" opacity="0.65"/>`;
  }).join("");

  const linePoints = opts.prices.map((p, i) => `${xOf(i)} ${plotTop + plotH * (1 - p / maxPrice)}`);
  const linePath = `M${linePoints.join(" L ")}`;

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: ${height}px;">
      <g stroke="#EEE7D6" stroke-width="0.5" stroke-dasharray="2 3">${gridLines}</g>
      <g font-family="JetBrains Mono, monospace" font-size="8" fill="#5B6680">${yLeftLabels}</g>
      <g font-family="JetBrains Mono, monospace" font-size="8" fill="#5B6680">${yRightLabels}</g>
      <g font-family="JetBrains Mono, monospace" font-size="8" fill="#5B6680">${xLabels}</g>
      ${bars}
      <path d="${linePath}" fill="none" stroke="${opts.lineColor}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>
    <div class="chart-legend">
      <span><span class="dot" style="background: ${opts.lineColor}; height: 2.5px;"></span>${escText(opts.priceLabel)}</span>
      <span><span class="dot" style="background: ${opts.barColor}; height: 8px; width: 8px;"></span>${escText(opts.countLabel)}</span>
    </div>
  `;
}

// ─── grouped bar chart (page 9 — sales vs listings) ───────────────────

export function groupedBarChart(opts: {
  labels: string[];
  groupA: { label: string; data: number[]; color: string };
  groupB: { label: string; data: number[]; color: string };
  width?: number;
  height?: number;
}): string {
  const width = opts.width ?? 680;
  const height = opts.height ?? 180;
  const plotLeft = 40;
  const plotRight = width - 10;
  const plotTop = 20;
  const plotBottom = height - 30;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;

  const all = [...opts.groupA.data, ...opts.groupB.data].filter((v) => isFinite(v));
  const maxV = niceCeil(Math.max(...all, 1) * 1.1);
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => (maxV * (ticks - i)) / ticks);

  const n = opts.labels.length;
  const bandW = plotW / n;
  const barW = Math.max(6, bandW * 0.35);
  const gap = 2;

  const gridLines = tickVals.map((_, i) => {
    const y = plotTop + (plotH * i) / ticks;
    return `<line x1="${plotLeft}" y1="${y}" x2="${plotRight}" y2="${y}"/>`;
  }).join("");

  const yLabels = tickVals.map((v, i) => {
    const y = plotTop + (plotH * i) / ticks;
    return `<text x="4" y="${y + 3}">${Math.round(v).toLocaleString()}</text>`;
  }).join("");

  const step = Math.max(1, Math.ceil(n / 8));
  const xLabels = opts.labels.map((lbl, i) => {
    if (i % step !== 0 && i !== n - 1) return "";
    const x = plotLeft + bandW * (i + 0.5);
    return `<text x="${x}" y="${plotBottom + 18}" text-anchor="middle">${escText(lbl)}</text>`;
  }).join("");

  const bars = opts.labels.map((_, i) => {
    const cx = plotLeft + bandW * (i + 0.5);
    const a = opts.groupA.data[i] ?? 0;
    const b = opts.groupB.data[i] ?? 0;
    const ha = (a / maxV) * plotH;
    const hb = (b / maxV) * plotH;
    const ax = cx - barW - gap / 2;
    const bx = cx + gap / 2;
    return `
      <rect x="${ax}" y="${plotBottom - ha}" width="${barW}" height="${ha}" fill="${opts.groupA.color}"/>
      <rect x="${bx}" y="${plotBottom - hb}" width="${barW}" height="${hb}" fill="${opts.groupB.color}"/>
    `;
  }).join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: ${height}px;">
      <g stroke="#EEE7D6" stroke-width="0.5" stroke-dasharray="2 3">${gridLines}</g>
      <g font-family="JetBrains Mono, monospace" font-size="8" fill="#5B6680">${yLabels}</g>
      <g font-family="JetBrains Mono, monospace" font-size="8" fill="#5B6680">${xLabels}</g>
      ${bars}
    </svg>
    <div class="chart-legend">
      <span><span class="dot" style="background: ${opts.groupA.color}; height: 8px; width: 8px;"></span>${escText(opts.groupA.label)}</span>
      <span><span class="dot" style="background: ${opts.groupB.color}; height: 8px; width: 8px;"></span>${escText(opts.groupB.label)}</span>
    </div>
  `;
}

// ─── market-type gauge (page 7) ───────────────────────────────────────

/**
 * 5-point market type gauge. marketType maps to a position 0-100%:
 * strong_sellers=10, sellers=30, balanced=50, buyers=70, strong_buyers=90.
 */
export function marketGauge(marketType: "strong_sellers" | "sellers" | "balanced" | "buyers" | "strong_buyers" | string, label?: string): string {
  const posMap: Record<string, number> = { strong_sellers: 10, sellers: 30, balanced: 50, buyers: 70, strong_buyers: 90 };
  const labelMap: Record<string, string> = {
    strong_sellers: "Strong Seller's Market",
    sellers: "Seller's Market",
    balanced: "Balanced Market",
    buyers: "Buyer's Market",
    strong_buyers: "Strong Buyer's Market",
  };
  const pos = posMap[marketType] ?? 50;
  const gval = label ?? labelMap[marketType] ?? "Market";
  return `
    <div class="gauge">
      <div class="gauge-top">
        <span class="glabel">Market Type</span>
        <span class="gval">${escText(gval)}</span>
      </div>
      <div class="gauge-track"><div class="gmark" style="left: ${pos}%;"></div></div>
      <div class="gauge-labels">
        <span>Strong Sellers</span><span>Balanced</span><span>Strong Buyers</span>
      </div>
    </div>
  `;
}

// ─── escape helper specific to SVG text ───────────────────────────────

function escText(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
