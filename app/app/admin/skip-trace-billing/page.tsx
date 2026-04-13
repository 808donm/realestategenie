import { requireAdmin } from "@/lib/auth/admin-check";
import { getAllSkipTraceUsage } from "@/lib/billing/skip-trace-billing";
import SkipTraceBillingClient from "./skip-trace-billing.client";

export const metadata = { title: "Skip Trace Billing | Admin | Real Estate Genie" };

export default async function SkipTraceBillingPage() {
  await requireAdmin("global");

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const usage = await getAllSkipTraceUsage(currentMonth);

  return <SkipTraceBillingClient initialUsage={usage} currentMonth={currentMonth} />;
}
