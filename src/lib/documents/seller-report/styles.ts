/**
 * Seller Report v2 — print-ready CSS.
 *
 * Design tokens, page layout, typography, and component styles.
 * Mirrors the locked-in visual mockup (mockup/Seller Report - Mockup.html).
 *
 * Fonts load via Google Fonts @import. Puppeteer waits on `networkidle0`
 * so fonts arrive before PDF render.
 */

export function getSellerReportStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    @page { size: 8.5in 11in; margin: 0; }

    :root {
      --navy-900: #061A3A;
      --navy-800: #0A2C5E;
      --navy-700: #153a73;
      --navy-600: #204e8e;
      --navy-500: #3168a8;
      --gold-600: #C6932E;
      --gold-500: #E8B84A;
      --gold-400: #F2CE7A;
      --bone-50:  #FBF8F1;
      --bone-100: #F8F4EC;
      --bone-200: #EEE7D6;
      --bone-300: #E1D6BC;
      --ink:      #0F1A2E;
      --ink-soft: #2A3650;
      --ink-mute: #5B6680;
      --red-600:  #C8372D;
      --green-600: #2F7D5B;
      --font-display: "Playfair Display", Georgia, serif;
      --font-sans: "Inter", -apple-system, sans-serif;
      --font-mono: "JetBrains Mono", ui-monospace, monospace;
    }

    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #fff; font-family: var(--font-sans); color: var(--ink); }

    .page {
      width: 8.5in;
      height: 11in;
      background: var(--bone-50);
      position: relative;
      overflow: hidden;
      page-break-after: always;
      font-size: 11px;
      color: var(--ink);
    }
    .page:last-child { page-break-after: auto; }
    .page-body { position: absolute; inset: 48px 48px 86px; display: flex; flex-direction: column; }
    .page-footer {
      position: absolute; left: 48px; right: 48px; bottom: 32px;
      border-top: 0.5px solid var(--bone-300); padding-top: 8px;
      display: flex; justify-content: space-between; gap: 24px;
      font-size: 9px; color: var(--ink-mute); line-height: 1.4;
    }
    .page-footer .ctr { text-align: center; }
    .page-footer .rt { text-align: right; font-family: var(--font-mono); }
    .page-footer strong { color: var(--navy-900); font-weight: 600; }

    /* Agent band (pages 2-12) */
    .agent-band { display: flex; align-items: center; gap: 12px; padding: 0 0 12px; border-bottom: 0.5px solid var(--bone-300); margin-bottom: 22px; }
    .agent-band .photo { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #D9B88E 0%, #A27548 100%); border: 1.5px solid var(--gold-500); flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 13px; font-family: var(--font-display); object-fit: cover; overflow: hidden; }
    .agent-band .photo img { width: 100%; height: 100%; object-fit: cover; }
    .agent-band .who { flex: 1; line-height: 1.3; }
    .agent-band .who .name { font-family: var(--font-display); font-weight: 600; font-size: 13px; color: var(--navy-900); }
    .agent-band .who .sub { font-size: 9px; color: var(--ink-mute); font-family: var(--font-mono); letter-spacing: 0.04em; }
    .agent-band .addr { text-align: right; font-size: 10px; color: var(--ink-soft); line-height: 1.3; }
    .agent-band .addr .a { font-family: var(--font-display); font-weight: 600; font-size: 13px; color: var(--navy-900); }

    .section-title { font-family: var(--font-display); font-weight: 700; font-size: 22px; color: var(--navy-900); margin: 0 0 4px; letter-spacing: -0.01em; }
    .section-sub { font-size: 10px; color: var(--ink-mute); font-family: var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 16px; }

    /* Cover */
    .cover-hero { position: absolute; inset: 0 0 auto 0; height: 620px; background: linear-gradient(180deg, transparent 50%, rgba(6,26,58,0.72) 100%), linear-gradient(135deg, #3a5a7f 0%, #1a3a5a 40%, #0a2442 100%); overflow: hidden; }
    .cover-hero.with-photo { background: none; }
    .cover-hero .hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
    .cover-hero .hero-scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(6,26,58,0.2) 0%, rgba(6,26,58,0.72) 100%); z-index: 1; }
    .cover-hero::before { content: ""; position: absolute; inset: 0; background: radial-gradient(ellipse 800px 400px at 60% 20%, rgba(242,206,122,0.35), transparent 60%), linear-gradient(180deg, #d8c4a0 0%, #c8a878 30%, #88603a 60%, #4a3a2a 85%); }
    .cover-hero.with-photo::before { display: none; }
    .cover-palm { position: absolute; bottom: 0; right: 60px; width: 160px; height: 340px; z-index: 2; }
    .cover-hero.with-photo .cover-palm { display: none; }
    .cover-overlay { position: absolute; left: 48px; right: 48px; bottom: 450px; color: #fff; z-index: 3; }
    .cover-overlay .eyebrow { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.3em; color: var(--gold-500); margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
    .cover-overlay .eyebrow::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, var(--gold-500), transparent); margin-left: 10px; }
    .cover-overlay h1 { font-family: var(--font-display); font-weight: 700; font-size: 54px; line-height: 0.98; letter-spacing: -0.02em; margin: 0 0 12px; color: #fff; max-width: 11ch; text-shadow: 0 2px 20px rgba(0,0,0,0.3); }
    .cover-overlay h2 { font-family: var(--font-display); font-weight: 400; font-style: italic; font-size: 22px; margin: 0 0 22px; color: var(--gold-400); letter-spacing: -0.005em; }
    .cover-overlay .pill { display: inline-flex; gap: 10px; align-items: center; padding: 7px 14px; background: rgba(232,184,74,0.95); color: var(--navy-900); font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.2em; border-radius: 999px; font-weight: 600; }
    .cover-overlay .pill .dot { width: 6px; height: 6px; background: var(--green-600); border-radius: 50%; }

    .agent-card { position: absolute; left: 48px; right: 48px; bottom: 72px; background: #fff; border-top: 3px solid var(--gold-500); padding: 28px 32px; box-shadow: 0 20px 40px -20px rgba(6,26,58,0.3); display: grid; grid-template-columns: 90px 1fr 1fr; gap: 28px; align-items: flex-start; }
    .agent-card .big-photo { width: 90px; height: 90px; border-radius: 50%; background: linear-gradient(135deg, #D9B88E 0%, #8a5c38 100%); display: flex; align-items: center; justify-content: center; color: #fff; font-family: var(--font-display); font-size: 34px; font-weight: 600; border: 3px solid var(--bone-100); box-shadow: 0 4px 16px -4px rgba(0,0,0,0.3); overflow: hidden; }
    .agent-card .big-photo img { width: 100%; height: 100%; object-fit: cover; }
    .agent-card .agent-name { font-family: var(--font-display); font-size: 24px; font-weight: 700; color: var(--navy-900); line-height: 1.05; margin-bottom: 3px; }
    .agent-card .agent-title { font-size: 11px; color: var(--ink-mute); margin-bottom: 10px; }
    .agent-card .agent-lic { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.1em; color: var(--gold-600); padding: 3px 8px; background: var(--bone-100); border-radius: 3px; display: inline-block; margin-bottom: 10px; }
    .agent-card .agent-contact { font-size: 10px; line-height: 1.6; color: var(--ink-soft); }
    .agent-card .agent-contact strong { color: var(--navy-900); font-weight: 600; }
    .agent-card .brokerage { border-left: 1px solid var(--bone-300); padding-left: 24px; font-size: 10px; line-height: 1.5; color: var(--ink-soft); }
    .agent-card .brokerage .brok-name { font-family: var(--font-display); font-weight: 600; font-size: 13px; color: var(--navy-900); margin-bottom: 6px; line-height: 1.2; }
    .agent-card .prepared { grid-column: 1 / -1; border-top: 1px solid var(--bone-200); margin-top: 6px; padding-top: 14px; display: flex; justify-content: space-between; font-size: 10px; color: var(--ink-mute); }
    .agent-card .prepared strong { color: var(--navy-900); font-weight: 600; }

    /* Valuation (page 2) */
    .val-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 18px; }
    .val-card { background: #fff; border: 1px solid var(--bone-300); padding: 22px 24px; position: relative; }
    .val-card.primary { background: var(--navy-900); color: #fff; border: none; grid-column: 1 / -1; padding: 28px 32px; display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: center; }
    .val-card .label { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold-600); margin-bottom: 8px; }
    .val-card.primary .label { color: var(--gold-500); }
    .val-card .value { font-family: var(--font-display); font-size: 36px; font-weight: 700; color: var(--navy-900); line-height: 1; letter-spacing: -0.02em; }
    .val-card.primary .value { color: var(--gold-500); font-size: 64px; }
    .val-card .sub { font-size: 10px; color: var(--ink-mute); margin-top: 6px; }
    .val-card.primary .sub { color: rgba(255,255,255,0.6); }

    .avm-meta { display: flex; flex-direction: column; gap: 12px; min-width: 180px; }
    .avm-meta .row { display: flex; justify-content: space-between; gap: 12px; font-size: 10px; color: rgba(255,255,255,0.75); }
    .avm-meta .row strong { color: #fff; font-family: var(--font-mono); font-size: 11px; }
    .stars { display: inline-flex; gap: 2px; }
    .stars span { width: 10px; height: 10px; background: var(--gold-500); clip-path: polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%); }
    .stars span.off { background: rgba(255,255,255,0.2); }

    .range-bar { grid-column: 1 / -1; background: #fff; border: 1px solid var(--bone-300); padding: 18px 22px; }
    .range-bar .track { position: relative; height: 8px; background: linear-gradient(90deg, var(--bone-200), var(--gold-400), var(--bone-200)); border-radius: 4px; margin: 22px 0 8px; }
    .range-bar .marker { position: absolute; top: -6px; transform: translateX(-50%); width: 2px; height: 20px; background: var(--navy-900); }
    .range-bar .marker-label { position: absolute; top: -20px; transform: translateX(-50%); font-family: var(--font-mono); font-size: 9px; font-weight: 600; color: var(--navy-900); white-space: nowrap; }
    .range-bar .labels { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px; color: var(--ink-mute); }

    .tax-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border: 1px solid var(--bone-300); background: #fff; margin-top: 16px; }
    .tax-strip > div { padding: 14px 18px; border-right: 1px solid var(--bone-200); }
    .tax-strip > div:last-child { border-right: none; }
    .tax-strip .tlabel { font-family: var(--font-mono); font-size: 8px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink-mute); margin-bottom: 6px; }
    .tax-strip .tval { font-family: var(--font-display); font-size: 18px; font-weight: 600; color: var(--navy-900); line-height: 1; }

    .delta-up { color: var(--green-600); font-weight: 600; }
    .delta-dn { color: var(--red-600); font-weight: 600; }

    /* Tables */
    .t3 { width: 100%; border-collapse: collapse; font-size: 9.5px; }
    .t3 th, .t3 td { padding: 6px 10px; text-align: left; border-bottom: 0.5px solid var(--bone-200); vertical-align: top; }
    .t3 thead th { background: var(--navy-900); color: #fff; font-family: var(--font-mono); font-size: 8.5px; letter-spacing: 0.14em; text-transform: uppercase; padding: 8px 10px; font-weight: 600; }
    .t3 tbody tr:nth-child(odd) td { background: var(--bone-100); }
    .t3 td.rowlbl { font-weight: 600; color: var(--navy-900); font-size: 9.5px; }
    .t3 .muted { color: var(--ink-mute); }

    .block-title { font-family: var(--font-display); font-weight: 600; font-size: 14px; color: var(--navy-900); margin: 14px 0 6px; padding-bottom: 4px; border-bottom: 1px solid var(--gold-500); display: inline-block; padding-right: 40px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }

    /* Hazard badges */
    .hazard-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 8px; }
    .hazard { border: 1px solid var(--bone-300); background: #fff; padding: 10px 12px; border-left: 3px solid var(--gold-500); }
    .hazard.hi { border-left-color: var(--navy-700); }
    .hazard .hlabel { font-family: var(--font-mono); font-size: 8px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink-mute); margin-bottom: 3px; }
    .hazard .hval { font-family: var(--font-display); font-size: 13px; font-weight: 600; color: var(--navy-900); line-height: 1.1; }
    .hazard .hsub { font-size: 9px; color: var(--ink-mute); margin-top: 2px; }

    /* Photo gallery */
    .gallery { display: grid; grid-template-columns: 2fr 1fr 1fr; grid-template-rows: repeat(3, 1fr); gap: 8px; flex: 1; min-height: 600px; }
    .gallery .gphoto { background: linear-gradient(135deg, #b8a080 0%, #7a5a3a 100%); position: relative; overflow: hidden; }
    .gallery .gphoto img { width: 100%; height: 100%; object-fit: cover; }
    .gallery .gphoto:nth-child(1) { grid-row: 1 / 3; }
    .gallery .gphoto:nth-child(2) { grid-column: 2 / 4; }
    .gallery .gphoto:nth-child(6) { grid-column: 1 / 4; }

    /* KPI cards */
    .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 14px; }
    .kpi { background: #fff; border: 1px solid var(--bone-300); padding: 14px 16px; }
    .kpi .k-label { font-family: var(--font-mono); font-size: 8.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-mute); margin-bottom: 6px; }
    .kpi .k-val { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--navy-900); line-height: 1; }
    .kpi .k-delta { font-size: 10px; margin-top: 4px; font-family: var(--font-mono); }

    /* Market gauge */
    .gauge { background: #fff; border: 1px solid var(--bone-300); padding: 14px 18px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 10px; }
    .gauge-top { display: flex; justify-content: space-between; align-items: baseline; }
    .gauge-top .glabel { font-family: var(--font-mono); font-size: 8.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-mute); }
    .gauge-top .gval { font-family: var(--font-display); font-size: 14px; font-weight: 600; color: var(--navy-900); }
    .gauge-track { position: relative; height: 8px; background: linear-gradient(90deg, var(--green-600) 0%, var(--gold-500) 50%, var(--red-600) 100%); border-radius: 4px; }
    .gauge-track .gmark { position: absolute; top: -3px; width: 3px; height: 14px; background: var(--navy-900); transform: translateX(-50%); }
    .gauge-labels { display: flex; justify-content: space-between; font-size: 9px; color: var(--ink-mute); font-family: var(--font-mono); letter-spacing: 0.1em; text-transform: uppercase; }

    /* Chart container */
    .chart-box { background: #fff; border: 1px solid var(--bone-300); padding: 14px 16px 10px; }
    .chart-title { font-family: var(--font-display); font-weight: 600; font-size: 13px; color: var(--navy-900); margin: 0 0 2px; }
    .chart-sub { font-family: var(--font-mono); font-size: 8.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-mute); margin-bottom: 8px; }
    .chart-legend { display: flex; gap: 16px; font-size: 9px; color: var(--ink-soft); font-family: var(--font-mono); margin-top: 6px; flex-wrap: wrap; }
    .chart-legend .dot { display: inline-block; width: 10px; height: 2px; margin-right: 6px; vertical-align: middle; }

    /* Map */
    .map-box { background: linear-gradient(45deg, #e8e4d8 25%, transparent 25%) 0 0/20px 20px, linear-gradient(-45deg, #e8e4d8 25%, transparent 25%) 0 0/20px 20px, linear-gradient(45deg, transparent 75%, #e8e4d8 75%) 0 0/20px 20px, linear-gradient(-45deg, transparent 75%, #e8e4d8 75%) 0 0/20px 20px, #f5f1e4; border: 1px solid var(--bone-300); height: 220px; position: relative; overflow: hidden; }
    .map-box img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .map-box svg { position: absolute; inset: 0; width: 100%; height: 100%; }

    /* 4-column change type table */
    .ct-table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
    .ct-table th { background: var(--navy-900); color: #fff; font-family: var(--font-mono); font-size: 8.5px; letter-spacing: 0.14em; text-transform: uppercase; padding: 8px 8px; font-weight: 600; text-align: left; }
    .ct-table th:first-child { background: var(--navy-700); }
    .ct-table td { padding: 5px 8px; border-bottom: 0.5px solid var(--bone-200); }
    .ct-table tbody tr:nth-child(odd) td { background: var(--bone-100); }
    .ct-table td:first-child { font-weight: 600; color: var(--navy-900); }

    /* Pricing strategy */
    .ps-title { font-family: var(--font-display); font-weight: 600; font-size: 14px; color: var(--navy-900); margin: 0 0 8px; }
    .rv-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }
    .rv-table td { padding: 5px 10px; border-bottom: 0.5px solid var(--bone-200); }
    .rv-table td:first-child { color: var(--ink-soft); }
    .rv-table td:last-child { text-align: right; font-family: var(--font-mono); font-weight: 500; color: var(--navy-900); }
    .rv-table tr.total td { border-top: 1.5px solid var(--gold-500); border-bottom: none; padding-top: 10px; font-weight: 700; color: var(--navy-900); font-size: 12px; }
    .rv-table tr.total td:last-child { color: var(--gold-600); }

    /* About page */
    .about-body { font-size: 11px; line-height: 1.55; color: var(--ink-soft); max-width: 60ch; margin: 0 0 14px; }
    .data-sources { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 18px; }
    .data-sources span { background: var(--bone-200); padding: 4px 10px; font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.08em; color: var(--navy-900); border-radius: 2px; }
    .eho { position: absolute; bottom: 96px; right: 48px; width: 48px; height: 48px; border: 1.5px solid var(--navy-900); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--navy-900); }

    /* Stub page (p3-p12 under construction) */
    .stub { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--ink-mute); text-align: center; padding: 40px; }
    .stub .stub-eyebrow { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--gold-600); }
    .stub .stub-title { font-family: var(--font-display); font-size: 28px; font-weight: 700; color: var(--navy-900); }
    .stub .stub-body { font-size: 11px; line-height: 1.55; max-width: 50ch; color: var(--ink-soft); }
  `;
}
