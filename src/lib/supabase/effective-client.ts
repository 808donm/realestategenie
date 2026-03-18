/**
 * Effective Supabase Client
 *
 * Returns the appropriate Supabase client and user ID based on
 * whether admin impersonation is active.
 *
 * - Normal mode: returns supabaseServer() + auth user ID (RLS active)
 * - Impersonation mode: returns supabaseAdmin (service role, bypasses RLS)
 *   + impersonated user ID. Pages must manually filter by this userId.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { getImpersonationState } from "@/lib/auth/impersonation";

type EffectiveClientResult = {
  supabase: SupabaseClient;
  userId: string;
  isImpersonating: boolean;
};

function createAdminClient(): SupabaseClient {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function getEffectiveClient(): Promise<EffectiveClientResult> {
  const impersonation = await getImpersonationState();

  if (impersonation) {
    // Use service role client (bypasses RLS) with impersonated user's ID
    return {
      supabase: createAdminClient(),
      userId: impersonation.targetUserId,
      isImpersonating: true,
    };
  }

  // Normal mode — use authenticated client
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return {
    supabase,
    userId: user.id,
    isImpersonating: false,
  };
}

/**
 * Verify access to an open house event, with admin fallback.
 *
 * When a non-impersonating user can't find the event (RLS blocks it),
 * this checks if they're an admin and escalates to a service role client.
 *
 * Returns the verified supabase client (possibly escalated) and event data.
 */
export async function getEventWithAdminFallback(
  supabase: SupabaseClient,
  userId: string,
  isImpersonating: boolean,
  eventId: string,
  selectColumns: string = "agent_id"
): Promise<{
  supabase: SupabaseClient;
  event: any;
  isElevated: boolean;
} | { error: string; status: number }> {
  const { data: event, error: fetchError } = await supabase
    .from("open_house_events")
    .select(selectColumns)
    .eq("id", eventId)
    .single();

  if (!fetchError && event) {
    // Event found — check ownership (skip for impersonating admins)
    if (!isImpersonating && (event as any).agent_id !== userId) {
      return { error: "Forbidden", status: 403 };
    }
    return { supabase, event, isElevated: isImpersonating };
  }

  // Event not found — could be RLS blocking an admin's access
  if (!isImpersonating) {
    const { isAdmin } = await import("@/lib/auth/admin-check");
    const userIsAdmin = await isAdmin(userId);

    if (userIsAdmin) {
      const adminClient = createAdminClient();
      const { data: adminEvent, error: adminFetchError } = await adminClient
        .from("open_house_events")
        .select(selectColumns)
        .eq("id", eventId)
        .single();

      if (!adminFetchError && adminEvent) {
        return { supabase: adminClient, event: adminEvent, isElevated: true };
      }
    }
  }

  return { error: "Open house not found", status: 404 };
}
