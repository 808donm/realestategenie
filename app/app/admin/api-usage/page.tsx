import { requireAdmin } from "@/lib/auth/admin-check";
import { ApiUsageDashboard } from "./api-usage.client";

export const metadata = {
  title: "API Usage Report | Admin | Real Estate Genie",
};

export default async function ApiUsagePage() {
  await requireAdmin("global");

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>API Usage Report</h1>
      <p style={{ color: "hsl(var(--muted-foreground))", marginBottom: 20 }}>Track external API calls and project costs at scale</p>
      <ApiUsageDashboard />
    </div>
  );
}
