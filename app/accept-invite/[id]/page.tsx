import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import AcceptInviteClient from "./accept-invite.client";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export default async function AcceptInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) {
    return (
      <div style={{ maxWidth: 500, margin: "100px auto", padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#ef4444" }}>
          Invalid Invitation Link
        </h1>
        <p style={{ color: "#6b7280", marginTop: 8 }}>
          The invitation link is missing required information.
        </p>
      </div>
    );
  }

  // Verify invitation
  const { data: invitation, error } = await admin
    .from("user_invitations")
    .select("id, email, token, status, expires_at")
    .eq("id", id)
    .single();

  if (error || !invitation) {
    return (
      <div style={{ maxWidth: 500, margin: "100px auto", padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#ef4444" }}>
          Invitation Not Found
        </h1>
        <p style={{ color: "#6b7280", marginTop: 8 }}>
          This invitation link is invalid or has been removed.
        </p>
      </div>
    );
  }

  // Verify token matches
  if (invitation.token !== token) {
    return (
      <div style={{ maxWidth: 500, margin: "100px auto", padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#ef4444" }}>
          Invalid Token
        </h1>
        <p style={{ color: "#6b7280", marginTop: 8 }}>
          This invitation link is invalid.
        </p>
      </div>
    );
  }

  // Check if invitation has expired
  if (new Date(invitation.expires_at) < new Date()) {
    await admin
      .from("user_invitations")
      .update({ status: "expired" })
      .eq("id", id);

    return (
      <div style={{ maxWidth: 500, margin: "100px auto", padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>
          Invitation Expired
        </h1>
        <p style={{ color: "#6b7280", marginTop: 8 }}>
          This invitation has expired. Please contact an administrator for a new invitation.
        </p>
      </div>
    );
  }

  // Check if already accepted
  if (invitation.status === "accepted") {
    return redirect("/login");
  }

  return <AcceptInviteClient email={invitation.email} invitationId={id} />;
}
