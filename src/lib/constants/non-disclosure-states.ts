/**
 * US states where real property sale prices are not publicly disclosed.
 * In these states, official comps data is unreliable — Comp Genie provides
 * AI-powered comparable analysis from AVM and property characteristics instead.
 */
export const NON_DISCLOSURE_STATES = new Set([
  "AK",
  "HI",
  "ID",
  "IN",
  "KS",
  "LA",
  "ME",
  "MS",
  "MO",
  "MT",
  "NM",
  "ND",
  "SD",
  "TX",
  "UT",
  "WY",
]);

export function isNonDisclosureState(stateAbbrev: string): boolean {
  return NON_DISCLOSURE_STATES.has(stateAbbrev.toUpperCase());
}
