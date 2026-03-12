/**
 * Dynamic Heat Score Calculator
 * Calculates heat score from conversation-extracted data
 * Complements the existing form-based calculateHeatScore()
 */

import type { ExtractedData } from "./conversation-state";

/**
 * Calculate heat score from conversational qualification data
 * Uses the same scoring weights as the form-based calculator
 * but works with freeform-extracted data
 */
export function calculateDynamicHeatScore(
  extracted: ExtractedData,
  baseScore: number = 0
): number {
  let score = baseScore;

  // Contact information (20 points max)
  if (extracted.email) score += 10;
  if (extracted.phone) score += 10;

  // Timeline (20 points max)
  switch (extracted.timeline) {
    case "0-3 months":
      score += 20;
      break;
    case "3-6 months":
      score += 15;
      break;
    case "6+ months":
      score += 10;
      break;
    case "just browsing":
      score += 5;
      break;
  }

  // Financing (15 points max)
  switch (extracted.financing) {
    case "pre-approved":
    case "cash":
      score += 15;
      break;
    case "need lender":
      score += 10;
      break;
    case "not sure":
      score += 5;
      break;
  }

  // Pre-approval amount bonus (5 points)
  if (extracted.preapproval_amount && extracted.preapproval_amount > 0) {
    score += 5;
  }

  // Representation (15 points max)
  if (extracted.representation === "no") {
    score += 15;
  } else if (extracted.representation === "unsure") {
    score += 8;
  }

  // Specificity (15 points max)
  if (extracted.neighborhoods && extracted.neighborhoods.trim().length > 0) {
    score += 5;
  }
  if (extracted.must_haves && extracted.must_haves.trim().length > 0) {
    score += 5;
  }
  if (extracted.budget && extracted.budget > 0) {
    score += 5;
  }

  // Motivation bonus (10 points)
  if (extracted.motivation && extracted.motivation.trim().length > 0) {
    score += 10;
  }

  return Math.min(score, 100);
}
