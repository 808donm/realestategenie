import { requireAdmin } from "@/lib/auth/admin-check";
import { AvmStatisticsDashboard } from "./avm-statistics.client";

export const metadata = {
  title: "AVM Statistics | Admin | Real Estate Genie",
};

export default async function AvmStatisticsPage() {
  await requireAdmin("global");

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>AVM Statistics</h1>
      <p style={{ color: "#6b7280", marginBottom: 20 }}>
        Genie AVM accuracy tracking, comp cache health, and valuation performance by area
      </p>
      <AvmStatisticsDashboard />
    </div>
  );
}
