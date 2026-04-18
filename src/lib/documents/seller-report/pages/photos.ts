/**
 * Seller Report v2 — Page 6: Property Photos
 *
 * Curated photo gallery using the 6-slot layout from the mockup:
 * wide hero (cols 1-3), two secondary (cols 2-3 row 2 + col 1 row 2),
 * three bottom-row thirds.
 */

import type { SellerReportData } from "../../seller-report-pdf";
import type { AgentBranding } from "../../pdf-report-utils";
import type { ThemeTokens } from "../themes";
import { esc, pageWithBand } from "../shell";

export function pagePhotos(data: SellerReportData, branding: AgentBranding, pageNum: number, totalPages: number, generatedAt: string, theme: ThemeTokens): string {
  const photos: string[] = Array.isArray(data.photoGalleryData) && data.photoGalleryData.length > 0
    ? data.photoGalleryData.slice(0, 6)
    : (Array.isArray(data.photos) ? data.photos.slice(0, 6) : []);

  // If we have fewer than 6, pad with empty cells so the grid keeps its shape.
  const cells = Array.from({ length: 6 }, (_, i) => photos[i] || "");

  const body = photos.length === 0 ? `
    <h2 class="section-title">Property Photos</h2>
    <div class="section-sub">Listing gallery</div>
    <div class="stub" style="flex: 1;">
      <div class="stub-eyebrow">No photos available</div>
      <div class="stub-body">This listing has no photos on file. Once the listing is added to MLS with photos, they will appear here.</div>
    </div>
  ` : `
    <h2 class="section-title">Property Photos</h2>
    <div class="section-sub">${esc(String(photos.length))} of ${esc(String((data.photoGalleryData || data.photos || []).length))} MLS photos</div>
    <div class="gallery">
      ${cells.map((url) => `
        <div class="gphoto">${url ? `<img src="${esc(url)}" alt="" />` : ""}</div>
      `).join("")}
    </div>
  `;

  return pageWithBand(data, branding, pageNum, totalPages, generatedAt, theme, body, "p6");
}
