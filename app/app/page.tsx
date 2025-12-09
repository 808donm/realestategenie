import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function AppRoot() {
  const supabase = await supabaseServer();

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/signin");

  const { data: agent } = await supabase
    .from("agents")
    .select("landing_page")
    .eq("id", data.user.id)
    .single();

  const landing = agent?.landing_page ?? "dashboard";

  if (landing === "open-houses") redirect("/app/open-houses");
  redirect("/app/dashboard");
}
