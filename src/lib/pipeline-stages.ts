/**
 * Lead Pipeline Stages
 *
 * Defines the ordered stages a lead moves through from initial capture
 * to closed deal and post-sale follow-up.
 */

export const PIPELINE_STAGES = [
  "new_lead",
  "initial_contact",
  "qualification",
  "initial_consultation",
  "property_search_listing_prep",
  "open_houses_and_tours",
  "offer_and_negotiation",
  "under_contract_escrow",
  "closing_coordination",
  "closed_and_followup",
  "review_request",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  new_lead: "New Lead",
  initial_contact: "Initial Contact",
  qualification: "Qualification",
  initial_consultation: "Initial Consultation",
  property_search_listing_prep: "Property Search / Listing Prep",
  open_houses_and_tours: "Open Houses & Tours",
  offer_and_negotiation: "Offer & Negotiation",
  under_contract_escrow: "Under Contract / Escrow",
  closing_coordination: "Closing Coordination",
  closed_and_followup: "Closed & Follow-up",
  review_request: "Review Request",
};

export const PIPELINE_STAGE_COLORS: Record<PipelineStage, string> = {
  new_lead: "#6366f1",            // indigo
  initial_contact: "#3b82f6",     // blue
  qualification: "#8b5cf6",       // violet
  initial_consultation: "#a855f7", // purple
  property_search_listing_prep: "#ec4899", // pink
  open_houses_and_tours: "#f59e0b", // amber
  offer_and_negotiation: "#f97316", // orange
  under_contract_escrow: "#14b8a6", // teal
  closing_coordination: "#06b6d4",  // cyan
  closed_and_followup: "#10b981",   // emerald
  review_request: "#84cc16",        // lime
};

/**
 * Get the next stage in the pipeline, or null if at the end.
 */
export function getNextStage(current: PipelineStage): PipelineStage | null {
  const idx = PIPELINE_STAGES.indexOf(current);
  if (idx === -1 || idx >= PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[idx + 1];
}

/**
 * Get the previous stage in the pipeline, or null if at the start.
 */
export function getPreviousStage(current: PipelineStage): PipelineStage | null {
  const idx = PIPELINE_STAGES.indexOf(current);
  if (idx <= 0) return null;
  return PIPELINE_STAGES[idx - 1];
}

/**
 * Get the 0-based position of a stage.
 */
export function getStagePosition(stage: PipelineStage): number {
  return PIPELINE_STAGES.indexOf(stage);
}
