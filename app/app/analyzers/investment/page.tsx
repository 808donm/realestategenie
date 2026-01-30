import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import InvestmentAnalyzerClient from "./investment-analyzer.client";

export default async function InvestmentAnalyzerPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/signin");
  }

  // Load saved properties
  const { data: properties } = await supabase
    .from("investment_properties")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>
            Investment Property Analyzer
          </h1>
          <p style={{ margin: 0, opacity: 0.7 }}>
            Calculate ROI, Cap Rate, IRR, and Cash-on-Cash returns
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href="/app/analyzers/compare"
            style={{
              padding: "10px 16px",
              border: "1px solid #ddd",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Compare Properties
          </Link>
          <Link
            href="/app/analyzers/1031"
            style={{
              padding: "10px 16px",
              border: "1px solid #ddd",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            1031 Exchange
          </Link>
        </div>
      </div>

      <InvestmentAnalyzerClient savedProperties={properties ?? []} />
    </div>
  );
}
