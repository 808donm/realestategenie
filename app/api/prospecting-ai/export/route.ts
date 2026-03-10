import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Export prospect data as CSV.
 * PDF generation happens client-side via jsPDF (consistent with existing analyzers).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { prospects, mode, zipCode, agentName } = body as {
      prospects: {
        address: string;
        ownerName?: string;
        score?: number;
        tier?: string;
        reasoning?: string;
        suggestedApproach?: string;
        avmValue?: number;
        equityAmount?: number;
        mortgageAmount?: number;
        yearsOwned?: number;
        mailingAddress?: string;
      }[];
      mode: string;
      zipCode: string;
      agentName?: string;
    };

    if (!prospects?.length) {
      return NextResponse.json({ error: "prospects[] is required" }, { status: 400 });
    }

    // Build CSV
    const headers = [
      "Rank", "Address", "Owner", "AI Score", "Tier", "AVM Value",
      "Equity", "Mortgage", "Years Owned", "Mailing Address",
      "AI Reasoning", "Suggested Approach",
    ];

    const rows = prospects.map((p, i) => [
      i + 1,
      csvEscape(p.address),
      csvEscape(p.ownerName || ""),
      p.score ?? "",
      p.tier || "",
      p.avmValue ? `$${p.avmValue.toLocaleString()}` : "",
      p.equityAmount ? `$${p.equityAmount.toLocaleString()}` : "",
      p.mortgageAmount ? `$${p.mortgageAmount.toLocaleString()}` : "",
      p.yearsOwned ?? "",
      csvEscape(p.mailingAddress || ""),
      csvEscape(p.reasoning || ""),
      csvEscape(p.suggestedApproach || ""),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const filename = `REG_Prospects_${mode}_${zipCode}_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    console.error("[prospecting-ai/export]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 }
    );
  }
}

function csvEscape(val: string): string {
  if (!val) return "";
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
