import { getImpersonationState } from "@/lib/auth/impersonation";
import { createClient } from "@supabase/supabase-js";
import StopImpersonationButton from "./stop-impersonation-button";

export default async function ImpersonationBanner() {
  const state = await getImpersonationState();
  if (!state) return null;

  // Look up the target user's name/email for display
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const { data: target } = await admin
    .from("agents")
    .select("display_name, email")
    .eq("id", state.targetUserId)
    .single();

  const label = target?.display_name?.trim() || target?.email || state.targetUserId;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9999,
        background: "linear-gradient(90deg, #f59e0b, #d97706)",
        color: "#1c1917",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontSize: 14,
        fontWeight: 600,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <span>
        Viewing as <strong>{label}</strong> — Read-Only Mode
      </span>
      <StopImpersonationButton />
    </div>
  );
}
