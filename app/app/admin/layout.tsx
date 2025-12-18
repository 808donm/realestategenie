import { requireAdmin } from "@/lib/auth/admin-check";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch {
    redirect("/app");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 250,
          background: "#1f2937",
          color: "white",
          padding: "24px 0",
        }}
      >
        <div style={{ padding: "0 24px", marginBottom: 32 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
            ⚡ Admin Panel
          </h1>
          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            Real Estate Genie
          </p>
        </div>

        <nav>
          <NavLink href="/app/admin">📊 Overview</NavLink>
          <NavLink href="/app/admin/users">👥 Users</NavLink>
          <NavLink href="/app/admin/invitations">📧 Invitations</NavLink>
          <NavLink href="/app/admin/error-logs">🐛 Error Logs</NavLink>

          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.1)",
              margin: "16px 24px",
            }}
          />

          <NavLink href="/app">← Back to App</NavLink>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, background: "#f9fafb", padding: 24 }}>
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "12px 24px",
        color: "white",
        textDecoration: "none",
        fontSize: 14,
        fontWeight: 500,
        transition: "background 0.2s",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.1)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </Link>
  );
}
