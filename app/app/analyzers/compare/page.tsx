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
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>
          Compare Properties
        </h1>
        <p style={{ margin: 0, opacity: 0.7 }}>
          Compare multiple investment properties side by side to find the best deal
        </p>
      </div>

      <ComparePropertiesClient
        savedProperties={properties ?? []}
        savedComparisons={comparisons ?? []}
      />
    </div>
  );
}
