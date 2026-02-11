// Subscription Plan and Feature Types

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number;
  annual_price: number | null;
  max_agents: number;
  max_properties: number;
  max_tenants: number;
  tier_level: number;
  is_active: boolean;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

export interface Feature {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanFeature {
  id: string;
  plan_id: string;
  feature_id: string;
  is_enabled: boolean;
  created_at: string;
}

export interface AgentUsage {
  id: string;
  agent_id: string;
  current_agents: number;
  current_properties: number;
  current_tenants: number;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

export type UsageAlertType = 'warning_70' | 'critical_100' | 'admin_notification';
export type ResourceType = 'agents' | 'properties' | 'tenants';

export interface UsageAlert {
  id: string;
  agent_id: string;
  alert_type: UsageAlertType;
  resource_type: ResourceType;
  usage_count: number;
  limit_count: number;
  usage_percentage: number;
  is_resolved: boolean;
  resolved_at: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminNote {
  id: string;
  agent_id: string;
  admin_id: string;
  note_type: 'general' | 'billing' | 'support' | 'sales_opportunity';
  content: string;
  is_urgent: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsageStatus {
  current: number;
  limit: number;
  percentage: number;
  status: 'ok' | 'warning' | 'critical';
}

export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  usage: {
    agents: UsageStatus;
    properties: UsageStatus;
    tenants: UsageStatus;
  };
  alerts: UsageAlert[];
  hasActiveAlerts: boolean;
}
