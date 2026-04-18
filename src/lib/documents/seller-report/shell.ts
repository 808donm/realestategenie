/**
 * Seller Report v2 — shared shell fragments: agent band, footer, formatters.
 */

import type { SellerReportData } from "../seller-report-pdf";
import type { AgentBranding } from "../pdf-report-utils";
import type { ThemeTokens } from "./themes";
import { formatPageNumber, footerCenterCopy } from "./themes";

export function esc(s?: string | number | null): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fmt$(n?: number | null): string {
  return n != null && !isNaN(Number(n)) ? `$${Number(n).toLocaleString()}` : "—";
}

export function fmtPct(n?: number | null, decimals = 1): string {
  return n != null && !isNaN(Number(n)) ? `${Number(n).toFixed(decimals)}%` : "—";
}

export function fmtDate(d?: string | null): string {
  if (!d) return "—";
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function fmtDateShort(d?: string | null): string {
  if (!d) return "—";
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function initial(name?: string | null): string {
  if (!name) return "·";
  const first = name.trim().charAt(0).toUpperCase();
  return first || "·";
}

/**
 * Agent band rendered at top of pages 2-12.
 */
export function agentBand(data: SellerReportData, branding: AgentBranding): string {
  const cityLine = [data.city, data.state, data.zip].filter(Boolean).join(", ");
  const hasPhoto = !!branding.headshotData;
  const licenseLine = [branding.licenseNumber, branding.brokerageName].filter(Boolean).join(" · ").toUpperCase();
  return `
    <div class="agent-band">
      <div class="photo${hasPhoto ? " has-photo" : ""}">${hasPhoto ? "" : esc(initial(branding.displayName))}</div>
      <div class="who">
        <div class="name">${esc(branding.displayName)}</div>
        <div class="sub">${esc(licenseLine) || "&nbsp;"}</div>
      </div>
      <div class="addr">
        <div class="a">${esc(data.address)}</div>
        ${esc(cityLine)}
      </div>
    </div>
  `;
}

/**
 * Global footer on every page. Per-theme copy and page-number format.
 */
export function pageFooter(data: SellerReportData, branding: AgentBranding, pageNum: number, totalPages: number, generatedAt: string, theme: ThemeTokens): string {
  const pgLabel = formatPageNumber(pageNum, totalPages, theme.pageNumber);
  const centerCopy = footerCenterCopy(theme.id, generatedAt);
  return `
    <div class="page-footer">
      <div>${esc(data.address)} · ${esc(branding.displayName)}<br/>Generated ${esc(generatedAt)}</div>
      <div class="ctr"><strong>${esc(centerCopy.split(" · ")[0] || centerCopy)}</strong>${centerCopy.includes(" · ") ? `<br/>${esc(centerCopy.split(" · ").slice(1).join(" · "))}` : ""}</div>
      <div class="rt">${esc(pgLabel)}</div>
    </div>
  `;
}

export function pageWithBand(
  data: SellerReportData,
  branding: AgentBranding,
  pageNum: number,
  totalPages: number,
  generatedAt: string,
  theme: ThemeTokens,
  bodyHtml: string,
  pageId?: string,
): string {
  return `
    <section class="page"${pageId ? ` id="${esc(pageId)}"` : ""}>
      <div class="page-body">
        ${agentBand(data, branding)}
        ${bodyHtml}
      </div>
      ${pageFooter(data, branding, pageNum, totalPages, generatedAt, theme)}
    </section>
  `;
}
