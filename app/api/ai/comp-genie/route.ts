import { NextRequest, NextResponse } from "next/server";
import { analyzeComparables, type CompProperty } from "@/lib/ai/comp-genie";
import { isNonDisclosureState } from "@/lib/constants/non-disclosure-states";

/**
 * POST /api/ai/comp-genie
 *
 * Accepts pre-fetched property data and runs AI comparable analysis.
 * Designed to run once per search — the client sends the subject property
 * and the full search result pool as neighbors.
 *
 * Body: { subject: CompProperty, neighbors: CompProperty[], state: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, neighbors, state } = body as {
      subject: CompProperty;
      neighbors: CompProperty[];
      state: string;
    };

    if (!subject?.address) {
      return NextResponse.json(
        { success: false, error: "Subject property with address is required." },
        { status: 400 },
      );
    }

    if (!state || !isNonDisclosureState(state)) {
      return NextResponse.json(
        { success: false, error: `${state || "Unknown"} is a disclosure state — use standard comparables instead.` },
        { status: 400 },
      );
    }

    if (!neighbors?.length) {
      return NextResponse.json(
        { success: false, error: "No neighbor properties provided for comparison." },
        { status: 400 },
      );
    }

    const result = await analyzeComparables(subject, neighbors, state);

    return NextResponse.json({ success: true, compGenie: result });
  } catch (error: any) {
    console.error("[CompGenie] Analysis failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Comp Genie analysis failed." },
      { status: 500 },
    );
  }
}
