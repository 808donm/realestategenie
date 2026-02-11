import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Exchange1031Client from "./exchange-1031.client";

export default async function Exchange1031Page() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/signin");
  }

  // Load saved exchanges
  const { data: exchanges } = await supabase
    .from("exchange_1031")
    .select("*")
    .order("created_at", { ascending: false });

  // Load investment properties for replacement selection
  const { data: properties } = await supabase
    .from("investment_properties")
    .select("id, name, address, purchase_price")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Navigation Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Link
          href="/app/analyzers"
          style={{ fontSize: 14, opacity: 0.7, textDecoration: "none" }}
        >
          ← Back to Analyzers
        </Link>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href="/app/analyzers/investment"
            style={{
              padding: "6px 12px",
              fontSize: 12,
              background: "#f5f5f5",
              borderRadius: 4,
              textDecoration: "none",
              color: "#333",
            }}
          >
            Investment
          </Link>
          <Link
            href="/app/analyzers/brrr"
            style={{
              padding: "6px 12px",
              fontSize: 12,
              background: "#f5f5f5",
              borderRadius: 4,
              textDecoration: "none",
              color: "#333",
            }}
          >
            BRRR
          </Link>
          <Link
            href="/app/analyzers/flip"
            style={{
              padding: "6px 12px",
              fontSize: 12,
              background: "#f5f5f5",
              borderRadius: 4,
              textDecoration: "none",
              color: "#333",
            }}
          >
            Flip
          </Link>
          <Link
            href="/app/analyzers/compare"
            style={{
              padding: "6px 12px",
              fontSize: 12,
              background: "#f5f5f5",
              borderRadius: 4,
              textDecoration: "none",
              color: "#333",
            }}
          >
            Compare
          </Link>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>
          1031 Exchange Analyzer
        </h1>
        <p style={{ margin: 0, opacity: 0.7 }}>
          Track deadlines, calculate tax savings, and compare replacement properties
        </p>
      </div>

      <Exchange1031Client
        savedExchanges={exchanges ?? []}
        investmentProperties={properties ?? []}
      />
    </div>
  );
}
