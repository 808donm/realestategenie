"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  account_status: string;
  created_at: string;
};

export default function UserManagementClient({ users }: { users: User[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateUserStatus(userId: string, status: string) {
    if (!confirm(`Are you sure you want to ${status} this account?`)) {
      return;
    }

    setLoading(userId);
    try {
      const response = await fetch("/api/admin/users/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update status");
      }

      router.refresh();
    } catch (error: any) {
      alert(error.message || "Failed to update user status");
    } finally {
      setLoading(null);
    }
  }

  async function toggleAdmin(userId: string, currentIsAdmin: boolean) {
    const action = currentIsAdmin ? "remove admin access from" : "grant admin access to";
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    setLoading(userId);
    try {
      const response = await fetch("/api/admin/users/toggle-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isAdmin: !currentIsAdmin }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update admin status");
      }

      router.refresh();
    } catch (error: any) {
      alert(error.message || "Failed to update admin status");
    } finally {
      setLoading(null);
    }
  }

  async function deleteUser(userId: string, email: string) {
    const confirmation = prompt(
      `Are you sure you want to DELETE this user?\nType "${email}" to confirm:`
    );

    if (confirmation !== email) {
      return;
    }

    setLoading(userId);
    try {
      const response = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }

      router.refresh();
    } catch (error: any) {
      alert(error.message || "Failed to delete user");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f9fafb" }}>
            <Th>User</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              style={{ borderBottom: "1px solid #e5e7eb" }}
            >
              <Td>
                <div style={{ fontWeight: 600 }}>
                  {user.display_name || "No name"}
                </div>
              </Td>
              <Td>{user.email}</Td>
              <Td>
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    background: user.is_admin ? "#dbeafe" : "#f3f4f6",
                    color: user.is_admin ? "#1e40af" : "#6b7280",
                  }}
                >
                  {user.is_admin ? "Admin" : "Agent"}
                </span>
              </Td>
              <Td>
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    background:
                      user.account_status === "active"
                        ? "#d1fae5"
                        : user.account_status === "disabled"
                        ? "#fee2e2"
                        : "#fef3c7",
                    color:
                      user.account_status === "active"
                        ? "#065f46"
                        : user.account_status === "disabled"
                        ? "#991b1b"
                        : "#92400e",
                  }}
                >
                  {user.account_status}
                </span>
              </Td>
              <Td>
                {new Date(user.created_at).toLocaleDateString()}
              </Td>
              <Td>
                <div style={{ display: "flex", gap: 8 }}>
                  {user.account_status === "active" ? (
                    <ActionButton
                      onClick={() => updateUserStatus(user.id, "disabled")}
                      disabled={loading === user.id}
                      color="#ef4444"
                    >
                      Disable
                    </ActionButton>
                  ) : (
                    <ActionButton
                      onClick={() => updateUserStatus(user.id, "active")}
                      disabled={loading === user.id}
                      color="#10b981"
                    >
                      Enable
                    </ActionButton>
                  )}
                  <ActionButton
                    onClick={() => toggleAdmin(user.id, user.is_admin)}
                    disabled={loading === user.id}
                    color="#3b82f6"
                  >
                    {user.is_admin ? "Remove Admin" : "Make Admin"}
                  </ActionButton>
                  <ActionButton
                    onClick={() => deleteUser(user.id, user.email)}
                    disabled={loading === user.id}
                    color="#991b1b"
                  >
                    Delete
                  </ActionButton>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            color: "#6b7280",
          }}
        >
          No users found
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: "12px 24px",
        textAlign: "left",
        fontSize: 12,
        fontWeight: 600,
        color: "#6b7280",
        textTransform: "uppercase",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "16px 24px",
        fontSize: 14,
      }}
    >
      {children}
    </td>
  );
}

function ActionButton({
  onClick,
  disabled,
  color,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 6,
        border: "none",
        background: color,
        color: "white",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
