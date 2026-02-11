import { requireAdmin } from "@/lib/auth/admin-check";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import EditPlanForm from "./edit-plan-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPlanPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  // Get plan details
  const { data: plan } = await supabaseAdmin
    .from("subscription_plans")
    .select("*")
    .eq("id", id)
    .single();

  if (!plan) {
    redirect("/app/admin/plans");
  }

  // Get subscriber count
  const { count: subscriberCount } = await supabaseAdmin
    .from("agent_subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("subscription_plan_id", id)
    .eq("status", "active");

  return <EditPlanForm plan={plan} subscriberCount={subscriberCount || 0} />;
}
