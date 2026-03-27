import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { DomProspectingClient } from "./dom-prospecting.client";

export const metadata = {
  title: "DOM Prospecting | Real Estate Genie",
  description:
    "Identify stale listings exceeding average days on market — find agent-switching opportunities before they expire",
};

export default async function DomProspectingPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div>
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <div>
          <h1 className="text-lg md:text-2xl font-bold">DOM Prospecting</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1 hidden sm:block">
            Identify stale listings exceeding average days on market — target agent-switching opportunities
          </p>
        </div>
        <a
          href="/app/seller-map"
          style={{
            padding: "6px 14px",
            background: "#f3f4f6",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
            color: "#374151",
          }}
        >
          Seller Map
        </a>
      </div>

      <DomProspectingClient />
    </div>
  );
}
