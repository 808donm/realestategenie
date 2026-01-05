import { requireAdmin } from "@/lib/auth/admin-check";
import { supabaseServer } from "@/lib/supabase/server";
import InvitationsClient from "./invitations.client";

export default async function InvitationsPage() {
  const { user } = await requireAdmin();
  const supabase = await supabaseServer();

  // Get all invitations
  const { data: rawInvitations } = await supabase
    .from("user_invitations")
    .select(`
      id,
      email,
      status,
      expires_at,
      created_at,
      invited_by:agents!user_invitations_invited_by_fkey(display_name)
    `)
    .order("created_at", { ascending: false });

  // Transform to expected type (Supabase returns relations as arrays)
  const invitations = (rawInvitations || []).map((inv: any) => ({
    ...inv,
    invited_by: inv.invited_by?.[0] || null,
  }));

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>
          User Invitations
        </h1>
        <p style={{ color: "#6b7280", marginTop: 8 }}>
          Invite new agents to join Real Estate Genie
        </p>
      </div>

      <InvitationsClient invitations={invitations} adminId={user.id} />
    </div>
  );
}
