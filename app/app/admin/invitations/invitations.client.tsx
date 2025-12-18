"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Invitation = {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
  invited_by: { display_name: string } | null;
};

export default function InvitationsClient({
  invitations,
  adminId,
}: {
  invitations: Invitation[];
  adminId: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  async function sendInvitation(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/invitations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create invitation");
      }

      const data = await response.json();

      if (data.emailSent) {
        alert(`✅ Invitation email sent to ${email}\n\nThe recipient will receive an email with instructions to join.`);
      } else if (data.warning) {
        alert(`⚠️ ${data.warning}\n\nInvitation link:\n${data.inviteUrl}`);
      } else {
        alert(`Invitation created for ${email}\n\nInvitation link:\n${data.inviteUrl}`);
      }

      setEmail("");
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  }

  async function copyInviteLink(invitationId: string) {
    setCopyingId(invitationId);
    const inviteUrl = `${window.location.origin}/accept-invite/${invitationId}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert("Invitation link copied to clipboard!");
    } catch {
      alert(`Invitation link:\n${inviteUrl}`);
    } finally {
      setCopyingId(null);
    }
  }

  const pendingInvites = invitations.filter((i) => i.status === "pending");
  const otherInvites = invitations.filter((i) => i.status !== "pending");

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Create Invitation Form */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 24,
          border: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px 0" }}>
          Send New Invitation
        </h2>
        <form onSubmit={sendInvitation} style={{ display: "flex", gap: 12 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
            required
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 24px",
              background: "#3b82f6",
              color: "white",
              borderRadius: 8,
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "Sending..." : "Send Invitation"}
          </button>
        </form>
      </div>

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              Pending Invitations ({pendingInvites.length})
            </h2>
          </div>
          <InvitationTable
            invitations={pendingInvites}
            onCopyLink={copyInviteLink}
            copyingId={copyingId}
          />
        </div>
      )}

      {/* Past Invitations */}
      {otherInvites.length > 0 && (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              Past Invitations ({otherInvites.length})
            </h2>
          </div>
          <InvitationTable
            invitations={otherInvites}
            onCopyLink={copyInviteLink}
            copyingId={copyingId}
          />
        </div>
      )}
    </div>
  );
}

function InvitationTable({
  invitations,
  onCopyLink,
  copyingId,
}: {
  invitations: Invitation[];
  onCopyLink: (id: string) => void;
  copyingId: string | null;
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "#f9fafb" }}>
          <th style={{ padding: "12px 24px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
            EMAIL
          </th>
          <th style={{ padding: "12px 24px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
            STATUS
          </th>
          <th style={{ padding: "12px 24px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
            INVITED BY
          </th>
          <th style={{ padding: "12px 24px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
            EXPIRES
          </th>
          <th style={{ padding: "12px 24px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
            ACTIONS
          </th>
        </tr>
      </thead>
      <tbody>
        {invitations.map((inv) => (
          <tr key={inv.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
            <td style={{ padding: "16px 24px", fontSize: 14 }}>
              {inv.email}
            </td>
            <td style={{ padding: "16px 24px" }}>
              <StatusBadge status={inv.status} />
            </td>
            <td style={{ padding: "16px 24px", fontSize: 14, color: "#6b7280" }}>
              {inv.invited_by?.display_name || "Unknown"}
            </td>
            <td style={{ padding: "16px 24px", fontSize: 14, color: "#6b7280" }}>
              {new Date(inv.expires_at).toLocaleDateString()}
            </td>
            <td style={{ padding: "16px 24px" }}>
              {inv.status === "pending" && (
                <button
                  onClick={() => onCopyLink(inv.id)}
                  disabled={copyingId === inv.id}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: "none",
                    background: "#3b82f6",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  {copyingId === inv.id ? "Copying..." : "Copy Link"}
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    pending: { bg: "#fef3c7", text: "#92400e" },
    accepted: { bg: "#d1fae5", text: "#065f46" },
    expired: { bg: "#fee2e2", text: "#991b1b" },
    cancelled: { bg: "#f3f4f6", text: "#6b7280" },
  };

  const color = colors[status as keyof typeof colors] || colors.pending;

  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
        background: color.bg,
        color: color.text,
      }}
    >
      {status}
    </span>
  );
}
