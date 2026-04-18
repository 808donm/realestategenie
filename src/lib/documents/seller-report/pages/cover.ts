/**
 * Seller Report v2 — Page 1: Cover, theme-dispatched.
 */

import type { SellerReportData } from "../../seller-report-pdf";
import type { AgentBranding } from "../../pdf-report-utils";
import type { ThemeTokens } from "../themes";
import { esc, fmtDateShort, initial, pageFooter } from "../shell";

export function pageCover(data: SellerReportData, branding: AgentBranding, totalPages: number, generatedAt: string, theme: ThemeTokens, clientName?: string): string {
  switch (theme.cover) {
    case "archive":     return coverArchive(data, branding, totalPages, generatedAt, theme, clientName);
    case "noir":        return coverNoir(data, branding, totalPages, generatedAt, theme, clientName);
    case "terracotta":  return coverTerracotta(data, branding, totalPages, generatedAt, theme, clientName);
    case "blueprint":   return coverBlueprint(data, branding, totalPages, generatedAt, theme, clientName);
    case "editor":
    default:            return coverEditor(data, branding, totalPages, generatedAt, theme, clientName);
  }
}

// ─── helpers ───────────────────────────────────────────────────────────

function cityLine(d: SellerReportData) { return [d.city, d.state, d.zip].filter(Boolean).join(", "); }
function avatarInner(branding: AgentBranding): string { return branding.headshotData ? "" : esc(initial(branding.displayName)); }
function hasHeadshot(b: AgentBranding) { return !!b.headshotData; }
function lic(b: AgentBranding): string { return b.licenseNumber ? `LIC #${esc(b.licenseNumber)}` : ""; }
function contact(b: AgentBranding): string {
  const parts: string[] = [];
  if (b.phone) parts.push(esc(b.phone));
  if (b.email) parts.push(esc(b.email));
  return parts.join("<br/>");
}
function brokerageBlock(b: AgentBranding): string {
  const name = b.brokerageName || "Real Estate Genie";
  const addr = (b as any).brokerageAddress;
  const lic = (b as any).brokerageLicense;
  return `
    <div class="brok-name">${esc(name)}</div>
    ${addr ? esc(addr).replace(/\n/g, "<br/>") : ""}
    ${lic ? `<br/><strong>Brokerage Lic.</strong> ${esc(lic)}` : ""}
  `;
}
function statusPill(data: SellerReportData): string {
  const s = data.listingStatus;
  if (!s) return "";
  const d = (data as any).listDate ? fmtDateShort((data as any).listDate) : null;
  return `<span class="pill"><span class="dot"></span>${esc(String(s).toUpperCase())}${d ? ` · LISTED ${esc(d.toUpperCase())}` : ""}</span>`;
}

// ─── T1 · The Editor ───────────────────────────────────────────────────

function coverEditor(data: SellerReportData, branding: AgentBranding, totalPages: number, generatedAt: string, theme: ThemeTokens, clientName?: string): string {
  const avatarCls = hasHeadshot(branding) ? "big-photo has-photo" : "big-photo";
  return `
    <section class="page cover-editor" id="p1">
      <div class="cover-hero"><div class="hero-scrim"></div></div>
      <div class="cover-overlay">
        <div class="eyebrow">SELLER REPORT</div>
        <h1>${esc(data.address)}</h1>
        <h2>${esc(cityLine(data))}</h2>
        ${statusPill(data)}
      </div>
      <div class="agent-card">
        <div class="${avatarCls}">${avatarInner(branding)}</div>
        <div>
          <div class="agent-name">${esc(branding.displayName)}</div>
          <div class="agent-title">${esc((branding as any).title || "REALTOR · Listing Agent")}</div>
          ${lic(branding) ? `<div class="agent-lic">${lic(branding)}</div>` : ""}
          <div class="agent-contact">${contact(branding)}</div>
        </div>
        <div class="brokerage">${brokerageBlock(branding)}</div>
        <div class="prepared">
          <span>${clientName ? `<strong>Prepared for</strong> ${esc(clientName)}` : ""}</span>
          <span><strong>Generated</strong> ${esc(generatedAt)}</span>
        </div>
      </div>
      ${pageFooter(data, branding, 1, totalPages, generatedAt, theme)}
    </section>
  `;
}

// ─── T2 · The Archive ──────────────────────────────────────────────────

function coverArchive(data: SellerReportData, branding: AgentBranding, totalPages: number, generatedAt: string, theme: ThemeTokens, clientName?: string): string {
  const avatarCls = hasHeadshot(branding) ? "big-photo has-photo" : "big-photo";
  const mls = data.mlsNumber ? `MLS ${esc(data.mlsNumber)}` : `SELLER REPORT`;
  const street = String(data.address || "").replace(/,.*$/, "");
  return `
    <section class="page cover-archive" id="p1">
      <div class="top-rule">
        <span>${esc(mls)}</span>
        <span>${esc(fmtDateShort(generatedAt))}</span>
      </div>
      <div class="cover-hero"></div>
      <div class="big">
        <div class="num">01</div>
        <div class="addr">${esc(street)}</div>
        <div class="city">${esc(cityLine(data))}</div>
      </div>
      <div class="agent-card">
        <div class="left">
          <div class="${avatarCls}">${avatarInner(branding)}</div>
          <div>
            <div class="agent-name">${esc(branding.displayName)}</div>
            <div class="agent-title">LISTING AGENT</div>
            ${branding.licenseNumber ? `<div class="agent-lic">${esc(branding.licenseNumber)}</div>` : ""}
          </div>
        </div>
        <div class="right">
          ${esc(branding.brokerageName || "Real Estate Genie")}<br/>
          ${(branding as any).brokerageAddress ? esc((branding as any).brokerageAddress).replace(/\n/g, "<br/>") : ""}
          <br/>
          ${branding.phone ? `${esc(branding.phone)}<br/>` : ""}
          ${branding.email ? `${esc(branding.email)}` : ""}
        </div>
        <div class="prepared">
          <span>${clientName ? `PREPARED FOR ${esc(clientName).toUpperCase()}` : ""}</span>
          <span>GEN ${esc(generatedAt).toUpperCase()}</span>
        </div>
      </div>
      ${pageFooter(data, branding, 1, totalPages, generatedAt, theme)}
    </section>
  `;
}

// ─── T3 · Noir ─────────────────────────────────────────────────────────

function coverNoir(data: SellerReportData, branding: AgentBranding, totalPages: number, generatedAt: string, theme: ThemeTokens, _clientName?: string): string {
  const street = String(data.address || "").replace(/,.*$/, "");
  const cityState = [data.city, data.state].filter(Boolean).join(" · ");
  return `
    <section class="page cover-noir" id="p1">
      <div class="cover-hero"><div class="hero-scrim"></div></div>
      <div class="mark">REG</div>
      <div class="eyebrow">PRIVATE SELLER REPORT</div>
      <div class="center">
        <h1>${esc(street)}</h1>
        <div class="rule"></div>
        <h2>${esc(cityState || cityLine(data))}</h2>
      </div>
      <div class="agent-card">
        <div class="prepared">PRESENTED BY</div>
        <div class="agent-name">${esc(branding.displayName)}</div>
        <div class="agent-title">LISTING AGENT${branding.licenseNumber ? ` · ${esc(branding.licenseNumber)}` : ""}</div>
        <div class="brok-name">${esc(branding.brokerageName || "Real Estate Genie")}</div>
        <div class="agent-contact">${[branding.phone, branding.email].filter(Boolean).map(esc).join(" · ")}</div>
      </div>
      ${pageFooter(data, branding, 1, totalPages, generatedAt, theme)}
    </section>
  `;
}

// ─── T4 · Terracotta ───────────────────────────────────────────────────

function coverTerracotta(data: SellerReportData, branding: AgentBranding, totalPages: number, generatedAt: string, theme: ThemeTokens, clientName?: string): string {
  const avatarCls = hasHeadshot(branding) ? "big-photo has-photo" : "big-photo";
  return `
    <section class="page cover-terracotta" id="p1">
      <div class="cover-hero"></div>
      <div class="corner">
        <div class="lg">REG</div>
        <div class="mls">${data.mlsNumber ? `MLS ${esc(data.mlsNumber)}` : "SELLER REPORT"}</div>
      </div>
      <div class="overlay">
        <div class="eb">SELLER REPORT${data.listingStatus ? ` · ${esc(String(data.listingStatus).toUpperCase())}` : ""}</div>
        <h1>${esc(data.address)}</h1>
        <h2>${esc(cityLine(data))}</h2>
      </div>
      <div class="agent-card">
        <div class="${avatarCls}">${avatarInner(branding)}</div>
        <div>
          <div class="agent-name">${esc(branding.displayName)}</div>
          <div class="agent-title">${esc((branding as any).title || "REALTOR · Listing Agent")}</div>
          ${branding.licenseNumber ? `<div class="agent-lic">LIC ${esc(branding.licenseNumber)}</div>` : ""}
          <div class="agent-contact">${contact(branding)}</div>
        </div>
        <div class="brokerage">${brokerageBlock(branding)}</div>
        <div class="prepared">
          <span>${clientName ? `<strong>Prepared for</strong> ${esc(clientName)}` : ""}</span>
          <span><strong>Generated</strong> ${esc(generatedAt)}</span>
        </div>
      </div>
      ${pageFooter(data, branding, 1, totalPages, generatedAt, theme)}
    </section>
  `;
}

// ─── T5 · Blueprint ────────────────────────────────────────────────────

function coverBlueprint(data: SellerReportData, branding: AgentBranding, totalPages: number, generatedAt: string, theme: ThemeTokens, clientName?: string): string {
  const avatarCls = hasHeadshot(branding) ? "big-photo has-photo" : "big-photo";
  const metaLine = [
    data.mlsNumber ? `MLS · ${esc(data.mlsNumber)}` : "SELLER REPORT",
    data.listingStatus ? esc(String(data.listingStatus).toUpperCase()) : "",
  ].filter(Boolean).join(" · ");
  return `
    <section class="page cover-blueprint" id="p1">
      <div class="bar">
        <span>SELLER-REPORT.v2</span>
        <span>GENERATED ${esc(generatedAt.replace(/,/g, "").toUpperCase())}</span>
      </div>
      <div class="cover-hero">
        <div class="brand">
          <div class="logo">${esc(branding.brokerageName || "Real Estate Genie")}</div>
          <div class="report">REPORT / 13-PAGE</div>
        </div>
      </div>
      <div class="big">
        <div class="meta">${metaLine}</div>
        <div class="h1">${esc(data.address)}</div>
        <div class="h2">${esc(cityLine(data))}</div>
        ${data.listingStatus ? `<div class="pill"><span class="dot"></span>${esc(String(data.listingStatus).toUpperCase())}${(data as any).listDate ? ` · LISTED ${esc(fmtDateShort((data as any).listDate).toUpperCase())}` : ""}</div>` : ""}
      </div>
      <div class="agent-card">
        <div class="${avatarCls}">${avatarInner(branding)}</div>
        <div>
          <div class="agent-name">${esc(branding.displayName)}</div>
          <div class="agent-title">LISTING AGENT</div>
          ${branding.licenseNumber ? `<div class="agent-lic">${esc(branding.licenseNumber)}</div>` : ""}
          <div class="agent-contact">${contact(branding)}</div>
        </div>
        <div class="brokerage">${brokerageBlock(branding)}</div>
        <div class="prepared">
          <span>${clientName ? `PREPARED-FOR / ${esc(clientName).toUpperCase()}` : ""}</span>
          <span>GEN-${esc(generatedAt).toUpperCase().replace(/[ ,]+/g, "-")}</span>
        </div>
      </div>
      ${pageFooter(data, branding, 1, totalPages, generatedAt, theme)}
    </section>
  `;
}
