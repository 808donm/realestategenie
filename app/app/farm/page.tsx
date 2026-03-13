import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FarmClient from "./farm.client";

export default async function FarmPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  // Check Trestle connection
  const { data: integration } = await supabase
    .from("integrations")
    .select("status")
    .eq("agent_id", data.user.id)
    .eq("provider", "trestle")
    .maybeSingle();

  const trestleConnected = integration?.status === "connected";

  return <FarmClient trestleConnected={trestleConnected} />;
}
