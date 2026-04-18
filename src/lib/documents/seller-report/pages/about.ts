/**
 * Seller Report v2 — Page 13: About / Data Sources / Agent closing card
 */

import type { SellerReportData } from "../../seller-report-pdf";
import type { AgentBranding } from "../../pdf-report-utils";
import { esc, initial, pageWithBand } from "../shell";

export function pageAbout(data: SellerReportData, branding: AgentBranding, pageNum: number, totalPages: number, generatedAt: string): string {
  const avatar = branding.headshotData
    ? `<img src="${esc(branding.headshotData)}" alt="" />`
    : esc(initial(branding.displayName));

  const dataSources = [
    "MLS · HiCentral",
    "Honolulu County Assessor",
    "Bureau of Conveyances",
    "FEMA NRI & Flood",
    "Hawaii State GIS",
    "Tsunami Evac Maps",
    "Sea Level Rise Viewer",
    "DOH Cesspool Inventory",
    "U.S. Census ACS",
    "NCES School Data",
    "HUD Fair Market Rent",
    "BLS Regional Data",
  ];

  const clientName = (data as any).clientName || (data as any).preparedFor;

  const body = `
    <h2 class="section-title">About This Report</h2>
    <div class="section-sub">Data sources · disclaimer · your agent</div>

    <h3 class="block-title">About Real Estate Genie</h3>
    <p class="about-body">
      Real Estate Genie is a Hawaii-built real estate intelligence platform used by agents, teams, and brokerages across the islands. This Seller Report is assembled from MLS data, Hawaii county records, FEMA, U.S. Census, state GIS, and proprietary valuation models. The Genie AVM™ is an automated estimate of market value; estimates are not formal appraisals and should not be used as the sole basis for lending decisions.
    </p>

    <h3 class="block-title">Data Sources</h3>
    <div class="data-sources">
      ${dataSources.map((s) => `<span>${esc(s)}</span>`).join("")}
    </div>

    <div style="background: #fff; border: 1px solid var(--bone-300); padding: 20px 24px; margin-top: 18px; display: grid; grid-template-columns: 72px 1fr 1fr; gap: 22px; align-items: flex-start;">
      <div style="width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #D9B88E, #8a5c38); display: flex; align-items: center; justify-content: center; color: #fff; font-family: var(--font-display); font-size: 28px; font-weight: 600; border: 2px solid var(--bone-100); overflow: hidden;">${avatar}</div>
      <div>
        <div style="font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--navy-900);">${esc(branding.displayName)}</div>
        <div style="font-size: 10px; color: var(--ink-mute); margin-bottom: 8px;">${esc((branding as any).title || "REALTOR · Listing Agent")}</div>
        ${branding.licenseNumber ? `<div style="font-family: var(--font-mono); font-size: 9px; color: var(--gold-600); margin-bottom: 10px; letter-spacing: 0.1em;">LICENSE #${esc(branding.licenseNumber)}</div>` : ""}
        <div style="font-size: 10px; line-height: 1.6; color: var(--ink-soft);">
          ${branding.phone ? `${esc(branding.phone)}<br/>` : ""}
          ${branding.email ? `${esc(branding.email)}<br/>` : ""}
          ${(branding as any).website ? esc((branding as any).website) : ""}
        </div>
      </div>
      <div style="border-left: 1px solid var(--bone-300); padding-left: 18px; font-size: 10px; line-height: 1.5; color: var(--ink-soft);">
        <div style="font-family: var(--font-display); font-weight: 600; font-size: 13px; color: var(--navy-900); margin-bottom: 4px;">${esc(branding.brokerageName || "Real Estate Genie")}</div>
        ${(branding as any).brokerageAddress ? esc((branding as any).brokerageAddress).replace(/\n/g, "<br/>") : ""}
        ${(branding as any).brokerageLicense ? `<br/><br/><span style="font-family: var(--font-mono); font-size: 9px; color: var(--gold-600); letter-spacing: 0.1em;">BROKERAGE LIC. ${esc((branding as any).brokerageLicense)}</span>` : ""}
      </div>
    </div>

    <p style="font-size: 9px; color: var(--ink-mute); margin-top: 22px; line-height: 1.5; max-width: 70ch;">
      This report was prepared by ${esc(branding.displayName)}${clientName ? ` exclusively for ${esc(clientName)}` : ""}. Market data reflects trends as of the generation date. Information is deemed reliable but not guaranteed. Real Estate Genie, the Genie AVM™, and Hulia'u Software, Inc. make no warranties about the accuracy, completeness, or fitness for any particular purpose of the information contained in this report.
    </p>
  `;

  // Equal Housing Opportunity glyph rendered as absolute element inside page
  const raw = pageWithBand(data, branding, pageNum, totalPages, generatedAt, body, "p13");
  // Inject EHO glyph just before the footer close — simplest: append to returned string inside the </section>
  return raw.replace(/<\/section>\s*$/, `<div class="eho" title="Equal Housing Opportunity">≡</div></section>`);
}
