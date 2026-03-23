/**
 * Genie Assistant — Shared Types
 *
 * Covers all 24 action types the Genie can perform:
 * - Proactive actions (triggered by data analysis)
 * - Quick actions (agent-initiated via action grid)
 */

// ── Proactive action types (briefing-triggered) ──────────────────────────────
export type ProactiveActionType =
  | "follow_up_hot_lead"
  | "follow_up_stale_lead"
  | "open_house_reminder"
  | "dom_prospects"
  | "pipeline_stalled"
  | "welcome_new_lead"
  | "suggest_open_house"
  | "new_lead_captured";

// ── Quick action types (agent-initiated) ─────────────────────────────────────
export type QuickActionType =
  | "advance_pipeline"
  | "create_task"
  | "create_calendar_event"
  | "search_mls"
  | "property_lookup"
  | "generate_property_report"
  | "run_calculator"
  | "export_calculator_report"
  | "search_seller_map"
  | "save_seller_search"
  | "create_farm_watchdog"
  | "create_dom_search"
  | "create_open_house"
  | "send_esign_document"
  | "attach_file_to_contact"
  | "create_mls_search_profile"
  | "search_absentee"
  | "search_high_equity"
  | "search_foreclosure"
  | "search_just_sold"
  | "search_investor";

export type GenieActionType = ProactiveActionType | QuickActionType;

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

// ── Copilot types ────────────────────────────────────────────────────────────

export interface CopilotMessage {
  role: "user" | "assistant" | "system";
  content: string;
  actionResult?: CopilotActionResult;
  timestamp: string;
}

export interface CopilotActionResult {
  action: string;
  success: boolean;
  data?: any;
  redirect?: string;
  error?: string;
}

// ── Quick Action definitions for UI grid ─────────────────────────────────────
export interface QuickActionDef {
  type: QuickActionType;
  label: string;
  description: string;
  icon: string;   // emoji or icon name
  color: string;  // hex color
  category: "leads" | "property" | "prospecting" | "documents";
}

export const QUICK_ACTIONS: QuickActionDef[] = [
  // Leads & Pipeline
  { type: "advance_pipeline", label: "Move Pipeline Stage", description: "Advance a lead to the next pipeline stage", icon: "→", color: "#6366f1", category: "leads" },
  { type: "create_task", label: "Create Task", description: "Create a follow-up task for a lead or contact", icon: "✓", color: "#059669", category: "leads" },
  { type: "create_calendar_event", label: "Schedule Event", description: "Create a calendar appointment or meeting", icon: "📅", color: "#0891b2", category: "leads" },
  { type: "create_open_house", label: "Create Open House", description: "Set up a new open house event with MLS import", icon: "🏠", color: "#7c3aed", category: "leads" },

  // Property Intelligence
  { type: "property_lookup", label: "Property Lookup", description: "Look up property data by address or zip", icon: "🔍", color: "#1e40af", category: "property" },
  { type: "generate_property_report", label: "Property Report", description: "Generate a branded property intel PDF", icon: "📄", color: "#0369a1", category: "property" },
  { type: "search_mls", label: "MLS Search", description: "Search MLS listings by zip code or TMK area", icon: "🏘", color: "#4f46e5", category: "property" },
  { type: "run_calculator", label: "Run Calculator", description: "Mortgage, net sheet, flip, rental, or 1031 calculator", icon: "🧮", color: "#b45309", category: "property" },
  { type: "export_calculator_report", label: "Email Calculator", description: "Export calculator results and email to client", icon: "📊", color: "#92400e", category: "property" },

  // Prospecting
  { type: "search_seller_map", label: "Seller Map", description: "Find motivated sellers by equity, ownership, distress signals", icon: "🗺", color: "#dc2626", category: "prospecting" },
  { type: "search_absentee", label: "Absentee Owners", description: "Non-owner-occupied properties — out-of-state owners, landlords", icon: "🏚", color: "#3b82f6", category: "prospecting" },
  { type: "search_high_equity", label: "High Equity", description: "Long-tenure owners with significant untapped equity", icon: "💰", color: "#059669", category: "prospecting" },
  { type: "search_foreclosure", label: "Pre-Foreclosure", description: "Distressed properties — underwater mortgages, assessment drops", icon: "⚠", color: "#dc2626", category: "prospecting" },
  { type: "search_just_sold", label: "Just Sold Farming", description: "Recent sales for postcard campaigns to nearby homeowners", icon: "🏡", color: "#7c3aed", category: "prospecting" },
  { type: "search_investor", label: "Investor Portfolios", description: "Corporate entities and multi-property investors", icon: "🏢", color: "#b45309", category: "prospecting" },
  { type: "create_dom_search", label: "DOM Search", description: "Find stale listings exceeding average DOM thresholds", icon: "⏱", color: "#991b1b", category: "prospecting" },
  { type: "create_farm_watchdog", label: "Farm & Watchdog", description: "Set up a farm area with MLS watchdog alerts", icon: "📡", color: "#7c2d12", category: "prospecting" },
  { type: "save_seller_search", label: "Save Search", description: "Save a seller map search for weekly monitoring", icon: "💾", color: "#b91c1c", category: "prospecting" },

  // Documents
  { type: "send_esign_document", label: "Send E-Sign", description: "Send a document for e-signature via CRM", icon: "✍", color: "#4338ca", category: "documents" },
  { type: "attach_file_to_contact", label: "Attach to Contact", description: "Upload and attach a file to a CRM contact", icon: "📎", color: "#3730a3", category: "documents" },
];
