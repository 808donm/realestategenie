/**
 * Lead-to-Listing Matching Engine
 *
 * Compares lead criteria (neighborhoods, timeline, financing, must_haves)
 * against active MLS listings and computes a match score (0-100).
 */
import type { TrestleProperty } from "@/lib/integrations/trestle-client";

export interface LeadCriteria {
  leadId: string;
  name: string;
  neighborhoods: string | null;
  mustHaves: string | null;
  timeline: string | null;
  financing: string | null;
  heatScore: number;
  pipelineStage: string;
}

export interface ListingMatch {
  leadId: string;
  leadName: string;
  listingKey: string;
  listingId: string;
  address: string;
  city: string;
  postalCode: string;
  listPrice: number;
  bedrooms: number | null;
  bathrooms: number | null;
  livingArea: number | null;
  propertyType: string;
  photoUrl: string | null;
  matchScore: number;
  matchReasons: string[];
}

/** Parse comma/semicolon-separated neighborhood text into searchable terms */
function parseNeighborhoods(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/[,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 1);
}

/** Parse must-haves text into keyword list */
function parseMustHaves(text: string | null): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[,;.]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

/** Check if property remarks or features mention a keyword */
function remarksContain(property: TrestleProperty, keyword: string): boolean {
  const remarks = (property.PublicRemarks || "").toLowerCase();
  return remarks.includes(keyword);
}

/**
 * Score a single listing against lead criteria.
 * Returns 0-100 score and list of reasons.
 */
export function scoreMatch(
  lead: LeadCriteria,
  property: TrestleProperty
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const neighborhoods = parseNeighborhoods(lead.neighborhoods);
  const mustHaves = parseMustHaves(lead.mustHaves);

  // 1. Location match (0-40 points)
  if (neighborhoods.length > 0) {
    const city = (property.City || "").toLowerCase();
    const zip = (property.PostalCode || "").toLowerCase();
    const address = (property.UnparsedAddress || "").toLowerCase();

    for (const hood of neighborhoods) {
      if (city.includes(hood) || zip.includes(hood) || address.includes(hood)) {
        score += 40;
        reasons.push(`Location match: ${hood}`);
        break;
      }
    }
  } else {
    // No neighborhood preference = partial match for any active listing
    score += 15;
    reasons.push("No location preference (open to all areas)");
  }

  // 2. Must-haves keyword match (0-30 points, 10 per match, max 3)
  let mustHaveMatches = 0;
  for (const keyword of mustHaves) {
    if (mustHaveMatches >= 3) break;
    if (remarksContain(property, keyword)) {
      score += 10;
      mustHaveMatches++;
      reasons.push(`Has: ${keyword}`);
    }
  }

  // 3. Timeline urgency boost (0-15 points)
  if (lead.timeline === "0-3 months") {
    score += 15;
    reasons.push("Ready to buy (0-3 months)");
  } else if (lead.timeline === "3-6 months") {
    score += 8;
    reasons.push("Buying in 3-6 months");
  }

  // 4. Financing readiness boost (0-15 points)
  if (lead.financing === "pre-approved") {
    score += 15;
    reasons.push("Pre-approved financing");
  } else if (lead.financing === "cash") {
    score += 15;
    reasons.push("Cash buyer");
  } else if (lead.financing === "need lender") {
    score += 5;
    reasons.push("Needs lender referral");
  }

  return { score: Math.min(100, score), reasons };
}

/**
 * Match a set of leads against a set of active listings.
 * Returns top matches per lead, sorted by score descending.
 */
export function matchLeadsToListings(
  leads: LeadCriteria[],
  listings: TrestleProperty[],
  maxMatchesPerLead = 5,
  minScore = 25
): ListingMatch[] {
  const allMatches: ListingMatch[] = [];

  for (const lead of leads) {
    // Only match leads in active pipeline stages
    const skipStages = ["closed_and_followup", "review_request"];
    if (skipStages.includes(lead.pipelineStage)) continue;

    const leadMatches: ListingMatch[] = [];

    for (const listing of listings) {
      const { score, reasons } = scoreMatch(lead, listing);
      if (score < minScore) continue;

      const addressParts = [listing.StreetNumber, listing.StreetName, listing.StreetSuffix].filter(Boolean);
      const address = listing.UnparsedAddress || addressParts.join(" ") || "Unknown";

      let photoUrl: string | null = null;
      if (listing.Media && listing.Media.length > 0) {
        const sorted = [...listing.Media].sort((a, b) => (a.Order || 0) - (b.Order || 0));
        photoUrl = sorted[0].MediaURL;
      }

      leadMatches.push({
        leadId: lead.leadId,
        leadName: lead.name,
        listingKey: listing.ListingKey,
        listingId: listing.ListingId,
        address,
        city: listing.City,
        postalCode: listing.PostalCode,
        listPrice: listing.ListPrice,
        bedrooms: listing.BedroomsTotal || null,
        bathrooms: listing.BathroomsTotalInteger || null,
        livingArea: listing.LivingArea || null,
        propertyType: listing.PropertyType,
        photoUrl,
        matchScore: score,
        matchReasons: reasons,
      });
    }

    // Sort by score desc and take top N
    leadMatches.sort((a, b) => b.matchScore - a.matchScore);
    allMatches.push(...leadMatches.slice(0, maxMatchesPerLead));
  }

  return allMatches.sort((a, b) => b.matchScore - a.matchScore);
}
