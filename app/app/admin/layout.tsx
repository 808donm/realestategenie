import { requireAdmin } from "@/lib/auth/admin-check";
import AdminSidebar from "./admin-sidebar.client";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { adminLevel } = await requireAdmin("admin");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AdminSidebar adminLevel={adminLevel} />
      <main style={{ flex: 1, background: "hsl(var(--muted))", padding: 24 }}>{children}</main>
    </div>
  );
}
