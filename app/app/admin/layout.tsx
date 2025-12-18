import { requireAdmin } from "@/lib/auth/admin-check";
import AdminSidebar from "./admin-sidebar.client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AdminSidebar />
      <main style={{ flex: 1, background: "#f9fafb", padding: 24 }}>
        {children}
      </main>
    </div>
  );
}
