/**
 * Bird Dog Prospecting Engine
 *
 * Automated property search that hunts for off-market leads matching
 * agent criteria. Uses REAPI PropertySearch (ids_only=true = FREE)
 * for discovery, then selectively calls PropertyDetail on NEW matches
 * only (capped at 20 per run) to protect API credits.
 *
 * Lead scoring is deterministic based on REAPI lead flags:
 *   HOT (red)    = Most likely to sell (life events, distress)
 *   WARM (orange) = Moderately likely (absentee + equity)
 *   COLD (gray)   = Not likely right now (nurture/monitor)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getReapiClient, mapReapiToAttomShape } from "@/lib/integrations/reapi-client";

// Max properties to fetch full detail per run (controls API credit usage)
const MAX_DETAIL_PER_RUN = 20;

// ── Types ────────────────────────────────────────────────────────

export interface BirdDogSearchCriteria {
  zip?: string;
  city?: string;
  state?: string;
  property_type?: string;
  beds_min?: number;
  beds_max?: number;
  baths_min?: number;
  baths_max?: number;
  value_min?: number;
  value_max?: number;
  equity_min?: number;
  equity_max?: number;
  year_built_min?: number;
  year_built_max?: number;
  building_size_min?: number;
  building_size_max?: number;
  // Lead flag filters
  absentee_owner?: boolean;
  high_equity?: boolean;
  vacant?: boolean;
  foreclosure?: boolean;
  pre_foreclosure?: boolean;
  investor?: boolean;
  tax_delinquent?: boolean;
  // Geo
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface BirdDogScoreResult {
  score: "hot" | "warm" | "cold";
  reasons: string[];
}

export interface BirdDogRunSummary {
  searchId: string;
  searchName: string;
  totalIds: number;
  newIds: number;
  detailsFetched: number;
  hot: number;
  warm: number;
  cold: number;
  errors: string[];
}

// ── Supabase Admin ───────────────────────────────────────────────

let _admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}

// ── Lead Scoring ─────────────────────────────────────────────────

export function scoreLead(property: any): BirdDogScoreResult {
  const flags = property.leadFlags || property._raw || {};
  const reasons: string[] = [];
  let score: "hot" | "warm" | "cold" = "cold";

  // HOT triggers (any one = HOT - life events and distress signals)
  if (flags.inherited) {
    score = "hot";
    reasons.push("Inherited property");
  }
  if (flags.preForeclosure || flags.pre_foreclosure) {
    score = "hot";
    reasons.push("Pre-foreclosure");
  }
  if (flags.death || flags.deathTransfer) {
    score = "hot";
    reasons.push("Death transfer");
  }
  if (flags.taxLien || flags.taxDelinquent || flags.tax_delinquent) {
    score = "hot";
    reasons.push("Tax delinquent");
  }
  if ((flags.vacant || flags.vacant === true) && (flags.absenteeOwner || flags.absentee_owner)) {
    score = "hot";
    reasons.push("Vacant and absentee");
  }
  if (flags.foreclosure || flags.bankOwned) {
    score = "hot";
    reasons.push(flags.bankOwned ? "Bank owned" : "Foreclosure");
  }
  if (flags.deedInLieu) {
    score = "hot";
    reasons.push("Deed in lieu");
  }
  if (flags.spousalDeath) {
    score = "hot";
    reasons.push("Spousal death");
  }

  // WARM triggers (only if not already HOT)
  if (score !== "hot") {
    const equityPct = property.equityPercent || property.equity_percent || 0;
    const ownershipMonths = property.ownershipLength || property.ownership_length || 0;
    const isAbsentee = flags.absenteeOwner || flags.absentee_owner;
    const isOutOfState = flags.outOfStateAbsenteeOwner || flags.out_of_state_absentee;
    const isFreeClear = flags.freeClear || flags.free_clear;
    const isHighEquity = flags.highEquity || flags.high_equity;

    if (isOutOfState && equityPct > 50 && ownershipMonths > 120) {
      score = "warm";
      reasons.push("Out-of-state absentee, high equity, long-term owner");
    }
    if (isAbsentee && equityPct > 40) {
      if (score !== "warm") score = "warm";
      reasons.push("Absentee owner with significant equity");
    }
    if (isFreeClear) {
      if (score !== "warm") score = "warm";
      reasons.push("Free and clear - no mortgage");
    }
    if (equityPct > 60 && ownershipMonths > 180) {
      if (score !== "warm") score = "warm";
      reasons.push("Long-term owner (15+ years) with high equity");
    }
    if (isHighEquity && isAbsentee) {
      if (score !== "warm") score = "warm";
      reasons.push("High equity absentee owner");
    }
  }

  // COLD - add a default reason
  if (score === "cold") {
    reasons.push("Monitoring - no urgency signals detected");
  }

  return { score, reasons };
}

// ── Search Runner ────────────────────────────────────────────────

export async function runBirdDogSearch(searchId: string): Promise<BirdDogRunSummary> {
  const admin = getAdmin();
  const reapi = getReapiClient();

  const summary: BirdDogRunSummary = {
    searchId,
    searchName: "",
    totalIds: 0,
    newIds: 0,
    detailsFetched: 0,
    hot: 0,
    warm: 0,
    cold: 0,
    errors: [],
  };

  if (!reapi) {
    summary.errors.push("REAPI client not configured");
    return summary;
  }

  // 1. Load search criteria
  const { data: search, error: searchError } = await admin
    .from("bird_dog_searches")
    .select("*")
    .eq("id", searchId)
    .single();

  if (searchError || !search) {
    summary.errors.push(`Search not found: ${searchError?.message}`);
    return summary;
  }

  summary.searchName = search.name;
  const criteria = search.search_criteria as BirdDogSearchCriteria;
  const previousIds = new Set<string>((search.last_run_property_ids || []).map(String));

  // 2. Search for matching property IDs (FREE - 0 credits)
  try {
    // Strip fields not supported by REAPI PropertySearch
    // equity_min/max are Bird Dog criteria used for post-filtering, not REAPI search params
    const { equity_min, equity_max, tax_delinquent, ...reapiCriteria } = criteria as any;
    // Map tax_delinquent to REAPI's supported field if available
    if (tax_delinquent) (reapiCriteria as any).tax_lien = true;

    const searchResult = await reapi.searchPropertyIds({
      ...reapiCriteria,
      size: 500, // Get up to 500 matching IDs
    });

    // ids_only=true returns bare numbers: data: [38981203, 150081962, ...]
    // NOT objects like { id: 12345 }
    const allIds = searchResult.data.map((item: any) =>
      typeof item === "number" || typeof item === "string" ? String(item) : String(item.id || item.propertyId || ""),
    ).filter(Boolean);
    summary.totalIds = allIds.length;
    console.log(`[BirdDog] Got ${allIds.length} IDs (sample: ${allIds.slice(0, 3).join(", ")})`);

    // 3. Find NEW IDs not in previous run
    const newIds = allIds.filter((id) => !previousIds.has(id));
    summary.newIds = newIds.length;

    if (newIds.length === 0) {
      // No new properties -- update last_run and next_run
      await admin
        .from("bird_dog_searches")
        .update({
          last_run_at: new Date().toISOString(),
          last_run_property_ids: allIds,
          last_run_new_count: 0,
          next_run_at: calculateNextRun(search.schedule).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", searchId);

      return summary;
    }

    // 4. Fetch full details on NEW properties only (capped)
    const idsToFetch = newIds.slice(0, MAX_DETAIL_PER_RUN);
    const results: any[] = [];

    console.log(`[BirdDog] Fetching details for ${idsToFetch.length} properties (IDs: ${idsToFetch.slice(0, 5).join(", ")}...)`);
    for (const id of idsToFetch) {
      try {
        const detail = await reapi.getPropertyDetail({ id: Number(id), prior_owner: true, comps: false });
        if (detail.data) {
          const mapped = mapReapiToAttomShape(detail.data);
          const raw = detail.data as any;
          const scoreResult = scoreLead({ ...mapped, ...raw });

          results.push({
            search_id: searchId,
            agent_id: search.agent_id,
            reapi_property_id: id,
            address: mapped.address?.line1 || mapped.address?.oneLine || "",
            city: mapped.address?.locality || "",
            state: mapped.address?.countrySubd || "",
            zip: mapped.address?.postal1 || "",
            latitude: mapped.location?.latitude,
            longitude: mapped.location?.longitude,
            property_type: mapped.summary?.propSubType || mapped.summary?.propType,
            beds: mapped.building?.rooms?.beds,
            baths: mapped.building?.rooms?.bathsTotal,
            sqft: mapped.building?.size?.livingSize,
            year_built: mapped.building?.summary?.yearBuilt,
            owner_name: mapped.owner?.owner1?.fullName,
            owner_name_2: mapped.owner?.owner2?.fullName,
            mailing_address: mapped.owner?.mailingAddressOneLine,
            absentee_owner: raw.absenteeOwner,
            out_of_state_absentee: raw.outOfStateAbsenteeOwner,
            estimated_value: raw.estimatedValue,
            estimated_equity: raw.estimatedEquity,
            equity_percent: raw.equityPercent,
            mortgage_balance: raw.openMortgageBalance || (raw.estimatedMortgageBalance ? Number(raw.estimatedMortgageBalance) : 0),
            last_sale_date: raw.lastSaleDate,
            last_sale_price: raw.lastSalePrice ? Number(raw.lastSalePrice) : 0,
            ownership_length: raw.ownerInfo?.ownershipLength,
            lead_score: scoreResult.score,
            lead_score_reasons: scoreResult.reasons,
            lead_flags: mapped.leadFlags || {},
            property_data: mapped,
            is_new: true,
          });

          // Post-filter by equity_min if specified in criteria
          if (equity_min && raw.equityPercent != null && Number(raw.equityPercent) < equity_min) {
            results.pop(); // Remove the just-added result
          } else {
            if (scoreResult.score === "hot") summary.hot++;
            else if (scoreResult.score === "warm") summary.warm++;
            else summary.cold++;
          }
        }
      } catch (err: any) {
        console.error(`[BirdDog] Detail fetch failed for ID ${id}:`, err.message);
        summary.errors.push(`ID ${id}: ${err.message}`);
        // Stop after 3 consecutive errors to avoid wasting time
        if (summary.errors.length >= 3) {
          console.warn("[BirdDog] Too many errors, stopping detail fetches");
          break;
        }
      }
    }

    summary.detailsFetched = results.length;

    // 5. Upsert results (update if property already exists for this search)
    if (results.length > 0) {
      const { error: upsertError } = await admin
        .from("bird_dog_results")
        .upsert(results, { onConflict: "search_id,reapi_property_id" });

      if (upsertError) {
        summary.errors.push(`Result upsert failed: ${upsertError.message}`);
      }
    }

    // 6. Mark previous results as not new
    await admin
      .from("bird_dog_results")
      .update({ is_new: false })
      .eq("search_id", searchId)
      .eq("is_new", true)
      .not("reapi_property_id", "in", `(${newIds.slice(0, MAX_DETAIL_PER_RUN).join(",")})`);

    // 7. Update search metadata
    const { count: totalResults } = await admin
      .from("bird_dog_results")
      .select("id", { count: "exact", head: true })
      .eq("search_id", searchId);

    await admin
      .from("bird_dog_searches")
      .update({
        last_run_at: new Date().toISOString(),
        last_run_property_ids: allIds,
        last_run_new_count: newIds.length,
        next_run_at: calculateNextRun(search.schedule).toISOString(),
        total_results: totalResults || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", searchId);

    console.log(
      `[BirdDog] ${search.name}: ${summary.totalIds} total, ${summary.newIds} new, ${summary.detailsFetched} fetched (${summary.hot} HOT, ${summary.warm} WARM, ${summary.cold} COLD)`,
    );
  } catch (err: any) {
    summary.errors.push(`Search failed: ${err.message}`);
    console.error(`[BirdDog] Search ${searchId} failed:`, err);
  }

  return summary;
}

// ── Schedule Helpers ─────────────────────────────────────────────

export function calculateNextRun(schedule: string): Date {
  const next = new Date();
  switch (schedule) {
    case "daily":
      next.setDate(next.getDate() + 1);
      next.setHours(6, 0, 0, 0); // 6 AM local
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      next.setHours(6, 0, 0, 0);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      next.setHours(6, 0, 0, 0);
      break;
    default:
      next.setDate(next.getDate() + 7);
  }
  return next;
}

// ── Criteria Summary (for display) ──────────────────────────────

export function summarizeCriteria(criteria: BirdDogSearchCriteria): string {
  const parts: string[] = [];
  if (criteria.zip) parts.push(`ZIP ${criteria.zip}`);
  if (criteria.city) parts.push(criteria.city);
  if (criteria.property_type) parts.push(criteria.property_type);
  if (criteria.absentee_owner) parts.push("Absentee");
  if (criteria.high_equity) parts.push("High Equity");
  if (criteria.vacant) parts.push("Vacant");
  if (criteria.foreclosure || criteria.pre_foreclosure) parts.push("Distressed");
  if (criteria.investor) parts.push("Investor");
  if (criteria.tax_delinquent) parts.push("Tax Delinquent");
  if (criteria.equity_min) parts.push(`Equity>${criteria.equity_min}%`);
  if (criteria.beds_min) parts.push(`${criteria.beds_min}+ beds`);
  if (criteria.value_min) parts.push(`Value>$${(criteria.value_min / 1000).toFixed(0)}K`);
  return parts.join(" | ") || "All properties";
}
