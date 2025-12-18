/**
 * Admin Authorization Utilities
 * Check if a user has admin privileges
 */

import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Check if user is an admin with active account
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("is_admin, account_status")
    .eq("id", user.id)
    .single();

  if (agentError || !agent) {
    redirect("/app");
  }

  if (!agent.is_admin) {
    redirect("/app");
  }

  if (agent.account_status !== "active") {
    redirect("/app");
  }

  return { user, agent };
}

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await supabaseServer();

  const { data: agent } = await supabase
    .from("agents")
    .select("is_admin, account_status")
    .eq("id", userId)
    .single();

  return !!(agent?.is_admin && agent.account_status === "active");
}
