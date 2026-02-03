import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import BRRRAnalyzerClient from "./brrr-analyzer.client";

export default async function BRRRAnalyzerPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/signin");
  }

  // Fetch saved BRRR analyses
  const { data: savedAnalyses } = await supabase
    .from("brrr_analyses")
    .select("*")
    .eq("agent_id", userData.user.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/app/analyzers"
          style={{ fontSize: 14, opacity: 0.7, textDecoration: "none" }}
        >
          ← Back to Analyzers
        </Link>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>
        BRRR Strategy Analyzer
      </h1>
      <p style={{ margin: "0 0 8px 0", opacity: 0.7 }}>
        <strong>B</strong>uy, <strong>R</strong>enovate, <strong>R</strong>efinance, <strong>R</strong>ent
      </p>
      <p style={{ margin: "0 0 24px 0", opacity: 0.6, fontSize: 14 }}>
        Analyze deals to maximize cash-out refinance and achieve infinite returns on rental properties.
        Supports multi-family and apartment buildings.
      </p>

      <BRRRAnalyzerClient savedAnalyses={savedAnalyses || []} />
    </div>
  );
}
