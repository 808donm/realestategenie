/**
 * Seller Report v2 — Page 1: Cover
 *
 * Full-bleed hero (listing photo or blue-gradient fallback with palm silhouette),
 * address overlay, status pill, agent card at bottom.
 */

import type { SellerReportData } from "../../seller-report-pdf";
import type { AgentBranding } from "../../pdf-report-utils";
import { esc, fmtDateShort, initial, pageFooter } from "../shell";
import { svgPalm } from "../svg";

export function pageCover(data: SellerReportData, branding: AgentBranding, totalPages: number, generatedAt: string, clientName?: string): string {
  const cityLine = [data.city, data.state, data.zip].filter(Boolean).join(", ");
  const hasHero = !!(data.primaryPhotoData || (data.photoGalleryData && data.photoGalleryData[0]) || data.mapImageData);
  const hero = hasHero
    ? `<div class="cover-hero with-photo"><div class="hero-scrim"></div></div>`
    : `<div class="cover-hero">${svgPalm()}</div>`;

  const hasPhoto = !!branding.headshotData;
  const avatarCls = hasPhoto ? "big-photo has-photo" : "big-photo";
  const avatarInner = hasPhoto ? "" : esc(initial(branding.displayName));

  // Build status pill. If listing is active show "ACTIVE", else omit.
  const statusText = data.listingStatus || null;
  const listedDate = (data as any).listDate ? fmtDateShort((data as any).listDate) : null;
  const pill = statusText
    ? `<span class="pill"><span class="dot"></span>${esc(String(statusText).toUpperCase())}${listedDate ? ` · LISTED ${esc(listedDate.toUpperCase())}` : ""}</span>`
    : "";

  // Title: split address into street portion vs city for two-line display
  const street = data.address || "Property";
  const lic = branding.licenseNumber ? `HAWAII REAL ESTATE LICENSE #${esc(branding.licenseNumber)}` : "";
  const brokerageBlock = `
    <div class="brokerage">
      <div class="brok-name">${esc(branding.brokerageName || "Real Estate Genie")}</div>
      ${(branding as any).brokerageAddress ? esc((branding as any).brokerageAddress).replace(/\n/g, "<br/>") + "<br/>" : ""}
      ${(branding as any).brokerageLicense ? `<br/><strong>Brokerage Lic.</strong> ${esc((branding as any).brokerageLicense)}` : ""}
    </div>
  `;

  return `
    <section class="page" id="p1">
      ${hero}
      <div class="cover-overlay">
        <div class="eyebrow">SELLER REPORT</div>
        <h1>${esc(street)}</h1>
        <h2>${esc(cityLine)}</h2>
        ${pill}
      </div>

      <div class="agent-card">
        <div class="${avatarCls}">${avatarInner}</div>
        <div>
          <div class="agent-name">${esc(branding.displayName)}</div>
          <div class="agent-title">${esc((branding as any).title || "REALTOR · Listing Agent")}</div>
          ${lic ? `<div class="agent-lic">${lic}</div>` : ""}
          <div class="agent-contact">
            ${branding.phone ? `<strong>Phone</strong> ${esc(branding.phone)}<br/>` : ""}
            ${branding.email ? `<strong>Email</strong> ${esc(branding.email)}<br/>` : ""}
            ${(branding as any).website ? `<strong>Web</strong> ${esc((branding as any).website)}` : ""}
          </div>
        </div>
        ${brokerageBlock}
        <div class="prepared">
          <span>${clientName ? `<strong>Prepared for</strong> &nbsp;${esc(clientName)}` : ""}</span>
          <span><strong>Generated</strong> &nbsp;${esc(generatedAt)}</span>
        </div>
      </div>

      ${pageFooter(data, branding, 1, totalPages, generatedAt)}
    </section>
  `;
}
