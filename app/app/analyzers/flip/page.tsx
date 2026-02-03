import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import FlipAnalyzerClient from "./flip-analyzer.client";

export default async function FlipAnalyzerPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/signin");
  }

  // Fetch saved flip analyses
  const { data: savedAnalyses } = await supabase
    .from("flip_analyses")
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
        House Flip Analyzer
      </h1>
      <p style={{ margin: "0 0 8px 0", opacity: 0.7 }}>
        Fix &amp; Flip Investment Calculator
      </p>
      <p style={{ margin: "0 0 24px 0", opacity: 0.6, fontSize: 14 }}>
        Analyze fix-and-flip deals with the 70% rule, calculate ROI, and estimate profits.
        Includes financing options and holding cost projections.
      </p>

      <FlipAnalyzerClient savedAnalyses={savedAnalyses || []} />
    </div>
  );
}
