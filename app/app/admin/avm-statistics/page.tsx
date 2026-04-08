import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { AvmStatisticsDashboard } from "./avm-statistics.client";

export const metadata = {
  title: "AVM Statistics | Admin | Real Estate Genie",
};

export default async function AvmStatisticsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: agent } = await supabase.from("agents").select("is_admin").eq("id", user.id).single();

  if (!agent?.is_admin) redirect("/app/dashboard");

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
