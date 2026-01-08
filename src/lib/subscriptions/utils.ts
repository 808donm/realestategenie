// Subscription Management Utilities

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SubscriptionPlan, AgentUsage, UsageAlert, SubscriptionStatus, UsageStatus } from "./types";

/**
 * Get the current subscription plan for an agent
 */
export async function getAgentSubscriptionPlan(agentId: string): Promise<SubscriptionPlan | null> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("agent_subscriptions")
    .select(`
      subscription_plan_id,
      subscription_plans (*)
    `)
    .eq("agent_id", agentId)
    .eq("status", "active")
    .single();

  if (error || !data) {
    return null;
  }

  return data.subscription_plans as SubscriptionPlan;
}

/**
 * Calculate usage status based on current usage and limits
 */
function calculateUsageStatus(current: number, limit: number): UsageStatus {
  const percentage = limit > 0 ? (current / limit) * 100 : 0;

  let status: 'ok' | 'warning' | 'critical' = 'ok';
  if (percentage >= 100) {
    status = 'critical';
  } else if (percentage >= 70) {
    status = 'warning';
  }

  return {
    current,
    limit,
    percentage: Math.round(percentage * 100) / 100,
    status
  };
}

/**
 * Get current usage for an agent
 */
export async function getAgentUsage(agentId: string): Promise<AgentUsage | null> {
  const supabase = await supabaseAdmin();

  // Try to get existing usage record
  let { data: usage } = await supabase
    .from("agent_usage")
    .select("*")
    .eq("agent_id", agentId)
    .single();

  // If no usage record exists or it's stale (>1 hour), recalculate
  const isStale = !usage ||
    (new Date().getTime() - new Date(usage.last_calculated_at).getTime()) > 3600000;

  if (isStale) {
    // Call the calculate function
    const { data: calculated } = await supabase
      .rpc("calculate_agent_usage", { agent_uuid: agentId });

    if (calculated && calculated.length > 0) {
      const calc = calculated[0];

      // Upsert the usage record
      const { data: upserted } = await supabase
        .from("agent_usage")
        .upsert({
          agent_id: agentId,
          current_agents: calc.agents_count || 1,
          current_properties: calc.properties_count || 0,
          current_tenants: calc.tenants_count || 0,
          last_calculated_at: new Date().toISOString()
        }, {
          onConflict: "agent_id"
        })
        .select()
        .single();

      usage = upserted;
    }
  }

  return usage;
}

/**
 * Get unresolved usage alerts for an agent
 */
export async function getActiveUsageAlerts(agentId: string): Promise<UsageAlert[]> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("usage_alerts")
    .select("*")
    .eq("agent_id", agentId)
    .eq("is_resolved", false)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data;
}

/**
 * Get complete subscription status for an agent
 */
export async function getSubscriptionStatus(agentId: string): Promise<SubscriptionStatus | null> {
  const [plan, usage, alerts] = await Promise.all([
    getAgentSubscriptionPlan(agentId),
    getAgentUsage(agentId),
    getActiveUsageAlerts(agentId)
  ]);

  if (!plan || !usage) {
    return null;
  }

  return {
    plan,
    usage: {
      agents: calculateUsageStatus(usage.current_agents, plan.max_agents),
      properties: calculateUsageStatus(usage.current_properties, plan.max_properties),
      tenants: calculateUsageStatus(usage.current_tenants, plan.max_tenants)
    },
    alerts,
    hasActiveAlerts: alerts.length > 0
  };
}

/**
 * Check if user has access to a specific feature
 */
export async function hasFeatureAccess(agentId: string, featureSlug: string): Promise<boolean> {
  const supabase = await supabaseAdmin();

  const { data, error } = await supabase
    .rpc("has_feature_access", {
      agent_uuid: agentId,
      feature_slug: featureSlug
    });

  if (error) {
    console.error("Error checking feature access:", error);
    return false;
  }

  return data === true;
}

/**
 * Get all features for a plan
 */
export async function getPlanFeatures(planId: string): Promise<string[]> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("plan_features")
    .select(`
      features (slug)
    `)
    .eq("plan_id", planId)
    .eq("is_enabled", true);

  if (error || !data) {
    return [];
  }

  return data.map((item: any) => item.features.slug);
}

/**
 * Get the next upgrade plan for suggestions
 */
export async function getSuggestedUpgradePlan(currentPlanId: string): Promise<SubscriptionPlan | null> {
  const supabase = await supabaseServer();

  // Get current plan tier
  const { data: currentPlan } = await supabase
    .from("subscription_plans")
    .select("tier_level")
    .eq("id", currentPlanId)
    .single();

  if (!currentPlan) {
    return null;
  }

  // Get next tier plan
  const { data: nextPlan } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .eq("is_custom", false)
    .gt("tier_level", currentPlan.tier_level)
    .order("tier_level", { ascending: true })
    .limit(1)
    .single();

  return nextPlan;
}

/**
 * Create or update usage alert
 */
export async function createUsageAlert(
  agentId: string,
  alertType: 'warning_70' | 'critical_100' | 'admin_notification',
  resourceType: 'agents' | 'properties' | 'tenants',
  usageCount: number,
  limitCount: number,
  usagePercentage: number
): Promise<UsageAlert | null> {
  const supabase = await supabaseAdmin();

  // Check if alert already exists for this resource in the last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await supabase
    .from("usage_alerts")
    .select("*")
    .eq("agent_id", agentId)
    .eq("alert_type", alertType)
    .eq("resource_type", resourceType)
    .eq("is_resolved", false)
    .gte("created_at", oneDayAgo)
    .single();

  if (existing) {
    // Alert already exists, don't create duplicate
    return existing;
  }

  // Create new alert
  const { data, error } = await supabase
    .from("usage_alerts")
    .insert({
      agent_id: agentId,
      alert_type: alertType,
      resource_type: resourceType,
      usage_count: usageCount,
      limit_count: limitCount,
      usage_percentage: usagePercentage
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating usage alert:", error);
    return null;
  }

  return data;
}

/**
 * Check usage and create alerts if needed
 */
export async function checkUsageAndCreateAlerts(agentId: string): Promise<void> {
  const status = await getSubscriptionStatus(agentId);

  if (!status) {
    return;
  }

  const checks = [
    { type: 'agents' as const, usage: status.usage.agents },
    { type: 'properties' as const, usage: status.usage.properties },
    { type: 'tenants' as const, usage: status.usage.tenants }
  ];

  for (const check of checks) {
    if (check.usage.status === 'critical') {
      await createUsageAlert(
        agentId,
        'critical_100',
        check.type,
        check.usage.current,
        check.usage.limit,
        check.usage.percentage
      );
    } else if (check.usage.status === 'warning') {
      await createUsageAlert(
        agentId,
        'warning_70',
        check.type,
        check.usage.current,
        check.usage.limit,
        check.usage.percentage
      );
    }
  }
}

/**
 * Resolve an alert
 */
export async function resolveUsageAlert(alertId: string): Promise<void> {
  const supabase = await supabaseAdmin();

  await supabase
    .from("usage_alerts")
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString()
    })
    .eq("id", alertId);
}

/**
 * Mark alert email as sent
 */
export async function markAlertEmailSent(alertId: string): Promise<void> {
  const supabase = await supabaseAdmin();

  await supabase
    .from("usage_alerts")
    .update({
      email_sent: true,
      email_sent_at: new Date().toISOString()
    })
    .eq("id", alertId);
}
