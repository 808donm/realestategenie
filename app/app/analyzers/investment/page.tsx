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
            href="/app/analyzers/1031"
            style={{
              padding: "6px 12px",
              fontSize: 12,
              background: "#f5f5f5",
              borderRadius: 4,
              textDecoration: "none",
              color: "#333",
            }}
          >
            1031
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
          Investment Property Analyzer
        </h1>
        <p style={{ margin: 0, opacity: 0.7 }}>
          Calculate ROI, Cap Rate, IRR, and Cash-on-Cash returns
        </p>
      </div>

      <InvestmentAnalyzerClient savedProperties={properties ?? []} />
    </div>
  );
}
