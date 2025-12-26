import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { credit_score, credit_check_result } = body;

    // Update application with credit check info
    const { data, error } = await supabase
      .from("pm_applications")
      .update({
        credit_score: credit_score,
        credit_check_result: credit_check_result,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("agent_id", userData.user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating credit check:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in credit check route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
