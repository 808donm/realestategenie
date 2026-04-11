import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { MarketMonitorPage } from "./market-monitor.client";

export const metadata = {
  title: "Market Monitor | Real Estate Genie",
};

export default async function MarketMonitorServerPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <MarketMonitorPage />;
}
