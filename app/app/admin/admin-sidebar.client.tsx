"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminSidebar({ adminLevel = "global" }: { adminLevel?: string }) {
  const pathname = usePathname();
  const isGlobal = adminLevel === "global";

  return (
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
          {isGlobal ? "Global Admin" : "Admin"}
        </h1>
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Real Estate Genie</p>
      </div>

      <nav>
        <NavLink href="/app/admin" active={pathname === "/app/admin"}>
          Overview
        </NavLink>

        {/* Site Admin: account management */}
        <NavLink href="/app/team" active={pathname === "/app/team"}>
          Team Members
        </NavLink>
        <NavLink href="/app/billing" active={pathname === "/app/billing"}>
          Billing
        </NavLink>

        {/* Global Admin: platform management */}
        {isGlobal && (
          <>
            <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "16px 24px" }} />
            <div style={{ padding: "4px 24px", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, opacity: 0.5 }}>
              Platform
            </div>

            <NavLink href="/app/admin/users" active={pathname === "/app/admin/users"}>
              Users
            </NavLink>
            <NavLink href="/app/admin/access-requests" active={pathname === "/app/admin/access-requests"}>
              Access Requests
            </NavLink>
            <NavLink href="/app/admin/invitations" active={pathname === "/app/admin/invitations"}>
              Invitations
            </NavLink>

            <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "16px 24px" }} />
            <div style={{ padding: "4px 24px", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, opacity: 0.5 }}>
              Subscriptions
            </div>

            <NavLink href="/app/admin/plans" active={pathname?.startsWith("/app/admin/plans") ?? false}>
              Plans
            </NavLink>
            <NavLink href="/app/admin/subscriptions" active={pathname?.startsWith("/app/admin/subscriptions") ?? false}>
              Subscriptions
            </NavLink>
            <NavLink href="/app/admin/features" active={pathname === "/app/admin/features"}>
              Features
            </NavLink>
            <NavLink href="/app/admin/market-reports" active={pathname === "/app/admin/market-reports"}>
              Market Reports
            </NavLink>

            <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "16px 24px" }} />
            <div style={{ padding: "4px 24px", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, opacity: 0.5 }}>
              Diagnostics
            </div>

            <NavLink href="/app/admin/api-usage" active={pathname === "/app/admin/api-usage"}>
              API Usage
            </NavLink>
            <NavLink href="/app/admin/avm-statistics" active={pathname === "/app/admin/avm-statistics"}>
              AVM Statistics
            </NavLink>
            <NavLink href="/app/admin/error-logs" active={pathname === "/app/admin/error-logs"}>
              Error Logs
            </NavLink>
            <NavLink href="/app/admin/skip-trace-billing" active={pathname === "/app/admin/skip-trace-billing"}>
              Skip Trace Billing
            </NavLink>
          </>
        )}

        <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "16px 24px" }} />

        <NavLink href="/app" active={false}>
          Back to App
        </NavLink>
      </nav>
    </aside>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
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
        background: active ? "rgba(255,255,255,0.1)" : "transparent",
        borderLeft: active ? "3px solid #3b82f6" : "3px solid transparent",
      }}
      className="admin-nav-link"
    >
      {children}
      <style jsx>{`
        .admin-nav-link:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </Link>
  );
}
