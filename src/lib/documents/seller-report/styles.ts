/**
 * Seller Report v2 — theme-driven CSS.
 *
 * Generates a print-ready stylesheet from a ThemeTokens object plus optional
 * hero/headshot data URIs (defined once via CSS custom properties so the
 * same image appears on every page without being embedded N times).
 */

import type { ThemeTokens } from "./themes";

export function getSellerReportStyles(theme: ThemeTokens, headshotUrl?: string | null, heroUrl?: string | null): string {
  const headshotVar = headshotUrl ? `--headshot-url: url('${headshotUrl.replace(/'/g, "\\'")}');` : "";
  const heroVar = heroUrl ? `--hero-url: url('${heroUrl.replace(/'/g, "\\'")}');` : "";
  const avatarRadius = theme.avatarShape === "square" ? "0" : "50%";

  return `
    @page { size: 8.5in 11in; margin: 0; }

    :root {
      --t-font-display: ${theme.fontDisplay};
      --t-font-sans: ${theme.fontSans};
      --t-font-mono: ${theme.fontMono};

      --t-page-bg: ${theme.pageBg};
      --t-page-border: ${theme.pageBorder};
      --t-band-border: ${theme.bandBorder};

      --t-text: ${theme.text};
      --t-text-soft: ${theme.textSoft};
      --t-text-mute: ${theme.textMute};
      --t-heading: ${theme.heading};

      --t-accent: ${theme.accent};
      --t-accent-light: ${theme.accentLight};
      --t-accent-bg: ${theme.accentBg};

      --t-card-bg: ${theme.cardBg};
      --t-card-border: ${theme.cardBorder};
      --t-row-band: ${theme.rowBand};

      --t-up: ${theme.up};
      --t-down: ${theme.down};

      --t-avatar-bg: ${theme.avatarBg};
      --t-avatar-radius: ${avatarRadius};

      ${headshotVar}
      ${heroVar}
    }

    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #fff; font-family: var(--t-font-sans); color: var(--t-text); }

    .page {
      width: 8.5in;
      height: 11in;
      background: var(--t-page-bg);
      position: relative;
      overflow: hidden;
      page-break-after: always;
      font-size: 11px;
      color: var(--t-text);
    }
    .page:last-child { page-break-after: auto; }
    .page-body { position: absolute; inset: 48px 48px 86px; display: flex; flex-direction: column; }

    .page-footer {
      position: absolute; left: 48px; right: 48px; bottom: 32px;
      border-top: 0.5px solid var(--t-band-border); padding-top: 8px;
      display: flex; justify-content: space-between; gap: 24px;
      font-size: 9px; color: var(--t-text-mute); line-height: 1.4;
      ${theme.footerMonoFooter ? "font-family: var(--t-font-mono); letter-spacing: 0.05em;" : ""}
    }
    .page-footer .ctr { text-align: center; }
    .page-footer .rt { text-align: right; font-family: var(--t-font-mono); }
    .page-footer strong { color: var(--t-heading); font-weight: 600; }

    /* Agent band (pages 2-12) */
    .agent-band { display: flex; align-items: center; gap: 12px; padding: 0 0 12px; border-bottom: 0.5px solid var(--t-band-border); margin-bottom: 22px; }
    .agent-band .photo { width: 36px; height: 36px; border-radius: var(--t-avatar-radius); background: var(--t-avatar-bg); border: 1.5px solid var(--t-accent-light); flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 13px; font-family: var(--t-font-display); overflow: hidden; background-size: cover; background-position: center; }
    .agent-band .photo.has-photo { background-image: var(--headshot-url); color: transparent; border-color: var(--t-accent-light); }
    .agent-band .who { flex: 1; line-height: 1.3; }
    .agent-band .who .name { font-family: var(--t-font-display); font-weight: 600; font-size: 13px; color: var(--t-heading); }
    .agent-band .who .sub { font-size: 9px; color: var(--t-text-mute); font-family: var(--t-font-mono); letter-spacing: 0.04em; }
    .agent-band .addr { text-align: right; font-size: 10px; color: var(--t-text-soft); line-height: 1.3; }
    .agent-band .addr .a { font-family: var(--t-font-display); font-weight: 600; font-size: 13px; color: var(--t-heading); }

    .section-title { font-family: var(--t-font-display); font-weight: 700; font-size: 22px; color: var(--t-heading); margin: 0 0 4px; letter-spacing: -0.01em; }
    .section-sub { font-size: 10px; color: var(--t-text-mute); font-family: var(--t-font-mono); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 16px; }

    /* ─── Cover ────────────────────────────────────────────── */
    /* (Per-theme cover CSS is emitted per-template below; see
       cover-specific classes .cover-editor, .cover-archive, .cover-noir,
       .cover-terracotta, .cover-blueprint.) */
    ${coverCss(theme, !!heroUrl)}

    /* ─── Valuation (page 2) ───────────────────────────────── */
    .val-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 18px; }
    .val-card { background: var(--t-card-bg); border: 1px solid var(--t-card-border); padding: 22px 24px; position: relative; }
    .val-card.primary { background: var(--t-heading); color: #fff; border: none; grid-column: 1 / -1; padding: 28px 32px; display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: center; }
    .val-card .label { font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--t-accent); margin-bottom: 8px; }
    .val-card.primary .label { color: var(--t-accent-light); }
    .val-card .value { font-family: var(--t-font-display); font-size: 36px; font-weight: 700; color: var(--t-heading); line-height: 1; letter-spacing: -0.02em; }
    .val-card.primary .value { color: var(--t-accent-light); font-size: 64px; }
    .val-card .sub { font-size: 10px; color: var(--t-text-mute); margin-top: 6px; }
    .val-card.primary .sub { color: rgba(255,255,255,0.6); }

    .avm-meta { display: flex; flex-direction: column; gap: 12px; min-width: 180px; }
    .avm-meta .row { display: flex; justify-content: space-between; gap: 12px; font-size: 10px; color: rgba(255,255,255,0.75); }
    .avm-meta .row strong { color: #fff; font-family: var(--t-font-mono); font-size: 11px; }
    .stars { display: inline-flex; gap: 2px; }
    .stars span { width: 10px; height: 10px; background: var(--t-accent-light); clip-path: polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%); }
    .stars span.off { background: rgba(255,255,255,0.2); }

    .range-bar { grid-column: 1 / -1; background: var(--t-card-bg); border: 1px solid var(--t-card-border); padding: 18px 22px; }
    .range-bar .track { position: relative; height: 8px; background: linear-gradient(90deg, var(--t-accent-bg), var(--t-accent-light), var(--t-accent-bg)); border-radius: 4px; margin: 22px 0 8px; }
    .range-bar .marker { position: absolute; top: -6px; transform: translateX(-50%); width: 2px; height: 20px; background: var(--t-heading); }
    .range-bar .marker-label { position: absolute; top: -20px; transform: translateX(-50%); font-family: var(--t-font-mono); font-size: 9px; font-weight: 600; color: var(--t-heading); white-space: nowrap; }
    .range-bar .labels { display: flex; justify-content: space-between; font-family: var(--t-font-mono); font-size: 10px; color: var(--t-text-mute); }

    .tax-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border: 1px solid var(--t-card-border); background: var(--t-card-bg); margin-top: 16px; }
    .tax-strip > div { padding: 14px 18px; border-right: 1px solid var(--t-card-border); }
    .tax-strip > div:last-child { border-right: none; }
    .tax-strip .tlabel { font-family: var(--t-font-mono); font-size: 8px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--t-text-mute); margin-bottom: 6px; }
    .tax-strip .tval { font-family: var(--t-font-display); font-size: 18px; font-weight: 600; color: var(--t-heading); line-height: 1; }

    .delta-up { color: var(--t-up); font-weight: 600; }
    .delta-dn { color: var(--t-down); font-weight: 600; }

    /* Tables */
    .t3 { width: 100%; border-collapse: collapse; font-size: 9.5px; }
    .t3 th, .t3 td { padding: 6px 10px; text-align: left; border-bottom: 0.5px solid var(--t-card-border); vertical-align: top; }
    .t3 thead th { background: var(--t-heading); color: #fff; font-family: var(--t-font-mono); font-size: 8.5px; letter-spacing: 0.14em; text-transform: uppercase; padding: 8px 10px; font-weight: 600; }
    .t3 tbody tr:nth-child(odd) td { background: var(--t-row-band); }
    .t3 td.rowlbl { font-weight: 600; color: var(--t-heading); font-size: 9.5px; }
    .t3 .muted { color: var(--t-text-mute); }

    .block-title { font-family: var(--t-font-display); font-weight: 600; font-size: 14px; color: var(--t-heading); margin: 14px 0 6px; padding-bottom: 4px; border-bottom: 1px solid var(--t-accent-light); display: inline-block; padding-right: 40px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }

    /* About page */
    .about-body { font-size: 11px; line-height: 1.55; color: var(--t-text-soft); max-width: 60ch; margin: 0 0 14px; }
    .data-sources { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 18px; }
    .data-sources span { background: var(--t-accent-bg); padding: 4px 10px; font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.08em; color: var(--t-heading); border-radius: 2px; }
    .eho { position: absolute; bottom: 96px; right: 48px; width: 48px; height: 48px; border: 1.5px solid var(--t-heading); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--t-font-display); font-size: 22px; font-weight: 700; color: var(--t-heading); }

    /* Stub page (p3-p12 under construction) */
    .stub { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--t-text-mute); text-align: center; padding: 40px; }
    .stub .stub-eyebrow { font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--t-accent); }
    .stub .stub-title { font-family: var(--t-font-display); font-size: 28px; font-weight: 700; color: var(--t-heading); }
    .stub .stub-body { font-size: 11px; line-height: 1.55; max-width: 50ch; color: var(--t-text-soft); }
  `;
}

// ─── Per-theme cover CSS ───────────────────────────────────────────────

function coverCss(theme: ThemeTokens, hasHero: boolean): string {
  switch (theme.cover) {
    case "editor":      return coverEditorCss(hasHero);
    case "archive":     return coverArchiveCss(hasHero);
    case "noir":        return coverNoirCss(hasHero);
    case "terracotta":  return coverTerracottaCss(hasHero);
    case "blueprint":   return coverBlueprintCss(hasHero);
    default:            return coverEditorCss(hasHero);
  }
}

// T1 — Editor (navy/gold). Hero top, agent card bottom.
function coverEditorCss(hasHero: boolean): string {
  const heroBg = hasHero
    ? `background-image: var(--hero-url); background-size: cover; background-position: center;`
    : `background: radial-gradient(ellipse 800px 400px at 60% 20%, rgba(242,206,122,0.35), transparent 60%), linear-gradient(180deg, #d8c4a0 0%, #c8a878 30%, #88603a 60%, #4a3a2a 85%);`;
  return `
    .cover-editor .cover-hero { position: absolute; inset: 0 0 auto 0; height: 620px; overflow: hidden; ${heroBg} }
    .cover-editor .hero-scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(6,26,58,0.2) 0%, rgba(6,26,58,0.72) 100%); z-index: 1; }
    .cover-editor .cover-hero::after { content: ""; position: absolute; bottom: 0; left: 0; right: 0; height: 55%; background: linear-gradient(180deg, transparent 0%, rgba(6,26,58,0.4) 100%), linear-gradient(180deg, #2a3a4a 0%, #0a1a2a 100%); clip-path: polygon(0 100%, 0 55%, 12% 55%, 12% 35%, 22% 30%, 30% 15%, 42% 10%, 55% 22%, 62% 18%, 75% 28%, 82% 28%, 82% 45%, 100% 50%, 100% 100%); ${hasHero ? "display: none;" : ""} }
    .cover-editor .cover-overlay { position: absolute; left: 48px; right: 48px; bottom: 450px; color: #fff; z-index: 3; }
    .cover-editor .eyebrow { font-family: var(--t-font-mono); font-size: 11px; letter-spacing: 0.3em; color: var(--t-accent-light); margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
    .cover-editor .eyebrow::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, var(--t-accent-light), transparent); margin-left: 10px; }
    .cover-editor h1 { font-family: var(--t-font-display); font-weight: 700; font-size: 54px; line-height: 0.98; letter-spacing: -0.02em; margin: 0 0 12px; color: #fff; max-width: 11ch; text-shadow: 0 2px 20px rgba(0,0,0,0.3); }
    .cover-editor h2 { font-family: var(--t-font-display); font-weight: 400; font-style: italic; font-size: 22px; margin: 0 0 22px; color: var(--t-accent-light); }
    .cover-editor .pill { display: inline-flex; gap: 10px; align-items: center; padding: 7px 14px; background: rgba(232,184,74,0.95); color: var(--t-heading); font-family: var(--t-font-mono); font-size: 10px; letter-spacing: 0.2em; border-radius: 999px; font-weight: 600; }
    .cover-editor .pill .dot { width: 6px; height: 6px; background: var(--t-up); border-radius: 50%; }
    .cover-editor .agent-card { position: absolute; left: 48px; right: 48px; bottom: 72px; background: #fff; border-top: 3px solid var(--t-accent-light); padding: 28px 32px; box-shadow: 0 20px 40px -20px rgba(6,26,58,0.3); display: grid; grid-template-columns: 90px 1fr 1fr; gap: 28px; align-items: flex-start; color: var(--t-text); }
    .cover-editor .big-photo { width: 90px; height: 90px; border-radius: 50%; background: var(--t-avatar-bg); display: flex; align-items: center; justify-content: center; color: #fff; font-family: var(--t-font-display); font-size: 34px; font-weight: 600; border: 3px solid var(--t-accent-bg); box-shadow: 0 4px 16px -4px rgba(0,0,0,0.3); overflow: hidden; background-size: cover; background-position: center; }
    .cover-editor .big-photo.has-photo { background-image: var(--headshot-url); color: transparent; }
    .cover-editor .agent-name { font-family: var(--t-font-display); font-size: 24px; font-weight: 700; color: var(--t-heading); line-height: 1.05; margin-bottom: 3px; }
    .cover-editor .agent-title { font-size: 11px; color: var(--t-text-mute); margin-bottom: 10px; }
    .cover-editor .agent-lic { font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.1em; color: var(--t-accent); padding: 3px 8px; background: var(--t-accent-bg); border-radius: 3px; display: inline-block; margin-bottom: 10px; }
    .cover-editor .agent-contact { font-size: 10px; line-height: 1.6; color: var(--t-text-soft); }
    .cover-editor .agent-contact strong { color: var(--t-heading); font-weight: 600; }
    .cover-editor .brokerage { border-left: 1px solid var(--t-card-border); padding-left: 24px; font-size: 10px; line-height: 1.5; color: var(--t-text-soft); }
    .cover-editor .brokerage .brok-name { font-family: var(--t-font-display); font-weight: 600; font-size: 13px; color: var(--t-heading); margin-bottom: 6px; line-height: 1.2; }
    .cover-editor .prepared { grid-column: 1 / -1; border-top: 1px solid var(--t-accent-bg); margin-top: 6px; padding-top: 14px; display: flex; justify-content: space-between; font-size: 10px; color: var(--t-text-mute); }
    .cover-editor .prepared strong { color: var(--t-heading); font-weight: 600; }
  `;
}

// T2 — Archive (black/white Swiss).
function coverArchiveCss(hasHero: boolean): string {
  const heroBg = hasHero
    ? `background-image: var(--hero-url); background-size: cover; background-position: center;`
    : `background: linear-gradient(135deg, #a8b5b0 0%, #5a6a65 40%, #2a3530 100%);`;
  return `
    .cover-archive { background: #fff; }
    .cover-archive .top-rule { position: absolute; top: 36px; left: 36px; right: 36px; display: flex; justify-content: space-between; align-items: center; font-family: var(--t-font-mono); font-size: 10px; letter-spacing: 0.3em; color: #000; padding-bottom: 12px; border-bottom: 1px solid #000; }
    .cover-archive .cover-hero { position: absolute; top: 78px; left: 48px; right: 48px; height: 520px; overflow: hidden; ${heroBg} }
    .cover-archive .cover-hero::after { content: ""; position: absolute; bottom: 0; left: 0; right: 0; height: 45%; background: #1a1a1a; clip-path: polygon(0 100%, 0 60%, 20% 60%, 20% 40%, 35% 35%, 45% 20%, 55% 25%, 70% 15%, 85% 30%, 100% 45%, 100% 100%); ${hasHero ? "display: none;" : ""} }
    .cover-archive .big { position: absolute; left: 48px; right: 48px; top: 640px; }
    .cover-archive .big .num { font-family: var(--t-font-sans); font-weight: 700; font-size: 120px; line-height: 0.9; letter-spacing: -0.05em; color: #000; }
    .cover-archive .big .addr { font-family: var(--t-font-sans); font-weight: 500; font-size: 32px; margin-top: 4px; letter-spacing: -0.02em; color: #000; }
    .cover-archive .big .city { font-family: var(--t-font-sans); font-weight: 400; font-size: 20px; color: #666; margin-top: 3px; }
    .cover-archive .agent-card { position: absolute; left: 48px; right: 48px; bottom: 78px; padding-top: 14px; border-top: 1px solid #000; display: grid; grid-template-columns: 1fr auto; gap: 16px; }
    .cover-archive .left { display: flex; gap: 14px; align-items: flex-start; }
    .cover-archive .big-photo { width: 56px; height: 56px; background: var(--t-avatar-bg); display: flex; align-items: center; justify-content: center; color: #fff; font-family: var(--t-font-sans); font-weight: 700; font-size: 22px; border-radius: 0; overflow: hidden; background-size: cover; background-position: center; }
    .cover-archive .big-photo.has-photo { background-image: var(--headshot-url); color: transparent; }
    .cover-archive .agent-name { font-family: var(--t-font-sans); font-weight: 700; font-size: 17px; letter-spacing: -0.01em; color: #000; }
    .cover-archive .agent-title { font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.12em; color: #666; text-transform: uppercase; margin-top: 4px; }
    .cover-archive .agent-lic { font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.08em; color: #000; margin-top: 8px; }
    .cover-archive .right { text-align: right; font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.08em; color: #000; line-height: 1.7; }
    .cover-archive .prepared { grid-column: 1 / -1; padding-top: 10px; margin-top: 6px; border-top: 1px solid #eee; font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.1em; color: #666; display: flex; justify-content: space-between; text-transform: uppercase; }
  `;
}

// T3 — Noir (dark luxury).
function coverNoirCss(hasHero: boolean): string {
  const heroBg = hasHero
    ? `background-image: var(--hero-url); background-size: cover; background-position: center;`
    : `background: linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.95) 100%), linear-gradient(135deg, #6a5a48 0%, #3a2e22 50%, #0a0602 100%);`;
  return `
    .cover-noir { background: #0c0c0c; color: #EDE4D0; }
    .cover-noir .cover-hero { position: absolute; inset: 0; overflow: hidden; ${heroBg} }
    .cover-noir .hero-scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.9) 100%); }
    .cover-noir .mark { position: absolute; top: 52px; left: 0; right: 0; text-align: center; font-family: var(--t-font-display); font-weight: 400; font-size: 22px; letter-spacing: 0.4em; color: var(--t-accent); z-index: 3; }
    .cover-noir .mark::before { content: "— "; color: #6a5b3a; }
    .cover-noir .mark::after { content: " —"; color: #6a5b3a; }
    .cover-noir .eyebrow { position: absolute; top: 140px; left: 0; right: 0; text-align: center; font-family: var(--t-font-mono); font-size: 10px; letter-spacing: 0.5em; color: rgba(237,228,208,0.5); z-index: 3; }
    .cover-noir .center { position: absolute; left: 48px; right: 48px; top: 320px; text-align: center; z-index: 3; }
    .cover-noir .center h1 { font-family: var(--t-font-display); font-weight: 300; font-size: 78px; line-height: 1; letter-spacing: -0.01em; color: #EDE4D0; margin: 0 0 10px; }
    .cover-noir .center .rule { width: 60px; height: 1px; background: var(--t-accent); margin: 22px auto; }
    .cover-noir .center h2 { font-family: var(--t-font-display); font-weight: 300; font-style: italic; font-size: 26px; color: var(--t-accent); margin: 0; }
    .cover-noir .agent-card { position: absolute; left: 48px; right: 48px; bottom: 72px; text-align: center; z-index: 3; background: transparent; }
    .cover-noir .prepared { font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.3em; color: #6a5b3a; margin-bottom: 14px; text-transform: uppercase; }
    .cover-noir .agent-name { font-family: var(--t-font-display); font-weight: 500; font-size: 28px; color: #EDE4D0; letter-spacing: 0.02em; }
    .cover-noir .agent-title { font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.2em; color: #8a7f68; text-transform: uppercase; margin-top: 8px; }
    .cover-noir .brok-name { font-family: var(--t-font-display); font-weight: 400; font-style: italic; font-size: 16px; color: var(--t-accent); margin-top: 14px; }
    .cover-noir .agent-contact { font-family: var(--t-font-sans); font-size: 10px; color: #8a7f68; margin-top: 10px; letter-spacing: 0.05em; }
    .cover-noir .big-photo { display: none; }
  `;
}

// T4 — Terracotta (warm clay).
function coverTerracottaCss(hasHero: boolean): string {
  const heroBg = hasHero
    ? `background-image: var(--hero-url); background-size: cover; background-position: center;`
    : `background: linear-gradient(135deg, #C65A35 0%, #8a3a1e 70%, #4a1e0c 100%);`;
  return `
    .cover-terracotta { background: #FAF3E7; }
    .cover-terracotta .cover-hero { position: absolute; top: 0; left: 0; right: 0; height: 600px; overflow: hidden; ${heroBg} }
    .cover-terracotta .cover-hero::before { content: ""; position: absolute; inset: 0; background: radial-gradient(ellipse 450px 300px at 75% 30%, rgba(245,200,120,0.25), transparent 60%), radial-gradient(ellipse 300px 180px at 20% 80%, rgba(74,30,12,0.5), transparent 70%); ${hasHero ? "display: none;" : ""} }
    .cover-terracotta .cover-hero::after { content: ""; position: absolute; bottom: 0; left: 0; right: 0; height: 50%; background: #2A1D10; clip-path: polygon(0 100%, 0 70%, 15% 70%, 15% 50%, 30% 44%, 45% 32%, 58% 40%, 72% 28%, 85% 36%, 100% 48%, 100% 100%); ${hasHero ? "display: none;" : ""} }
    .cover-terracotta .corner { position: absolute; top: 48px; left: 48px; right: 48px; display: flex; justify-content: space-between; z-index: 3; }
    .cover-terracotta .corner .lg { background: #FAF3E7; color: var(--t-accent); padding: 8px 20px; border-radius: 999px; font-family: var(--t-font-display); font-weight: 700; font-size: 16px; letter-spacing: -0.01em; }
    .cover-terracotta .corner .mls { font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.15em; color: rgba(255,255,255,0.85); background: rgba(0,0,0,0.2); padding: 7px 14px; border-radius: 999px; }
    .cover-terracotta .overlay { position: absolute; left: 48px; right: 48px; top: 280px; z-index: 3; }
    .cover-terracotta .overlay .eb { font-family: var(--t-font-mono); font-size: 11px; letter-spacing: 0.3em; color: var(--t-accent-light); margin-bottom: 14px; }
    .cover-terracotta .overlay h1 { font-family: var(--t-font-display); font-weight: 600; font-size: 66px; line-height: 0.95; letter-spacing: -0.02em; color: #FAF3E7; margin: 0; }
    .cover-terracotta .overlay h2 { font-family: var(--t-font-display); font-weight: 400; font-style: italic; font-size: 26px; color: var(--t-accent-light); margin: 8px 0 0; }
    .cover-terracotta .agent-card { position: absolute; left: 48px; right: 48px; bottom: 80px; background: #FAF3E7; border-radius: 20px; padding: 26px 28px; box-shadow: 0 24px 56px -28px rgba(74,30,12,0.45); border-top: 4px solid var(--t-accent-light); display: grid; grid-template-columns: 72px 1fr 1fr; gap: 18px; align-items: flex-start; }
    .cover-terracotta .big-photo { width: 72px; height: 72px; border-radius: 50%; background: var(--t-avatar-bg); display: flex; align-items: center; justify-content: center; color: #FAF3E7; font-family: var(--t-font-display); font-weight: 700; font-size: 30px; overflow: hidden; background-size: cover; background-position: center; }
    .cover-terracotta .big-photo.has-photo { background-image: var(--headshot-url); color: transparent; }
    .cover-terracotta .agent-name { font-family: var(--t-font-display); font-weight: 700; font-size: 22px; color: var(--t-heading); letter-spacing: -0.01em; }
    .cover-terracotta .agent-title { font-size: 10px; color: var(--t-text-mute); margin-top: 2px; }
    .cover-terracotta .agent-lic { display: inline-block; margin: 8px 0; padding: 3px 12px; background: var(--t-accent-bg); color: var(--t-accent); border-radius: 999px; font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.08em; font-weight: 600; }
    .cover-terracotta .agent-contact { font-size: 10px; color: var(--t-heading); line-height: 1.6; }
    .cover-terracotta .brokerage { font-size: 10px; color: var(--t-heading); line-height: 1.5; border-left: 2px solid var(--t-accent-bg); padding-left: 14px; }
    .cover-terracotta .brokerage .brok-name { font-family: var(--t-font-display); font-weight: 700; font-size: 15px; color: var(--t-accent); margin-bottom: 4px; }
    .cover-terracotta .prepared { grid-column: 1 / -1; padding-top: 12px; border-top: 1px solid var(--t-accent-bg); display: flex; justify-content: space-between; font-size: 10px; color: var(--t-text-mute); }
    .cover-terracotta .prepared strong { color: var(--t-heading); font-weight: 700; }
  `;
}

// T5 — Blueprint (corporate blue + data grid).
function coverBlueprintCss(hasHero: boolean): string {
  const heroBg = hasHero
    ? `background-image: var(--hero-url); background-size: cover; background-position: center;`
    : `background: linear-gradient(180deg, transparent 40%, rgba(15,23,42,0.6) 100%), linear-gradient(135deg, #3B82F6 0%, #1E40AF 50%, #0F172A 100%);`;
  return `
    .cover-blueprint { background: #fff; }
    .cover-blueprint .bar { position: absolute; top: 0; left: 0; right: 0; height: 56px; background: var(--t-accent); color: #fff; display: flex; justify-content: space-between; align-items: center; padding: 0 40px; font-family: var(--t-font-mono); font-size: 12px; letter-spacing: 0.15em; z-index: 4; }
    .cover-blueprint .cover-hero { position: absolute; top: 56px; left: 0; right: 0; height: 450px; overflow: hidden; ${heroBg} }
    .cover-blueprint .cover-hero::before { content: ""; position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 40px 40px; }
    .cover-blueprint .cover-hero::after { content: ""; position: absolute; bottom: 0; left: 0; right: 0; height: 45%; background: #0F172A; clip-path: polygon(0 100%, 0 55%, 18% 55%, 18% 35%, 30% 28%, 45% 15%, 58% 22%, 72% 10%, 85% 25%, 100% 38%, 100% 100%); ${hasHero ? "display: none;" : ""} }
    .cover-blueprint .brand { position: absolute; top: 80px; left: 40px; right: 40px; display: flex; justify-content: space-between; align-items: center; color: #fff; z-index: 3; }
    .cover-blueprint .brand .logo { font-family: var(--t-font-sans); font-weight: 700; font-size: 20px; letter-spacing: -0.01em; }
    .cover-blueprint .brand .logo::before { content: ""; display: inline-block; width: 14px; height: 14px; background: var(--t-accent-light); margin-right: 10px; vertical-align: -2px; }
    .cover-blueprint .brand .report { font-family: var(--t-font-mono); font-size: 10px; letter-spacing: 0.2em; background: rgba(255,255,255,0.15); padding: 6px 14px; }
    .cover-blueprint .big { position: absolute; left: 40px; right: 40px; top: 540px; }
    .cover-blueprint .big .meta { font-family: var(--t-font-mono); font-size: 12px; letter-spacing: 0.15em; color: var(--t-text-mute); text-transform: uppercase; margin-bottom: 12px; }
    .cover-blueprint .big .h1 { font-family: var(--t-font-sans); font-weight: 600; font-size: 44px; line-height: 1.1; letter-spacing: -0.02em; color: var(--t-heading); margin: 0 0 4px; }
    .cover-blueprint .big .h2 { font-family: var(--t-font-sans); font-weight: 400; font-size: 20px; color: var(--t-text-soft); margin: 0; }
    .cover-blueprint .big .pill { display: inline-flex; gap: 10px; align-items: center; background: #DCFCE7; color: #166534; padding: 6px 16px; font-family: var(--t-font-mono); font-size: 10px; letter-spacing: 0.15em; font-weight: 600; margin-top: 14px; }
    .cover-blueprint .big .pill .dot { width: 8px; height: 8px; background: #16A34A; border-radius: 50%; }
    .cover-blueprint .agent-card { position: absolute; left: 40px; right: 40px; bottom: 78px; border: 1px solid var(--t-card-border); border-top: 4px solid var(--t-accent); padding: 20px 22px; display: grid; grid-template-columns: 66px 1fr 1fr; gap: 18px; align-items: flex-start; background: #fff; }
    .cover-blueprint .big-photo { width: 66px; height: 66px; background: var(--t-avatar-bg); display: flex; align-items: center; justify-content: center; color: #fff; font-family: var(--t-font-sans); font-weight: 700; font-size: 26px; border-radius: 0; overflow: hidden; background-size: cover; background-position: center; }
    .cover-blueprint .big-photo.has-photo { background-image: var(--headshot-url); color: transparent; }
    .cover-blueprint .agent-name { font-family: var(--t-font-sans); font-weight: 600; font-size: 17px; color: var(--t-heading); letter-spacing: -0.01em; }
    .cover-blueprint .agent-title { font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.12em; color: var(--t-text-mute); text-transform: uppercase; margin-top: 3px; }
    .cover-blueprint .agent-lic { font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.08em; color: var(--t-accent); margin-top: 8px; background: var(--t-accent-bg); padding: 2px 8px; display: inline-block; }
    .cover-blueprint .agent-contact { font-family: var(--t-font-mono); font-size: 10px; color: var(--t-text); line-height: 1.6; margin-top: 8px; }
    .cover-blueprint .brokerage { border-left: 1px solid var(--t-card-border); padding-left: 16px; font-family: var(--t-font-mono); font-size: 10px; color: var(--t-text); line-height: 1.6; }
    .cover-blueprint .brokerage .brok-name { font-family: var(--t-font-sans); font-weight: 600; font-size: 14px; color: var(--t-accent); margin-bottom: 4px; letter-spacing: -0.01em; }
    .cover-blueprint .prepared { grid-column: 1 / -1; padding-top: 12px; border-top: 1px solid var(--t-card-border); display: flex; justify-content: space-between; font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.08em; color: var(--t-text-mute); text-transform: uppercase; }
    .cover-blueprint .prepared strong { color: var(--t-heading); font-weight: 600; }
  `;
}
