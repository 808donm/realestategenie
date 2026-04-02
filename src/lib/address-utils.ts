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
