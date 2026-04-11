import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import MlsLeaderboardClient from "./mls-leaderboard.client";

export const metadata = { title: "MLS Agent Leaderboard | Real Estate Genie" };

export default async function MlsLeaderboardPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <MlsLeaderboardClient />;
}
