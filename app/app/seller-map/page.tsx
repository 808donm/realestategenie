import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SellerMapClient } from "./seller-map.client";

export const metadata = {
  title: "Seller Opportunity Map | Real Estate Genie",
  description: "Geographic prospecting tool showing seller motivation scores, heat maps, and Hawaii TMK overlays",
};

export default async function SellerMapPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div>
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <div>
          <h1 className="text-lg md:text-2xl font-bold">Seller Opportunity Map</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1 hidden sm:block">
            Find likely sellers using equity, ownership, absentee, and distress signals
          </p>
        </div>
      </div>

      <SellerMapClient />
    </div>
  );
}
