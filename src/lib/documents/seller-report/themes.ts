/**
 * Seller Report v2 — theme system.
 *
 * Five visual directions. Same 13-page structure. Agent picks per-report
 * (or per-agent default) via `data.theme`. Each theme defines color tokens,
 * font stacks, page-number format, and a cover-layout identifier.
 *
 * Inner pages (2-13 apart from cover) inherit theme by reading the CSS
 * custom properties on :root. The cover branches on `cover` layout id.
 */

export type ThemeId = "editor" | "archive" | "noir" | "terracotta" | "blueprint";

export type PageNumberFormat = "arabic" | "roman" | "corporate" | "minimal";

export type ThemeTokens = {
  id: ThemeId;
  name: string;
  tag: string;

  // Font stacks (must match the families we preload)
  fontDisplay: string;
  fontSans: string;
  fontMono: string;

  // Paper
  pageBg: string;
  pageBorder: string;
  bandBorder: string;

  // Ink
  text: string;
  textSoft: string;
  textMute: string;
  heading: string;

  // Brand accents
  accent: string;
  accentLight: string;
  accentBg: string;

  // Cards / surfaces
  cardBg: string;
  cardBorder: string;
  rowBand: string;

  // Feedback
  up: string;
  down: string;

  // Footer
  pageNumber: PageNumberFormat;
  footerCopy: string;   // center-copy style: "Report produced by Real Estate Genie · © Hulia'u Software, Inc." etc.
  footerMonoFooter?: boolean; // if true, footer uses mono font throughout

  // Agent band / avatar
  avatarShape: "circle" | "square";
  avatarBg: string;
  bandBg?: string;      // agent band background (defaults to transparent/pageBg)

  // Cover layout id (branches cover page)
  cover: ThemeId;
};

const GOLD = "#C6932E";
const GOLD_LIGHT = "#E8B84A";
const BONE_50 = "#FBF8F1";
const BONE_100 = "#F8F4EC";
const BONE_200 = "#EEE7D6";
const BONE_300 = "#E1D6BC";
const NAVY_900 = "#061A3A";
const INK = "#0F1A2E";
const INK_SOFT = "#2A3650";
const INK_MUTE = "#5B6680";
const GREEN = "#2F7D5B";
const RED = "#C8372D";

export const THEMES: Record<ThemeId, ThemeTokens> = {
  // ─────────────────────────────────────────────────────────────
  // The Editor — classic navy + gold + bone (current default)
  // ─────────────────────────────────────────────────────────────
  editor: {
    id: "editor",
    name: "The Editor",
    tag: "Classic · Navy",
    fontDisplay: `"Playfair Display", Georgia, serif`,
    fontSans: `"Inter", -apple-system, sans-serif`,
    fontMono: `"JetBrains Mono", ui-monospace, monospace`,
    pageBg: BONE_50,
    pageBorder: BONE_300,
    bandBorder: BONE_300,
    text: INK,
    textSoft: INK_SOFT,
    textMute: INK_MUTE,
    heading: NAVY_900,
    accent: GOLD,
    accentLight: GOLD_LIGHT,
    accentBg: BONE_100,
    cardBg: "#ffffff",
    cardBorder: BONE_300,
    rowBand: BONE_100,
    up: GREEN,
    down: RED,
    pageNumber: "arabic",
    footerCopy: "editor",
    avatarShape: "circle",
    avatarBg: "linear-gradient(135deg, #D9B88E 0%, #A27548 100%)",
    cover: "editor",
  },

  // ─────────────────────────────────────────────────────────────
  // The Archive — modern minimal, Swiss grid, mono data
  // ─────────────────────────────────────────────────────────────
  archive: {
    id: "archive",
    name: "The Archive",
    tag: "Modern · Minimal",
    fontDisplay: `"Inter", -apple-system, sans-serif`,
    fontSans: `"Inter", -apple-system, sans-serif`,
    fontMono: `"JetBrains Mono", ui-monospace, monospace`,
    pageBg: "#ffffff",
    pageBorder: "#000000",
    bandBorder: "#000000",
    text: "#000000",
    textSoft: "#333333",
    textMute: "#666666",
    heading: "#000000",
    accent: "#000000",
    accentLight: "#333333",
    accentBg: "#f5f5f5",
    cardBg: "#ffffff",
    cardBorder: "#000000",
    rowBand: "#fafafa",
    up: GREEN,
    down: RED,
    pageNumber: "minimal",
    footerCopy: "archive",
    footerMonoFooter: true,
    avatarShape: "square",
    avatarBg: "#000000",
    cover: "archive",
  },

  // ─────────────────────────────────────────────────────────────
  // Noir — luxury dark with champagne accents
  // ─────────────────────────────────────────────────────────────
  noir: {
    id: "noir",
    name: "Noir",
    tag: "Luxury · Dark",
    fontDisplay: `"Cormorant Garamond", Georgia, serif`,
    fontSans: `"DM Sans", -apple-system, sans-serif`,
    fontMono: `"JetBrains Mono", ui-monospace, monospace`,
    pageBg: "#0c0c0c",
    pageBorder: "#2a2420",
    bandBorder: "#2a2420",
    text: "#EDE4D0",
    textSoft: "#c4b896",
    textMute: "#8a7f68",
    heading: "#EDE4D0",
    accent: "#C9A968",
    accentLight: "#D8BC80",
    accentBg: "#1a1510",
    cardBg: "#151210",
    cardBorder: "#2a2420",
    rowBand: "#111010",
    up: "#A4D4BC",
    down: "#E57A72",
    pageNumber: "roman",
    footerCopy: "noir",
    avatarShape: "circle",
    avatarBg: "linear-gradient(135deg, #C9A968 0%, #6a5b3a 100%)",
    cover: "noir",
  },

  // ─────────────────────────────────────────────────────────────
  // Terracotta — warm clay + cream, rounded serif, human warmth
  // ─────────────────────────────────────────────────────────────
  terracotta: {
    id: "terracotta",
    name: "Terracotta",
    tag: "Warm · Bold",
    fontDisplay: `"Fraunces", Georgia, serif`,
    fontSans: `"Inter", -apple-system, sans-serif`,
    fontMono: `"JetBrains Mono", ui-monospace, monospace`,
    pageBg: "#FAF3E7",
    pageBorder: "#E7D5B8",
    bandBorder: "#E7D5B8",
    text: "#2A1D10",
    textSoft: "#5a4530",
    textMute: "#8a6b4a",
    heading: "#2A1D10",
    accent: "#B04B2E",
    accentLight: "#F5C878",
    accentBg: "#F4E6D2",
    cardBg: "#FFFBF2",
    cardBorder: "#E7D5B8",
    rowBand: "#F4E6D2",
    up: "#3B7F4F",
    down: "#B04B2E",
    pageNumber: "arabic",
    footerCopy: "terracotta",
    avatarShape: "circle",
    avatarBg: "linear-gradient(135deg, #F5C878 0%, #B04B2E 100%)",
    cover: "terracotta",
  },

  // ─────────────────────────────────────────────────────────────
  // Blueprint — corporate data, IBM Plex, blue + grid
  // ─────────────────────────────────────────────────────────────
  blueprint: {
    id: "blueprint",
    name: "Blueprint",
    tag: "Corporate · Data",
    fontDisplay: `"IBM Plex Sans", -apple-system, sans-serif`,
    fontSans: `"IBM Plex Sans", -apple-system, sans-serif`,
    fontMono: `"IBM Plex Mono", ui-monospace, monospace`,
    pageBg: "#ffffff",
    pageBorder: "#E2E8F0",
    bandBorder: "#E2E8F0",
    text: "#0F172A",
    textSoft: "#334155",
    textMute: "#64748B",
    heading: "#0F172A",
    accent: "#1E40AF",
    accentLight: "#60A5FA",
    accentBg: "#EFF6FF",
    cardBg: "#ffffff",
    cardBorder: "#E2E8F0",
    rowBand: "#F8FAFC",
    up: "#166534",
    down: "#B91C1C",
    pageNumber: "corporate",
    footerCopy: "blueprint",
    footerMonoFooter: true,
    avatarShape: "square",
    avatarBg: "#1E40AF",
    cover: "blueprint",
  },
};

export function resolveTheme(id?: string | null): ThemeTokens {
  if (id && id in THEMES) return THEMES[id as ThemeId];
  return THEMES.editor;
}

/** Font-family subset needed by each theme. All families preload via the same Google Fonts URL. */
export function googleFontsLink(): string {
  return `https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&family=Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap`;
}

/** Format a page number according to theme. */
export function formatPageNumber(n: number, total: number, fmt: PageNumberFormat): string {
  switch (fmt) {
    case "roman":
      return `${toRoman(n)} / ${toRoman(total)}`;
    case "corporate":
      return `P. ${String(n).padStart(2, "0")}/${String(total).padStart(2, "0")}`;
    case "minimal":
      return `${String(n).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
    case "arabic":
    default:
      return `Page ${String(n).padStart(2, "0")} of ${String(total).padStart(2, "0")}`;
  }
}

/** Footer center-copy variant per theme. */
export function footerCenterCopy(themeId: ThemeId, generatedDate: string): string {
  switch (themeId) {
    case "archive":
      return `REAL ESTATE GENIE / © HULIAU SOFTWARE, INC. ${new Date(generatedDate).getFullYear() || new Date().getFullYear()}`;
    case "noir":
      return `Real Estate Genie · © Hulia'u Software, Inc. ${new Date(generatedDate).getFullYear() || new Date().getFullYear()}`;
    case "terracotta":
      return `Report by Real Estate Genie · © Hulia'u Software, Inc.`;
    case "blueprint":
      return `REAL-ESTATE-GENIE / © HULIAU-SOFTWARE-INC-${new Date(generatedDate).getFullYear() || new Date().getFullYear()}`;
    case "editor":
    default:
      return `Report produced by Real Estate Genie · © Hulia'u Software, Inc.`;
  }
}

function toRoman(n: number): string {
  if (n <= 0 || n > 3999) return String(n);
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let r = "";
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) {
      r += syms[i];
      n -= vals[i];
    }
  }
  return r;
}
