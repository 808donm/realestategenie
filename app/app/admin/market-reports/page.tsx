import { requireAdmin } from "@/lib/auth/admin-check";
import { supabaseAdmin } from "@/lib/supabase/admin";
import MarketReportsManager from "./market-reports-manager.client";

export default async function AdminMarketReportsPage() {
  await requireAdmin();

  const { data: configs } = await supabaseAdmin
    .from("market_report_configs")
    .select("*")
    .order("mls_id")
    .order("display_order");

  return <MarketReportsManager initialConfigs={configs || []} />;
}
