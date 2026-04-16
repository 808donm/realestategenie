/**
 * HTML-to-PDF Rendering Utility
 *
 * Uses Puppeteer + @sparticuz/chromium to render rich HTML pages to PDF.
 * This replaces jsPDF for reports that need charts, complex layouts, maps,
 * and pixel-perfect rendering matching RPR quality.
 *
 * Works in both local development (uses system Chrome) and Vercel serverless
 * (uses @sparticuz/chromium Lambda-compatible binary).
 */

import type { Browser } from "puppeteer-core";

let browserPromise: Promise<Browser> | null = null;

/**
 * Get or create a shared Puppeteer browser instance.
 * Reuses the browser across invocations within the same Lambda container.
 */
async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    const browser = await browserPromise;
    if (browser.connected) return browser;
    browserPromise = null;
  }

  browserPromise = (async () => {
    const puppeteer = await import("puppeteer-core");

    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      // Serverless environment (Vercel / Lambda)
      const chromium = await import("@sparticuz/chromium");
      return puppeteer.default.launch({
        args: chromium.default.args,
        defaultViewport: { width: 1200, height: 1600 },
        executablePath: await chromium.default.executablePath(),
        headless: true,
      });
    } else {
      // Local development - find system Chrome
      const possiblePaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
      ];

      let execPath: string | undefined;
      const fs = await import("fs");
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          execPath = p;
          break;
        }
      }

      if (!execPath) {
        throw new Error(
          "Chrome not found. Install Chrome or set CHROME_PATH environment variable. " +
          "Checked: " + possiblePaths.join(", ")
        );
      }

      return puppeteer.default.launch({
        executablePath: process.env.CHROME_PATH || execPath,
        headless: true,
        defaultViewport: { width: 1200, height: 1600 },
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      });
    }
  })();

  return browserPromise;
}

/**
 * Render an HTML string to a PDF buffer.
 *
 * @param html - Complete HTML document string (including <html>, <head>, <style>)
 * @param options - PDF generation options
 * @returns PDF as a Buffer
 */
export async function renderHtmlToPdf(
  html: string,
  options?: {
    format?: "A4" | "Letter";
    landscape?: boolean;
    margin?: { top?: string; right?: string; bottom?: string; left?: string };
    printBackground?: boolean;
    displayHeaderFooter?: boolean;
    headerTemplate?: string;
    footerTemplate?: string;
  },
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set content with generous timeout for image loading
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for any async chart rendering (Chart.js, etc.)
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 500)));

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: options?.format || "Letter",
      landscape: options?.landscape || false,
      printBackground: options?.printBackground !== false,
      margin: options?.margin || {
        top: "0.4in",
        right: "0.4in",
        bottom: "0.6in",
        left: "0.4in",
      },
      displayHeaderFooter: options?.displayHeaderFooter || false,
      headerTemplate: options?.headerTemplate || "",
      footerTemplate: options?.footerTemplate || "",
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

/**
 * Build the common CSS styles used across all report types.
 * This provides the branded look matching our Real Estate Genie design.
 */
export function getReportBaseStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 11px;
      color: #111827;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Page break control */
    .page-break { page-break-before: always; }
    .avoid-break { page-break-inside: avoid; }

    /* Header bar */
    .report-header {
      background: #1e40af;
      color: white;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: -0.4in -0.4in 16px -0.4in;
      width: calc(100% + 0.8in);
    }
    .report-header .report-type { font-size: 9px; opacity: 0.8; }
    .report-header .report-address { font-size: 13px; font-weight: 700; }
    .report-header .brand { font-size: 11px; font-weight: 700; }
    .report-header .brand-tm { font-size: 6px; vertical-align: super; }
    .gold-accent {
      height: 3px;
      background: #b4822a;
      margin: -16px -0.4in 16px -0.4in;
      width: calc(100% + 0.8in);
    }

    /* Cover page */
    .cover-page {
      text-align: center;
      padding: 40px 0;
    }
    .cover-page .cover-title {
      font-size: 28px;
      font-weight: 800;
      color: white;
      background: #1e40af;
      padding: 30px 40px;
      margin: -0.4in -0.4in 0 -0.4in;
      width: calc(100% + 0.8in);
    }
    .cover-page .cover-subtitle {
      font-size: 14px;
      color: white;
      opacity: 0.85;
      margin-top: 4px;
    }
    .cover-page .cover-gold {
      height: 4px;
      background: #b4822a;
      margin: 0 -0.4in 20px -0.4in;
      width: calc(100% + 0.8in);
    }

    /* Section titles */
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #1e40af;
      text-transform: uppercase;
      padding: 8px 12px;
      background: #f3f4f6;
      border-left: 4px solid #1e40af;
      margin: 20px 0 12px 0;
    }

    /* Big section headers (like RPR's "Housing", "People", etc.) */
    .big-section-header {
      font-size: 22px;
      font-weight: 800;
      color: #111827;
      border-bottom: 3px solid #1e40af;
      padding-bottom: 8px;
      margin: 30px 0 16px 0;
    }

    /* Value cards */
    .value-cards { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
    .value-card {
      flex: 1;
      min-width: 120px;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      background: #f8fafc;
    }
    .value-card .vc-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #6b7280; }
    .value-card .vc-value { font-size: 20px; font-weight: 800; color: #1e40af; margin-top: 2px; }
    .value-card .vc-sub { font-size: 9px; color: #9ca3af; margin-top: 2px; }
    .value-card.green .vc-value { color: #15803d; }
    .value-card.red .vc-value { color: #dc2626; }
    .value-card.gold .vc-value { color: #b45309; }
    .value-card.dark { background: #1e293b; }
    .value-card.dark .vc-label { color: #94a3b8; }
    .value-card.dark .vc-value { color: white; }

    /* Data rows */
    .data-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 11px;
    }
    .data-row .dr-label { color: #6b7280; }
    .data-row .dr-value { font-weight: 600; color: #111827; text-align: right; }

    /* Comparison tables */
    .comp-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px; }
    .comp-table th {
      background: #1e40af;
      color: white;
      padding: 6px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 9px;
    }
    .comp-table td {
      padding: 5px 8px;
      border-bottom: 1px solid #f3f4f6;
    }
    .comp-table tr:nth-child(even) td { background: #f9fafb; }
    .comp-table .num { text-align: right; font-variant-numeric: tabular-nums; }

    /* Market type indicator */
    .market-indicator {
      display: flex;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin: 8px 0;
    }
    .market-indicator .mi-sellers { background: #ef4444; flex: 1; }
    .market-indicator .mi-balanced { background: #f59e0b; flex: 1; }
    .market-indicator .mi-buyers { background: #3b82f6; flex: 1; }
    .market-indicator-labels {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .market-arrow {
      width: 0; height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 10px solid #374151;
    }

    /* Photo grid */
    .photo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 16px; }
    .photo-grid img { width: 100%; height: 120px; object-fit: cover; border-radius: 4px; }
    .photo-grid.large img { height: 180px; }

    /* AVM range bar */
    .avm-bar-container { margin: 8px 0 16px 0; }
    .avm-bar {
      height: 10px;
      background: linear-gradient(90deg, #1e40af 0%, #3b82f6 50%, #1e40af 100%);
      border-radius: 5px;
      position: relative;
      margin: 4px 0;
    }
    .avm-bar .avm-dot {
      width: 14px; height: 14px;
      background: #b4822a;
      border: 2px solid white;
      border-radius: 50%;
      position: absolute;
      top: -2px;
      transform: translateX(-50%);
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    .avm-bar-labels { display: flex; justify-content: space-between; font-size: 10px; color: #6b7280; }
    .avm-bar-value { text-align: center; font-size: 11px; font-weight: 700; color: #111827; }

    /* Equity bar */
    .equity-bar { height: 14px; border-radius: 4px; overflow: hidden; display: flex; margin: 8px 0; }
    .equity-bar .eb-loan { background: #dc2626; }
    .equity-bar .eb-equity { background: #15803d; }

    /* Hazard badges */
    .hazard-badge {
      padding: 6px 10px;
      background: #fef2f2;
      border-left: 4px solid #dc2626;
      border-radius: 4px;
      margin-bottom: 6px;
    }
    .hazard-badge .hb-label { font-size: 9px; font-weight: 700; color: #dc2626; text-transform: uppercase; }
    .hazard-badge .hb-value { font-size: 11px; color: #374151; margin-top: 2px; }

    /* MoM trend */
    .mom-positive { color: #15803d; }
    .mom-negative { color: #dc2626; }
    .mom-neutral { color: #6b7280; }

    /* Walkability circle */
    .walk-circle {
      width: 80px; height: 80px;
      border-radius: 50%;
      border: 4px solid #1e40af;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    }
    .walk-circle .wc-score { font-size: 22px; font-weight: 800; color: #111827; }
    .walk-circle .wc-label { font-size: 7px; color: #6b7280; }

    /* Listing status badge */
    .status-badge {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      color: white;
    }
    .status-badge.active { background: #15803d; }
    .status-badge.pending { background: #d97706; }
    .status-badge.closed { background: #6b7280; }

    /* Footer */
    .report-footer {
      margin-top: 20px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: #9ca3af;
    }

    /* Chart container */
    .chart-container { width: 100%; margin: 12px 0; }
    .chart-container canvas { width: 100% !important; }

    /* Agent branding */
    .agent-branding {
      display: flex;
      gap: 16px;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 16px;
    }
    .agent-branding img.headshot {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
    }
    .agent-branding .ab-name { font-size: 16px; font-weight: 700; color: #111827; }
    .agent-branding .ab-detail { font-size: 10px; color: #6b7280; }

    /* Two-column layout */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    /* Pricing strategy gold box */
    .pricing-box {
      border: 2px solid #b4822a;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 16px 0;
    }
    .pricing-box .pb-label { font-size: 10px; font-weight: 700; color: #92400e; text-transform: uppercase; }
    .pricing-box .pb-value { font-size: 28px; font-weight: 800; color: #111827; margin: 4px 0; }
    .pricing-box .pb-sub { font-size: 11px; color: #6b7280; }

    /* Bar chart (horizontal) */
    .h-bar-chart { margin: 8px 0; }
    .h-bar-row { display: flex; align-items: center; margin-bottom: 4px; }
    .h-bar-label { width: 100px; font-size: 10px; color: #6b7280; text-align: right; padding-right: 8px; flex-shrink: 0; }
    .h-bar-track { flex: 1; height: 16px; background: #f3f4f6; border-radius: 3px; overflow: hidden; position: relative; }
    .h-bar-fill { height: 100%; background: #3b82f6; border-radius: 3px; min-width: 2px; }
    .h-bar-value { width: 50px; font-size: 10px; font-weight: 600; color: #111827; padding-left: 6px; flex-shrink: 0; }
  `;
}

/**
 * Helper: Build the page header HTML (blue bar + gold accent).
 */
export function buildPageHeader(reportType: string, address: string): string {
  return `
    <div class="report-header">
      <div>
        <div class="report-type">${reportType}</div>
        <div class="report-address">${address}</div>
      </div>
      <div>
        <span class="brand">Real Estate Genie</span><span class="brand-tm">TM</span>
      </div>
    </div>
    <div class="gold-accent"></div>
  `;
}

/**
 * Helper: Build the page footer HTML.
 */
export function buildPageFooter(date: string, agentName: string): string {
  return `
    <div class="report-footer">
      <div><strong>Real Estate Genie</strong> &nbsp; ${date}</div>
      <div>Information is not guaranteed. Equal Housing Opportunity.</div>
    </div>
  `;
}
