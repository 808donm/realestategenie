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

export async function getEffectiveClient(): Promise<EffectiveClientResult> {
  const impersonation = await getImpersonationState();

  if (impersonation) {
    // Use service role client (bypasses RLS) with impersonated user's ID
    const { createClient } = await import("@supabase/supabase-js");
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    return {
      supabase: adminClient,
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
