"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminSidebar() {
  const pathname = usePathname();

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
          ⚡ Admin Panel
        </h1>
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
          Real Estate Genie
        </p>
      </div>

      <nav>
        <NavLink href="/app/admin" active={pathname === "/app/admin"}>
          📊 Overview
        </NavLink>
        <NavLink href="/app/admin/users" active={pathname === "/app/admin/users"}>
          👥 Users
        </NavLink>
        <NavLink href="/app/admin/access-requests" active={pathname === "/app/admin/access-requests"}>
          📋 Access Requests
        </NavLink>
        <NavLink href="/app/admin/invitations" active={pathname === "/app/admin/invitations"}>
          📧 Invitations
        </NavLink>
        <NavLink href="/app/admin/error-logs" active={pathname === "/app/admin/error-logs"}>
          🐛 Error Logs
        </NavLink>

        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.1)",
            margin: "16px 24px",
          }}
        />

        <NavLink href="/app" active={false}>
          ← Back to App
        </NavLink>
      </nav>
    </aside>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
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
