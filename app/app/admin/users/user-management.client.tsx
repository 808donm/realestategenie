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

type Plan = {
  id: string;
  name: string;
  slug: string;
  monthly_price: number;
  annual_price: number | null;
  tier_level: number;
};

type SubscriptionInfo = {
  planName: string;
  planId: string;
  status: string;
};

type Props = {
  users: User[];
  plans: Plan[];
  subscriptionMap: Record<string, SubscriptionInfo>;
};

export default function UserManagementClient({ users, plans, subscriptionMap }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [assigningUser, setAssigningUser] = useState<User | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

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

  async function assignPlan() {
    if (!assigningUser || !selectedPlanId) return;

    setLoading(assigningUser.id);
    setAssignError(null);
    setAssignSuccess(null);

    try {
      const response = await fetch(`/api/admin/subscriptions/${assigningUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: selectedPlanId,
          status: "active",
          billing_cycle: billingCycle,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign plan");
      }

      setAssignSuccess("Plan assigned successfully!");
      setTimeout(() => {
        setAssigningUser(null);
        setAssignSuccess(null);
        setSelectedPlanId("");
        setBillingCycle("monthly");
        router.refresh();
      }, 1500);
    } catch (error: any) {
      setAssignError(error.message || "Failed to assign plan");
    } finally {
      setLoading(null);
    }
  }

  function openAssignDialog(user: User) {
    const existing = subscriptionMap[user.id];
    setAssigningUser(user);
    setSelectedPlanId(existing?.planId || "");
    setBillingCycle("monthly");
    setAssignError(null);
    setAssignSuccess(null);
  }

  async function viewAsUser(userId: string) {
    setLoading(userId);
    try {
      const response = await fetch("/api/admin/impersonate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start impersonation");
      }

      router.push("/app/dashboard");
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Failed to view as user");
    } finally {
      setLoading(null);
    }
  }

  async function assignDemo(userId: string) {
    if (!confirm("Assign a free 30-day demo account to this user?")) {
      return;
    }

    setLoading(userId);
    try {
      const response = await fetch("/api/admin/users/assign-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign demo");
      }

      alert("Demo account assigned successfully (30-day trial)");
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Failed to assign demo account");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div style={{ overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <Th>User</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Plan</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const sub = subscriptionMap[user.id];
              return (
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
                    {sub ? (
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          background: "#ecfdf5",
                          color: "#065f46",
                        }}
                      >
                        {sub.planName}
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          background: "#fef3c7",
                          color: "#92400e",
                        }}
                      >
                        No Plan
                      </span>
                    )}
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
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <ActionButton
                        onClick={() => viewAsUser(user.id)}
                        disabled={loading === user.id}
                        color="#0891b2"
                      >
                        View as User
                      </ActionButton>
                      {!sub && (
                        <ActionButton
                          onClick={() => assignDemo(user.id)}
                          disabled={loading === user.id}
                          color="#f59e0b"
                        >
                          Assign Demo
                        </ActionButton>
                      )}
                      <ActionButton
                        onClick={() => openAssignDialog(user)}
                        disabled={loading === user.id}
                        color="#8b5cf6"
                      >
                        {sub ? "Change Plan" : "Assign Plan"}
                      </ActionButton>
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
              );
            })}
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

      {/* Plan Assignment Modal */}
      {assigningUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAssigningUser(null);
            }
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 32,
              width: "100%",
              maxWidth: 480,
              boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
            }}
          >
            <h3 style={{ margin: "0 0 4px 0", fontSize: 20, fontWeight: 700 }}>
              Assign Plan
            </h3>
            <p style={{ margin: "0 0 20px 0", color: "#6b7280", fontSize: 14 }}>
              {assigningUser.display_name || assigningUser.email}
            </p>

            {assignError && (
              <div
                style={{
                  padding: 12,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  color: "#991b1b",
                  fontSize: 14,
                  marginBottom: 16,
                }}
              >
                {assignError}
              </div>
            )}
            {assignSuccess && (
              <div
                style={{
                  padding: 12,
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: 8,
                  color: "#065f46",
                  fontSize: 14,
                  marginBottom: 16,
                }}
              >
                {assignSuccess}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 6,
                  color: "#374151",
                }}
              >
                Subscription Plan
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  fontSize: 14,
                  background: "white",
                }}
              >
                <option value="">Select a plan...</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - ${plan.monthly_price}/mo
                    {plan.annual_price ? ` or $${plan.annual_price}/yr` : ""}
                    {" "}(Tier {plan.tier_level})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 6,
                  color: "#374151",
                }}
              >
                Billing Cycle
              </label>
              <div style={{ display: "flex", gap: 12 }}>
                <label
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    border: billingCycle === "monthly" ? "2px solid #3b82f6" : "1px solid #d1d5db",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: billingCycle === "monthly" ? "#eff6ff" : "white",
                  }}
                >
                  <input
                    type="radio"
                    name="billing"
                    value="monthly"
                    checked={billingCycle === "monthly"}
                    onChange={() => setBillingCycle("monthly")}
                  />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Monthly</span>
                </label>
                <label
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    border: billingCycle === "annual" ? "2px solid #3b82f6" : "1px solid #d1d5db",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: billingCycle === "annual" ? "#eff6ff" : "white",
                  }}
                >
                  <input
                    type="radio"
                    name="billing"
                    value="annual"
                    checked={billingCycle === "annual"}
                    onChange={() => setBillingCycle("annual")}
                  />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Annual</span>
                </label>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setAssigningUser(null)}
                style={{
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "white",
                  color: "#374151",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={assignPlan}
                disabled={!selectedPlanId || loading === assigningUser.id}
                style={{
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "none",
                  background: !selectedPlanId ? "#9ca3af" : "#8b5cf6",
                  color: "white",
                  cursor: !selectedPlanId ? "not-allowed" : "pointer",
                  opacity: loading === assigningUser.id ? 0.6 : 1,
                }}
              >
                {loading === assigningUser.id ? "Assigning..." : "Assign Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
