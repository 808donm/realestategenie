// Server-side utilities for feature checking and subscription management

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hasFeatureAccess } from "./utils";
import type { PmLimits } from "./types";

/**
 * Get the current user's feature access
 * Use this in server components to check if a feature should be displayed
 */
export async function getCurrentUserFeatures(): Promise<Set<string>> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return new Set();
  }

  // Get user's active subscription and features
  const { data: subscription } = await supabase
    .from("agent_subscriptions")
    .select(`
      subscription_plan_id,
      plan_features!inner (
        is_enabled,
        features (slug)
      )
    `)
    .eq("agent_id", data.user.id)
    .eq("status", "active")
    .single();

  if (!subscription) {
    return new Set();
  }

  const features = new Set<string>();
  subscription.plan_features?.forEach((pf: any) => {
    if (pf.is_enabled && pf.features?.slug) {
      features.add(pf.features.slug);
    }
  });

  return features;
}

/**
 * Check if current user has access to a specific feature
 */
export async function checkFeatureAccess(featureSlug: string): Promise<boolean> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return false;
  }

  return hasFeatureAccess(data.user.id, featureSlug);
}

/**
 * Get feature access status for multiple features at once
 */
export async function checkMultipleFeatures(
  featureSlugs: string[]
): Promise<Record<string, boolean>> {
  const features = await getCurrentUserFeatures();

  return featureSlugs.reduce((acc, slug) => {
    acc[slug] = features.has(slug);
    return acc;
  }, {} as Record<string, boolean>);
}

/**
 * Require feature access - redirect if user doesn't have access
 */
export async function requireFeature(featureSlug: string, redirectTo: string = "/app/billing") {
  const hasAccess = await checkFeatureAccess(featureSlug);

  if (!hasAccess) {
    const { redirect } = await import("next/navigation");
    redirect(redirectTo);
  }
}

/**
 * Get PM limits for an agent (combines base plan + PM add-on)
 * Uses the get_pm_limits database function for consistency
 */
export async function getPmLimits(agentId: string): Promise<PmLimits> {
  const { data, error } = await supabaseAdmin.rpc("get_pm_limits", {
    p_agent_id: agentId,
  });

  if (error || !data || data.length === 0) {
    // Default: base PM limits (10 properties, 50 tenants)
    return {
      max_properties: 10,
      max_tenants: 50,
      current_properties: 0,
      current_tenants: 0,
      has_pm_addon: false,
      pm_addon_name: null,
      can_add_property: true,
      can_add_tenant: true,
      properties_remaining: 10,
      tenants_remaining: 50,
    };
  }

  const limits = data[0];
  return {
    max_properties: limits.max_properties,
    max_tenants: limits.max_tenants,
    current_properties: limits.current_properties,
    current_tenants: limits.current_tenants,
    has_pm_addon: limits.has_pm_addon,
    pm_addon_name: limits.pm_addon_name,
    can_add_property: limits.current_properties < limits.max_properties,
    can_add_tenant: limits.current_tenants < limits.max_tenants,
    properties_remaining: Math.max(0, limits.max_properties - limits.current_properties),
    tenants_remaining: Math.max(0, limits.max_tenants - limits.current_tenants),
  };
}

/**
 * Check if an agent can add a property, throwing a descriptive error if not
 */
export async function assertCanAddProperty(agentId: string): Promise<PmLimits> {
  const limits = await getPmLimits(agentId);

  if (!limits.can_add_property) {
    const upgradeMsg = limits.has_pm_addon
      ? "Upgrade your PM add-on plan for more capacity."
      : "Add a Property Management plan to increase your limit.";
    throw new Error(
      `Property limit reached (${limits.current_properties}/${limits.max_properties}). ${upgradeMsg}`
    );
  }

  return limits;
}

/**
 * Check if an agent can add a tenant, throwing a descriptive error if not
 */
export async function assertCanAddTenant(agentId: string): Promise<PmLimits> {
  const limits = await getPmLimits(agentId);

  if (!limits.can_add_tenant) {
    const upgradeMsg = limits.has_pm_addon
      ? "Upgrade your PM add-on plan for more capacity."
      : "Add a Property Management plan to increase your limit.";
    throw new Error(
      `Tenant limit reached (${limits.current_tenants}/${limits.max_tenants}). ${upgradeMsg}`
    );
  }

  return limits;
}
