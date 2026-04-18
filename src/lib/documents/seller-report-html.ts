/**
 * Seller Report HTML Builder — v2 (13-page RPR-equivalent rebuild).
 *
 * Orchestrates the 13 page modules under ./seller-report/ into a single
 * HTML document. Puppeteer renders the result to PDF.
 *
 * Pages already built render real data; pages still under construction
 * render a stub notice so the PDF always has 13 pages during the rebuild.
 *
 * Build order (each page ships as a separate commit):
 *   p1  Cover              ✓
 *   p2  Valuation          ✓
 *   p3  Property Facts     stub
 *   p4  Features           stub
 *   p5  Legal · Hazards    stub
 *   p6  Photos             stub
 *   p7  Market Trends      stub (needs 4-geo 2008-present history endpoint)
 *   p8  Active Listings    stub (needs 5yr list-price trend)
 *   p9  Sold Listings      stub (needs 5yr sold trend + 12mo grouped)
 *   p10 Dual Trends        stub (needs 24mo dual-axis data)
 *   p11 Market Activity    stub (needs status-grouped stats + map pins)
 *   p12 Pricing Strategy   stub (needs CMA + refined value wire-up)
 *   p13 About              ✓
 */

import type { SellerReportData } from "./seller-report-pdf";
import type { AgentBranding } from "./pdf-report-utils";
import { getSellerReportStyles } from "./seller-report/styles";
import { pageCover } from "./seller-report/pages/cover";
import { pageValuation } from "./seller-report/pages/valuation";
import { pageAbout } from "./seller-report/pages/about";
import { stubPage } from "./seller-report/pages/stubs";

const TOTAL_PAGES = 13;

export function buildSellerReportHtml(data: SellerReportData, branding: AgentBranding): string {
  const generatedAt =
    data.generatedAt ||
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const clientName = (data as any).clientName || (data as any).preparedFor;

  const p1 = pageCover(data, branding, TOTAL_PAGES, generatedAt, clientName);
  const p2 = pageValuation(data, branding, 2, TOTAL_PAGES, generatedAt);

  const p3 = stubPage(data, branding, 3, TOTAL_PAGES, generatedAt, "p3",
    "Property Facts",
    "Public Records · Listing · Agent Refinements",
    "The 3-column property-facts table is being rebuilt to show public records, listing data, and agent refinements side by side.");

  const p4 = stubPage(data, branding, 4, TOTAL_PAGES, generatedAt, "p4",
    "Interior & Exterior Features",
    "Listing vs Public",
    "Detailed interior and exterior feature tables (listing-side vs public-records side) are being rebuilt.");

  const p5 = stubPage(data, branding, 5, TOTAL_PAGES, generatedAt, "p5",
    "Legal · Owner · Hazards",
    "Hawaii-specific hazards + sales history",
    "Legal description, owner facts, sales history, and Hawaii-specific hazard zones (Flood, Tsunami Evacuation, Sea Level Rise, Cesspool Priority) are being rebuilt.");

  const p6 = stubPage(data, branding, 6, TOTAL_PAGES, generatedAt, "p6",
    "Property Photos",
    "Listing gallery",
    "A curated photo gallery pulled from the MLS listing is being rebuilt.");

  const p7 = stubPage(data, branding, 7, TOTAL_PAGES, generatedAt, "p7",
    "Market Trends",
    `${data.zip ? `ZIP ${data.zip}` : "Area"} · ${data.propertyType || "Residential"}`,
    "4 KPIs with month-over-month deltas, a 5-point market-type gauge, and the multi-geography (ZIP / County / State / USA) median-estimated-value trend chart are being rebuilt.");

  const p8 = stubPage(data, branding, 8, TOTAL_PAGES, generatedAt, "p8",
    "Active Listings",
    "5-year list-price trend",
    "The 5-year list-price trend chart and active-listings price-band breakdown are being rebuilt.");

  const p9 = stubPage(data, branding, 9, TOTAL_PAGES, generatedAt, "p9",
    "Sold Listings",
    "5-year sold-price trend + 12-month sales vs listings",
    "The 5-year sold-price trend and the 12-month Sales-vs-Listings grouped bar chart are being rebuilt.");

  const p10 = stubPage(data, branding, 10, TOTAL_PAGES, generatedAt, "p10",
    "Price vs Volume · 24-Month Trends",
    "Dual-axis — price and count",
    "Dual-axis charts comparing median sold price against sales count, and median list price against active listings, over 24 months are being rebuilt.");

  const p11 = stubPage(data, branding, 11, TOTAL_PAGES, generatedAt, "p11",
    "Market Activity",
    "New · Closed · Distressed · Expired",
    "The 4-column market-activity summary (new, closed, distressed, expired) and the area comp map are being rebuilt.");

  const p12 = stubPage(data, branding, 12, TOTAL_PAGES, generatedAt, "p12",
    "Pricing Strategy & Refined Value",
    "CMA workbench · agent-editable",
    "Pricing Strategy comparable-groups table, 90-day sold-price comparison, CMA summary, and Refined Value breakdown are being rebuilt.");

  const p13 = pageAbout(data, branding, 13, TOTAL_PAGES, generatedAt);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Seller Report — ${escape(data.address || "Property")}</title>
  <style>${getSellerReportStyles()}</style>
</head>
<body>
${p1}
${p2}
${p3}
${p4}
${p5}
${p6}
${p7}
${p8}
${p9}
${p10}
${p11}
${p12}
${p13}
</body>
</html>`;
}

function escape(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
