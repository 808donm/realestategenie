import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ApiUsageDashboard } from "./api-usage.client";

export const metadata = {
  title: "API Usage Report | Admin | Real Estate Genie",
};

export default async function ApiUsagePage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: agent } = await supabase
    .from("agents")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!agent?.is_admin) redirect("/app/dashboard");

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>API Usage Report</h1>
      <p style={{ color: "#6b7280", marginBottom: 20 }}>
        Track external API calls and project costs at scale
      </p>
      <ApiUsageDashboard />
    </div>
  );
}
