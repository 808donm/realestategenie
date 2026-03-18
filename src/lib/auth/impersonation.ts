/**
 * Admin Impersonation Utilities
 *
 * Allows admins to "View as User" by storing the target user ID in a cookie.
 * When active, data queries use the service role client (bypassing RLS)
 * and manually filter by the impersonated user's agent_id.
 */

import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";

const COOKIE_NAME = "impersonating_user";
const MAX_AGE_SECONDS = 3600; // 1 hour

type ImpersonationPayload = {
  userId: string;
  adminId: string;
  startedAt: number;
};

/**
 * Start impersonating a user. Sets the impersonation cookie.
 * Caller must already be verified as admin.
 */
export async function startImpersonation(
  adminId: string,
  targetUserId: string
) {
  const cookieStore = await cookies();
  const payload: ImpersonationPayload = {
    userId: targetUserId,
    adminId,
    startedAt: Date.now(),
  };

  cookieStore.set(COOKIE_NAME, JSON.stringify(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

/**
 * Stop impersonating. Clears the cookie.
 */
export async function stopImpersonation() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get the current impersonation state.
 * Re-validates that the real user is still an admin.
 * Returns null if not impersonating or if validation fails.
 */
export async function getImpersonationState(): Promise<{
  isImpersonating: true;
  targetUserId: string;
  adminId: string;
} | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;

  if (!raw) return null;

  let payload: ImpersonationPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    // Invalid cookie — clear it
    cookieStore.delete(COOKIE_NAME);
    return null;
  }

  // Check TTL
  const elapsed = Date.now() - payload.startedAt;
  if (elapsed > MAX_AGE_SECONDS * 1000) {
    cookieStore.delete(COOKIE_NAME);
    return null;
  }

  // Re-verify the real user is still an admin
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== payload.adminId) {
    cookieStore.delete(COOKIE_NAME);
    return null;
  }

  // Check admin status via service role to bypass RLS
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: agent } = await admin
    .from("agents")
    .select("is_admin, account_status")
    .eq("id", user.id)
    .single();

  if (!agent?.is_admin || agent.account_status !== "active") {
    cookieStore.delete(COOKIE_NAME);
    return null;
  }

  return {
    isImpersonating: true,
    targetUserId: payload.userId,
    adminId: payload.adminId,
  };
}
