import { requireAdmin } from "@/lib/auth/admin-check";
import { getDirectDb } from "@/lib/supabase/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminTrestleForm from "./trestle-form.client";

const MLS_PROVIDERS = [
  {
    provider: "trestle",
    name: "Trestle by Cotality",
    description:
      "CoreLogic MLS aggregator — covers HiCentral, Maui MLS, Hawaii Information Service (Big Island/Kauai), and 700+ MLSs nationwide.",
  },
  {
    provider: "bridge",
    name: "Bridge Interactive (Zillow)",
    description: "Zillow's RESO-compliant MLS data platform.",
  },
  {
    provider: "idx_broker",
    name: "IDX Broker",
    description: "IDX Broker MLS data feed.",
  },
] as const;

type IntegrationRow = {
  provider: string;
  status: "connected" | "disconnected" | "error";
  config: any;
};

export default async function UserIntegrationsPage({ params }: { params: Promise<{ userId: string }> }) {
  await requireAdmin("global").catch(() => redirect("/app/admin"));

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
    sql<IntegrationRow[]>`
      SELECT provider, status, config FROM integrations
      WHERE agent_id = ${userId}
        AND provider IN ('trestle', 'bridge', 'idx_broker')
    `,
  ]);

  if (!userRows[0]) redirect("/app/admin/users");

  const user = userRows[0];
  const integrationMap = Object.fromEntries(integrationRows.map((r) => [r.provider, r]));

  return (
    <div style={{ maxWidth: 760, margin: "40px auto", padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/app/admin/users" style={{ fontSize: 14, color: "hsl(var(--muted-foreground))" }}>
          ← Back to Users
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 4px" }}>
          {user.display_name || user.email} — MLS Integrations
        </h1>
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 14 }}>{user.email}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {MLS_PROVIDERS.map(({ provider, name, description }) => {
          const row = integrationMap[provider];
          const isConnected = row?.status === "connected";
          const config = row?.config ? (typeof row.config === "string" ? JSON.parse(row.config) : row.config) : null;

          return (
            <div key={provider} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{name}</h2>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: isConnected ? "#d1fae5" : "hsl(var(--muted))",
                    color: isConnected ? "#065f46" : "#6b7280",
                  }}
                >
                  {isConnected ? "Connected" : "Not Connected"}
                </span>
              </div>
              <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", marginBottom: 20 }}>{description}</p>

              {provider === "trestle" ? (
                <AdminTrestleForm
                  userId={userId}
                  storedConfig={isConnected ? config : null}
                  isConnected={isConnected}
                />
              ) : (
                <div style={{ padding: 16, background: "hsl(var(--muted))", borderRadius: 8, fontSize: 14, color: "hsl(var(--muted-foreground))" }}>
                  {name} connection management coming soon.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
