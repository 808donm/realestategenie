import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ComparePropertiesClient from "./compare-properties.client";

export default async function ComparePropertiesPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/signin");
  }

  // Load all saved properties
  const { data: properties } = await supabase
    .from("investment_properties")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // Load saved comparisons
  const { data: comparisons } = await supabase
    .from("property_comparisons")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div style={{ maxWidth: 1400 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>
            Compare Properties
          </h1>
          <p style={{ margin: 0, opacity: 0.7 }}>
            Compare multiple investment properties side by side to find the best deal
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href="/app/analyzers/investment"
            style={{
              padding: "10px 16px",
              border: "1px solid #ddd",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Investment Analyzer
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

      <ComparePropertiesClient
        savedProperties={properties ?? []}
        savedComparisons={comparisons ?? []}
      />
    </div>
  );
}
