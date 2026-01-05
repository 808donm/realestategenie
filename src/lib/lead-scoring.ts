/**
 * Lead Heat Score Calculator
 * Scores leads based on qualification criteria (0-100)
 */

export type LeadPayload = {
  name: string;
  email?: string;
  phone_e164?: string;
  representation?: "yes" | "no" | "unsure";
  wants_agent_reach_out?: boolean;
  timeline?: "0-3 months" | "3-6 months" | "6+ months" | "just browsing";
  financing?: "pre-approved" | "cash" | "need lender" | "not sure";
  neighborhoods?: string;
  must_haves?: string;
  consent?: {
    sms: boolean;
    email: boolean;
  };
};

/**
 * Calculate lead heat score (0-100)
 * Higher score = hotter lead
 */
export function calculateHeatScore(payload: LeadPayload): number {
  let score = 0;

  // Contact information (30 points max)
  if (payload.email) score += 10;
  if (payload.phone_e164) score += 10;
  if (payload.consent?.email) score += 5;
  if (payload.consent?.sms) score += 5;

  // Representation (20 points max)
  if (payload.representation === "no") {
    score += 20; // Unrepresented = hottest
  } else if (payload.representation === "unsure") {
    score += 10;
  } else if (payload.representation === "yes") {
    score += 5; // Still valuable, but represented
  }

  // Wants agent reach out (15 points)
  if (payload.wants_agent_reach_out) {
    score += 15;
  }

  // Timeline (20 points max)
  switch (payload.timeline) {
    case "0-3 months":
      score += 20; // Most urgent
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
  switch (payload.financing) {
    case "pre-approved":
    case "cash":
      score += 15; // Ready to buy
      break;
    case "need lender":
      score += 10;
      break;
    case "not sure":
      score += 5;
      break;
  }

  // Specificity (10 points max)
  if (payload.neighborhoods && payload.neighborhoods.trim().length > 0) {
    score += 5; // Specific about location
  }
  if (payload.must_haves && payload.must_haves.trim().length > 0) {
    score += 5; // Specific about requirements
  }

  return Math.min(score, 100); // Cap at 100
}

/**
 * Get heat level label
 */
export function getHeatLevel(score: number): "hot" | "warm" | "cold" {
  if (score >= 80) return "hot";
  if (score >= 50) return "warm";
  return "cold";
}

/**
 * Get heat level color for UI
 */
export function getHeatColor(level: "hot" | "warm" | "cold"): string {
  switch (level) {
    case "hot":
      return "#ef4444"; // red-500
    case "warm":
      return "#f59e0b"; // amber-500
    case "cold":
      return "#3b82f6"; // blue-500
  }
}
