// Subscription Plan and Feature Types

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number;
  annual_price: number | null;
  max_agents: number;
  max_staff: number;
  max_properties: number;
  max_tenants: number;
  tier_level: number;
  is_active: boolean;
  is_custom: boolean;
  stripe_monthly_product_id: string | null;
  stripe_yearly_product_id: string | null;
  stripe_price_id: string | null;
  stripe_yearly_price_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PmAddonPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number;
  max_properties: number;
  max_tenants: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  tier_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PmAddonSubscription {
  id: string;
  account_id: string | null;
  agent_id: string;
  pm_addon_plan_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: 'active' | 'canceled' | 'past_due' | 'suspended';
  current_period_start: string | null;
  current_period_end: string | null;
  next_billing_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PmLimits {
  max_properties: number;
  max_tenants: number;
  current_properties: number;
  current_tenants: number;
  has_pm_addon: boolean;
  pm_addon_name: string | null;
  can_add_property: boolean;
  can_add_tenant: boolean;
  properties_remaining: number;
  tenants_remaining: number;
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
