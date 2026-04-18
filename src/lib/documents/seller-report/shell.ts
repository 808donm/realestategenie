/**
 * Seller Report v2 — shared shell fragments: agent band, footer, formatters.
 */

import type { SellerReportData } from "../seller-report-pdf";
import type { AgentBranding } from "../pdf-report-utils";

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
 * Small avatar, name + license line, subject address on right.
 */
export function agentBand(data: SellerReportData, branding: AgentBranding): string {
  const cityLine = [data.city, data.state, data.zip].filter(Boolean).join(", ");
  const avatar = branding.headshotData
    ? `<img src="${esc(branding.headshotData)}" alt="" />`
    : esc(initial(branding.displayName));
  const licenseLine = [branding.licenseNumber, branding.brokerageName].filter(Boolean).join(" · ").toUpperCase();
  return `
    <div class="agent-band">
      <div class="photo">${avatar}</div>
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
 * Global footer on every page.
 * Left: address + agent + generation date. Center: Hulia'u mark. Right: page N of total.
 */
export function pageFooter(data: SellerReportData, branding: AgentBranding, pageNum: number, totalPages: number, generatedAt: string): string {
  const pg = String(pageNum).padStart(2, "0");
  const total = String(totalPages).padStart(2, "0");
  return `
    <div class="page-footer">
      <div>${esc(data.address)} · ${esc(branding.displayName)}<br/>Generated ${esc(generatedAt)}</div>
      <div class="ctr"><strong>Report produced by Real Estate Genie</strong><br/>© Hulia'u Software, Inc.</div>
      <div class="rt">Page ${pg} of ${total}</div>
    </div>
  `;
}

/**
 * Wrap a page body with the agent band + body content + footer.
 * Used for pages 2-12. Cover (p1) and About (p13) use their own layout.
 */
export function pageWithBand(
  data: SellerReportData,
  branding: AgentBranding,
  pageNum: number,
  totalPages: number,
  generatedAt: string,
  bodyHtml: string,
  pageId?: string,
): string {
  return `
    <section class="page"${pageId ? ` id="${esc(pageId)}"` : ""}>
      <div class="page-body">
        ${agentBand(data, branding)}
        ${bodyHtml}
      </div>
      ${pageFooter(data, branding, pageNum, totalPages, generatedAt)}
    </section>
  `;
}
