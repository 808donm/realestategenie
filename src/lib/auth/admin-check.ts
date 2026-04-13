/**
 * Admin Authorization Utilities
 *
 * Two admin tiers:
 *   "admin"  = Site/account admin (manages their brokerage)
 *   "global" = Global platform admin (full access + impersonation)
 */

import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AdminLevel = "none" | "admin" | "global";

/**
 * Require minimum admin level to access a page.
 * "admin" = site admin OR global admin can access
 * "global" = only global admin can access
 */
export async function requireAdmin(minLevel: "admin" | "global" = "admin") {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("is_admin, admin_level, account_status")
    .eq("id", user.id)
    .single();

  if (agentError || !agent) {
    redirect("/app");
  }

  if (agent.account_status !== "active") {
    redirect("/app");
  }

  // Check admin level (fall back to is_admin for backward compatibility)
  const level: AdminLevel = agent.admin_level || (agent.is_admin ? "global" : "none");

  if (level === "none") {
    redirect("/app");
  }

  if (minLevel === "global" && level !== "global") {
    redirect("/app/admin"); // Site admin trying to access global page -> redirect to admin home
  }

  return { user, agent, adminLevel: level };
}

/**
 * Get admin level for a user without redirecting.
 */
export async function getAdminLevel(userId: string): Promise<AdminLevel> {
  const supabase = await supabaseServer();

  const { data: agent } = await supabase
    .from("agents")
    .select("is_admin, admin_level, account_status")
    .eq("id", userId)
    .single();

  if (!agent || agent.account_status !== "active") return "none";

  return (agent.admin_level as AdminLevel) || (agent.is_admin ? "global" : "none");
}

/**
 * Backward-compatible check: returns true if user has any admin access.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const level = await getAdminLevel(userId);
  return level !== "none";
}
