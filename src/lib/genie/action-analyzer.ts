/**
 * Genie Action Analyzer — Deterministic Rule Engine
 *
 * No AI call. Analyzes briefing data and produces prioritized action items.
 * Runs in ~10ms. Max 5 items returned, sorted by priority.
 */

import type { AgentBriefingData } from "@/lib/briefing/report-data";
import type { GenieActionItem, GenieActionType, DraftChannel } from "./types";

interface AnalyzerInput {
  briefingData: AgentBriefingData;
  tomorrowEvents: Array<{
    id: string;
    address: string;
    start_at: string;
    attendeeCount?: number;
  }>;
  upcomingEventCount: number; // events in next 14 days
  domAlertCount: number;      // unread DOM tier alerts
}

let actionCounter = 0;
function makeId(type: string, suffix?: string): string {
  return `${type}-${suffix || String(++actionCounter)}`;
}

export function analyzeActions(input: AnalyzerInput): GenieActionItem[] {
  const items: GenieActionItem[] = [];
  const { briefingData, tomorrowEvents, upcomingEventCount, domAlertCount } = input;
  const seenLeadIds = new Set<string>();

  // Reset counter for deterministic IDs
  actionCounter = 0;

  // ── Priority 1: Hot leads needing follow-up ──
  for (const lead of briefingData.followUps) {
    if (seenLeadIds.has(lead.leadId)) continue;
    if (lead.heatScore >= 80 && lead.daysSinceLastTouch >= 1) {
      const channels: DraftChannel[] = ["email"];
      if (lead.phone) channels.push("sms");

      items.push({
        id: makeId("hot", lead.leadId),
        type: "follow_up_hot_lead",
        priority: 1,
        title: `Follow up with ${lead.name} (Hot Lead)`,
        description: `Heat score ${lead.heatScore}, ${lead.daysSinceLastTouch}d since last contact. ${lead.timeline || ""} ${lead.financing ? `(${lead.financing})` : ""}`.trim(),
        leadId: lead.leadId,
        leadName: lead.name,
        leadEmail: lead.email || undefined,
        leadPhone: lead.phone || undefined,
        channels,
        metadata: {
          heatScore: lead.heatScore,
          pipelineStage: lead.pipelineStage,
          pipelineStageLabel: lead.pipelineStageLabel,
          timeline: lead.timeline,
          financing: lead.financing,
          property: lead.property,
          recentOpenHouse: lead.recentOpenHouse,
        },
      });
      seenLeadIds.add(lead.leadId);
    }
  }

  // ── Priority 1: Stale leads (3+ days untouched, score 50+) ──
  for (const lead of briefingData.followUps) {
    if (seenLeadIds.has(lead.leadId)) continue;
    if (lead.heatScore >= 50 && lead.daysSinceLastTouch >= 3) {
      const channels: DraftChannel[] = ["email"];
      if (lead.phone) channels.push("sms");

      items.push({
        id: makeId("stale", lead.leadId),
        type: "follow_up_stale_lead",
        priority: 1,
        title: `${lead.name} hasn't been contacted in ${lead.daysSinceLastTouch} days`,
        description: `Score ${lead.heatScore}, stage: ${lead.pipelineStageLabel}. ${lead.recentOpenHouse ? "Attended recent open house." : ""}`.trim(),
        leadId: lead.leadId,
        leadName: lead.name,
        leadEmail: lead.email || undefined,
        leadPhone: lead.phone || undefined,
        channels,
        metadata: {
          heatScore: lead.heatScore,
          pipelineStage: lead.pipelineStage,
          pipelineStageLabel: lead.pipelineStageLabel,
          daysSinceLastTouch: lead.daysSinceLastTouch,
          property: lead.property,
        },
      });
      seenLeadIds.add(lead.leadId);
    }
  }

  // ── Priority 1: Open house tomorrow ──
  for (const event of tomorrowEvents) {
    items.push({
      id: makeId("oh", event.id),
      type: "open_house_reminder",
      priority: 1,
      title: `Open house tomorrow at ${event.address}`,
      description: event.attendeeCount
        ? `${event.attendeeCount} registrations. Draft reminder texts?`
        : "Draft reminder texts to RSVPs?",
      channels: ["sms"],
      metadata: {
        eventId: event.id,
        address: event.address,
        startAt: event.start_at,
        attendeeCount: event.attendeeCount,
      },
    });
  }

  // ── Priority 2: New leads (created < 24h, stage = new_lead) ──
  for (const lead of briefingData.followUps) {
    if (seenLeadIds.has(lead.leadId)) continue;
    if (lead.pipelineStage === "new_lead" && lead.daysSinceLastTouch <= 1) {
      items.push({
        id: makeId("new", lead.leadId),
        type: "welcome_new_lead",
        priority: 2,
        title: `Welcome new lead: ${lead.name}`,
        description: `Just came in. ${lead.financing ? `Financing: ${lead.financing}.` : ""} ${lead.timeline ? `Timeline: ${lead.timeline}.` : ""}`.trim(),
        leadId: lead.leadId,
        leadName: lead.name,
        leadEmail: lead.email || undefined,
        leadPhone: lead.phone || undefined,
        channels: lead.email ? ["email"] : lead.phone ? ["sms"] : [],
        metadata: {
          pipelineStage: lead.pipelineStage,
          timeline: lead.timeline,
          financing: lead.financing,
          property: lead.property,
        },
      });
      seenLeadIds.add(lead.leadId);
    }
  }

  // ── Priority 2: Pipeline stalled (mid-stages, 5+ days untouched) ──
  for (const lead of briefingData.followUps) {
    if (seenLeadIds.has(lead.leadId)) continue;
    const midStages = [
      "qualification", "initial_consultation", "property_search_listing_prep",
      "open_houses_and_tours", "offer_and_negotiation",
    ];
    if (midStages.includes(lead.pipelineStage) && lead.daysSinceLastTouch >= 5) {
      items.push({
        id: makeId("stalled", lead.leadId),
        type: "pipeline_stalled",
        priority: 2,
        title: `${lead.name} stalled in ${lead.pipelineStageLabel}`,
        description: `${lead.daysSinceLastTouch} days with no activity. Score: ${lead.heatScore}.`,
        leadId: lead.leadId,
        leadName: lead.name,
        leadEmail: lead.email || undefined,
        leadPhone: lead.phone || undefined,
        channels: lead.email ? ["email"] : lead.phone ? ["sms"] : [],
        metadata: {
          pipelineStage: lead.pipelineStage,
          pipelineStageLabel: lead.pipelineStageLabel,
          daysSinceLastTouch: lead.daysSinceLastTouch,
          heatScore: lead.heatScore,
        },
      });
      seenLeadIds.add(lead.leadId);
    }
  }

  // ── Priority 3: DOM prospects available ──
  if (domAlertCount > 0) {
    items.push({
      id: makeId("dom"),
      type: "dom_prospects",
      priority: 3,
      title: `${domAlertCount} DOM prospect alert${domAlertCount > 1 ? "s" : ""}`,
      description: "Stale listings detected that may be ready for a new agent.",
      channels: [],
      linkHref: "/app/seller-map/dom-prospecting",
    });
  }

  // ── Priority 3: No upcoming open houses ──
  if (upcomingEventCount === 0) {
    items.push({
      id: makeId("suggest-oh"),
      type: "suggest_open_house",
      priority: 3,
      title: "No open houses scheduled",
      description: "Schedule an open house to generate new leads.",
      channels: [],
      linkHref: "/app/open-houses/new",
    });
  }

  // Sort by priority, then limit to 5
  items.sort((a, b) => a.priority - b.priority);
  return items.slice(0, 5);
}
