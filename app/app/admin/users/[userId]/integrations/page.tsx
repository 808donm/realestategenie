import { requireAdmin } from "@/lib/auth/admin-check";
import { getDirectDb } from "@/lib/supabase/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminTrestleForm from "./trestle-form.client";

export default async function UserIntegrationsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdmin().catch(() => redirect("/app/admin"));

  const { userId } = await params;
  const sql = getDirectDb();

  const [userRows, integrationRows] = await Promise.all([
    sql<{ display_name: string | null; email: string }[]>`
      SELECT a.display_name, au.email
      FROM agents a
      JOIN auth.users au ON au.id = a.id
      WHERE a.id = ${userId}
      LIMIT 1
    `,
    sql<{ status: "connected" | "disconnected" | "error"; config: any }[]>`
      SELECT status, config FROM integrations
      WHERE agent_id = ${userId} AND provider = 'trestle'
      LIMIT 1
    `,
  ]);

  if (!userRows[0]) redirect("/app/admin/users");

  const user = userRows[0];
  const trestle = integrationRows[0] ?? null;
  const isConnected = trestle?.status === "connected";
  const config = trestle?.config
    ? typeof trestle.config === "string"
      ? JSON.parse(trestle.config)
      : trestle.config
    : null;

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/app/admin/users" style={{ fontSize: 14, color: "#6b7280" }}>
          ← Back to Users
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 4px" }}>
          {user.display_name || user.email} — Integrations
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14 }}>{user.email}</p>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Trestle MLS</h2>
        <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>
          Connect this user's Trestle (Cotality) account for MLS property data access.
          Each agent account should have its own independent connection.
        </p>
        <AdminTrestleForm
          userId={userId}
          storedConfig={isConnected ? config : null}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
}
