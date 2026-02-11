import { requireAdmin } from "@/lib/auth/admin-check";
import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";
import UserManagementClient from "./user-management.client";

export default async function UsersManagementPage() {
  await requireAdmin();

  const supabase = await supabaseServer();

  //  Get all users
  const { data: users, error } = await supabase
    .from("agents")
    .select("id, email, display_name, is_admin, account_status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div>
        <h1>Error loading users</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>
          User Management
        </h1>
        <p style={{ color: "#6b7280", marginTop: 8 }}>
          Manage agent accounts and permissions
        </p>
      </div>

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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            All Users ({users?.length || 0})
          </h2>
          <Link
            href="/app/admin/invitations"
            style={{
              padding: "8px 16px",
              background: "#3b82f6",
              color: "white",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            + Invite User
          </Link>
        </div>

        <UserManagementClient users={users || []} />
      </div>
    </div>
  );
}
