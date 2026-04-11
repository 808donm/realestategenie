import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { MlsBlastPage } from "./mls-blast.client";

export const metadata = { title: "Email Blast | Real Estate Genie" };

export default async function MlsBlastServerPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <MlsBlastPage />;
}
