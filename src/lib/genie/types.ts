/**
 * Genie Assistant — Shared Types
 */

export type GenieActionType =
  | "follow_up_hot_lead"
  | "follow_up_stale_lead"
  | "open_house_reminder"
  | "dom_prospects"
  | "pipeline_stalled"
  | "welcome_new_lead"
  | "suggest_open_house";

export type DraftChannel = "email" | "sms";

export interface GenieActionItem {
  id: string;
  type: GenieActionType;
  priority: 1 | 2 | 3;
  title: string;
  description: string;
  leadId?: string;
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;
  ghlContactId?: string;
  channels: DraftChannel[];
  linkHref?: string;
  metadata?: Record<string, any>;
}

export interface GenieDraft {
  actionId: string;
  channel: DraftChannel;
  subject?: string;
  body: string;
  leadId?: string;
  ghlContactId?: string;
}

export interface GenieActionLogEntry {
  agentId: string;
  leadId?: string;
  actionType: string;
  actionDetail: Record<string, any>;
  status: "completed" | "failed" | "draft_only";
}
