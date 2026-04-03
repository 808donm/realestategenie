/**
 * Address Utilities
 *
 * Shared address normalization functions used across the app
 * for consistent address matching against MLS and property data.
 */

/** Common street suffix abbreviations to full names */
const SUFFIX_MAP: Record<string, string> = {
  st: "street",
  rd: "road",
  ave: "avenue",
  dr: "drive",
  ln: "lane",
  pl: "place",
  blvd: "boulevard",
  ct: "court",
  pkwy: "parkway",
  hwy: "highway",
  cir: "circle",
  ter: "terrace",
  trl: "trail",
  sq: "square",
  wy: "way",
};

/** Reverse map: full names to abbreviations */
const REVERSE_SUFFIX_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SUFFIX_MAP).map(([abbr, full]) => [full, abbr]),
);

/**
 * Expand street suffix abbreviations to full names.
 * "123 Main St" -> "123 Main Street"
 * "456 Kailua Ave" -> "456 Kailua Avenue"
 */
export function expandStreetSuffix(address: string): string {
  let expanded = address;
  for (const [abbr, full] of Object.entries(SUFFIX_MAP)) {
    const re = new RegExp(`\\b${abbr}\\b\\.?`, "gi");
    expanded = expanded.replace(re, full);
  }
  return expanded;
}

/**
 * Abbreviate street suffix full names to abbreviations.
 * "123 Main Street" -> "123 Main St"
 * "3849 Manoa Road" -> "3849 Manoa Rd"
 */
export function abbreviateStreetSuffix(address: string): string {
  let abbreviated = address;
  for (const [full, abbr] of Object.entries(REVERSE_SUFFIX_MAP)) {
    // Match full word at word boundary, case-insensitive
    const re = new RegExp(`\\b${full}\\b`, "gi");
    // Capitalize first letter of abbreviation to match typical MLS format
    abbreviated = abbreviated.replace(re, abbr.charAt(0).toUpperCase() + abbr.slice(1));
  }
  return abbreviated;
}

/**
 * Normalize an address for searching: expand suffixes, ensure comma
 * between street and city, trim whitespace.
 */
export function normalizeSearchAddress(address: string): string {
  let normalized = expandStreetSuffix(address.trim());

  // Ensure comma between street and city for addresses like
  // "123 Main Street Kailua, HI 96734" -> "123 Main Street, Kailua, HI 96734"
  const suffixMatch = normalized.match(
    /^(.+?\b(?:street|road|avenue|drive|lane|place|boulevard|court|way|loop|parkway|highway|circle|terrace|trail|square)\b\.?)\s+([A-Z][a-z].*,\s*[A-Z]{2}\s*\d{5})/i,
  );
  if (suffixMatch) {
    normalized = `${suffixMatch[1]}, ${suffixMatch[2]}`;
  }

  return normalized;
}
