/**
 * Search for VA-assumable listings — flagship feature.
 *
 * In high-rate environments, VA loans originated 2020-2022 at sub-3% rates can
 * be inherited by a new buyer (especially a VA-eligible buyer, who preserves
 * the seller's entitlement). The buyer takes over the existing low-rate
 * mortgage instead of originating fresh at market rates. Real savings.
 *
 * RESO doesn't have a single "VA-assumable" boolean. We combine three signals
 * across `AssumableYN`, `ListingTerms`, and `PublicRemarks` text mining and
 * return results in three tiers so the agent can see search confidence.
 */

import type { MLSClient, MlsProperty } from "./types";

export type AssumableMatchTier = "explicit" | "remarks" | "unspecified";

export type AssumableListing = MlsProperty & {
  /** Which tier this listing matched. */
  matchTier: AssumableMatchTier;
  /** Rate parsed out of PublicRemarks if present (e.g., "2.875"). Best-effort. */
  extractedRate?: string;
  /** Snippet from PublicRemarks containing the assumable mention, for display. */
  remarksSnippet?: string;
};

export type SearchAssumableVaOptions = {
  /** Geographic narrowing (at least one is recommended for performance). */
  city?: string;
  postalCode?: string;
  /** Price filters. */
  minPrice?: number;
  maxPrice?: number;
  /** Property attributes. */
  minBeds?: number;
  /** Maximum results per tier. RESO max is 250. */
  limit?: number;
};

export type SearchAssumableVaResult = {
  tier1Explicit: AssumableListing[];
  tier2Remarks: AssumableListing[];
  tier3Unspecified: AssumableListing[];
  summary: {
    total: number;
    explicitCount: number;
    remarksCount: number;
    unspecifiedCount: number;
  };
};

const TIER_LIMIT_DEFAULT = 50;

/**
 * Three-tier VA assumable listing search.
 * Works on both Trestle and RMLS via the MLSClient interface.
 */
export async function searchAssumableVa(
  client: MLSClient,
  options: SearchAssumableVaOptions = {},
): Promise<SearchAssumableVaResult> {
  const limit = Math.min(options.limit ?? TIER_LIMIT_DEFAULT, 250);

  // Build the geographic + price WHERE clause shared across all tiers.
  const sharedFilters = buildSharedFilters(client, options);

  // Build the StandardStatus = Active clause (provider-specific enum syntax).
  const activeFilter = client.provider === "rmls"
    ? `StandardStatus eq Odata.Models.StandardStatus'Active'`
    : `StandardStatus eq 'Active'`;

  const baseFilter = [activeFilter, ...sharedFilters].join(" and ");

  // ─── Tier 1 — explicit MLS tags ─────────────────────────────────────
  const tier1Filter = `${baseFilter} and (AssumableYN eq true or contains(ListingTerms, 'Assumable')) and contains(ListingTerms, 'VA')`;

  // ─── Tier 2 — text mining PublicRemarks ─────────────────────────────
  // Match common phrasings agents use when the loan is VA-assumable.
  const remarksClauses = [
    "contains(tolower(PublicRemarks), 'assumable va')",
    "contains(tolower(PublicRemarks), 'va assumable')",
    "contains(tolower(PublicRemarks), 'va loan assum')",
    "contains(tolower(PublicRemarks), 'assume va')",
    "contains(tolower(PublicRemarks), 'assume our va')",
    "contains(tolower(PublicRemarks), 'assumable mortgage')",
  ].join(" or ");
  const tier2Filter = `${baseFilter} and (${remarksClauses})`;

  // ─── Tier 3 — assumable but loan type unspecified ────────────────────
  const tier3Filter = `${baseFilter} and AssumableYN eq true`;

  // Run the three queries in parallel.
  const [tier1Res, tier2Res, tier3Res] = await Promise.allSettled([
    client.getProperties({
      $filter: tier1Filter,
      $orderby: "ListPrice asc",
      $top: limit,
      $select: ASSUMABLE_SELECT,
    }),
    client.getProperties({
      $filter: tier2Filter,
      $orderby: "ListPrice asc",
      $top: limit,
      $select: ASSUMABLE_SELECT,
    }),
    client.getProperties({
      $filter: tier3Filter,
      $orderby: "ListPrice asc",
      $top: limit,
      $select: ASSUMABLE_SELECT,
    }),
  ]);

  const tier1Raw = tier1Res.status === "fulfilled" ? tier1Res.value.value : [];
  const tier2Raw = tier2Res.status === "fulfilled" ? tier2Res.value.value : [];
  const tier3Raw = tier3Res.status === "fulfilled" ? tier3Res.value.value : [];

  // Dedupe — a listing in tier 1 should not also appear in tier 2 or 3.
  // A listing in tier 2 should not appear in tier 3.
  const seen = new Set<string>();
  const dedupe = (rows: MlsProperty[], tier: AssumableMatchTier): AssumableListing[] => {
    const out: AssumableListing[] = [];
    for (const r of rows) {
      if (!r.ListingKey || seen.has(r.ListingKey)) continue;
      seen.add(r.ListingKey);
      const enrichment = enrichListing(r);
      out.push({ ...r, matchTier: tier, ...enrichment });
    }
    return out;
  };

  const tier1Explicit = dedupe(tier1Raw, "explicit");
  const tier2Remarks = dedupe(tier2Raw, "remarks");
  const tier3Unspecified = dedupe(tier3Raw, "unspecified");

  const total = tier1Explicit.length + tier2Remarks.length + tier3Unspecified.length;

  return {
    tier1Explicit,
    tier2Remarks,
    tier3Unspecified,
    summary: {
      total,
      explicitCount: tier1Explicit.length,
      remarksCount: tier2Remarks.length,
      unspecifiedCount: tier3Unspecified.length,
    },
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────

const ASSUMABLE_SELECT = [
  "ListingKey", "ListingId", "StandardStatus", "PropertyType", "PropertySubType",
  "ListPrice", "OriginalListPrice",
  "StreetNumber", "StreetName", "StreetSuffix", "City", "StateOrProvince", "PostalCode", "UnparsedAddress",
  "Latitude", "Longitude",
  "BedroomsTotal", "BathroomsTotalInteger", "LivingArea", "LotSizeArea", "YearBuilt",
  "PublicRemarks",
  "ListingTerms", "AssumableYN", "AssumableContractTerms",
  "ModificationTimestamp", "PhotosCount",
  "ListAgentFullName", "ListOfficeName",
  "ListingURL",
].join(",");

function buildSharedFilters(client: MLSClient, options: SearchAssumableVaOptions): string[] {
  const filters: string[] = [];
  const escapeStr = (s: string) => s.replace(/'/g, "''");

  if (options.city) {
    filters.push(`contains(tolower(City), '${escapeStr(options.city.toLowerCase())}')`);
  }
  if (options.postalCode) {
    filters.push(`startswith(PostalCode, '${escapeStr(options.postalCode)}')`);
  }
  if (options.minPrice !== undefined) {
    filters.push(`ListPrice ge ${options.minPrice}`);
  }
  if (options.maxPrice !== undefined) {
    filters.push(`ListPrice le ${options.maxPrice}`);
  }
  if (options.minBeds !== undefined) {
    filters.push(`BedroomsTotal ge ${options.minBeds}`);
  }

  // Restrict to residential — assumable loans are typically on residential property
  // and the OData enum prefix differs per provider.
  if (client.provider === "rmls") {
    filters.push(`PropertyType eq Odata.Models.PropertyType'Residential'`);
  } else {
    filters.push(`PropertyType eq 'Residential'`);
  }

  return filters;
}

/** Enrich a listing with a parsed rate and remarks snippet, when available. */
function enrichListing(p: MlsProperty): { extractedRate?: string; remarksSnippet?: string } {
  const remarks = p.PublicRemarks || "";
  if (!remarks) return {};
  return {
    extractedRate: extractAssumableRate(remarks) || undefined,
    remarksSnippet: extractRemarksSnippet(remarks) || undefined,
  };
}

/**
 * Best-effort rate extraction from public remarks. Looks for a percentage
 * value adjacent to "VA", "assumable", or "assume". Conservative — returns
 * null if no high-confidence match.
 */
export function extractAssumableRate(remarks: string): string | null {
  if (!remarks) return null;

  // Patterns to try, in order of confidence.
  // 1. Explicit "X.XX% VA" or "VA loan ... X.XX%"
  // 2. "Assume X.XX%" / "assumable at X.XX%"
  const patterns: RegExp[] = [
    /(\d{1}\.\d{1,3})\s*%\s*(?:va|assumable|assume)/i,
    /(?:va|assumable|assume)\s+(?:loan\s+|mortgage\s+|rate\s+)?(?:at\s+|of\s+)?(\d{1}\.\d{1,3})\s*%/i,
    /assume\s+(?:our\s+|a\s+)?(\d{1}\.\d{1,3})\s*%/i,
    /(\d{1}\.\d{1,3})\s*%\s*(?:rate|interest)/i,
  ];

  for (const re of patterns) {
    const m = remarks.match(re);
    if (m && m[1]) {
      const n = parseFloat(m[1]);
      // Reject anything outside plausible mortgage rate range.
      if (n >= 1.5 && n <= 9) return m[1];
    }
  }
  return null;
}

/**
 * Pull a ~120-char snippet from the remarks centered on the assumable mention.
 * Helps the UI show the agent's exact wording without dumping the full remarks.
 */
function extractRemarksSnippet(remarks: string): string | null {
  if (!remarks) return null;
  const lower = remarks.toLowerCase();
  const triggers = ["assumable va", "va assumable", "va loan assum", "assume va", "assume our va", "assumable mortgage"];
  for (const t of triggers) {
    const idx = lower.indexOf(t);
    if (idx === -1) continue;
    const start = Math.max(0, idx - 40);
    const end = Math.min(remarks.length, idx + t.length + 80);
    let snippet = remarks.substring(start, end).trim();
    if (start > 0) snippet = "…" + snippet;
    if (end < remarks.length) snippet = snippet + "…";
    return snippet;
  }
  return null;
}
