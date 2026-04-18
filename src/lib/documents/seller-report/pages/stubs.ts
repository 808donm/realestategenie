/**
 * Seller Report v2 — placeholder pages for p3-p12 that are not yet built.
 *
 * Each stub displays an "In progress" notice with the page title so the PDF
 * renders a full 13-page document during the rebuild. Replace each as the
 * real page lands.
 */

import type { SellerReportData } from "../../seller-report-pdf";
import type { AgentBranding } from "../../pdf-report-utils";
import { esc, pageWithBand } from "../shell";

export function stubPage(
  data: SellerReportData,
  branding: AgentBranding,
  pageNum: number,
  totalPages: number,
  generatedAt: string,
  pageId: string,
  title: string,
  subtitle: string,
  description: string,
): string {
  const body = `
    <h2 class="section-title">${esc(title)}</h2>
    <div class="section-sub">${esc(subtitle)}</div>
    <div class="stub">
      <div class="stub-eyebrow">Section in progress</div>
      <div class="stub-title">${esc(title)}</div>
      <div class="stub-body">${esc(description)}</div>
    </div>
  `;
  return pageWithBand(data, branding, pageNum, totalPages, generatedAt, body, pageId);
}
