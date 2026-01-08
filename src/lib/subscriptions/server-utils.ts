// Server-side utilities for feature checking and subscription management

import { supabaseServer } from "@/lib/supabase/server";
import { hasFeatureAccess } from "./utils";

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
