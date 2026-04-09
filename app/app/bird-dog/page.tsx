import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { BirdDogPage } from "./bird-dog.client";

export const metadata = {
  title: "Bird Dog Prospecting | Real Estate Genie",
};

export default async function BirdDogServerPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <BirdDogPage />;
}
