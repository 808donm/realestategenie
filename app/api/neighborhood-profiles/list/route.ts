import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profiles, error } = await supabase
      .from("neighborhood_profiles")
      .select("*")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch profiles:", error);
      return NextResponse.json(
        { error: "Failed to fetch profiles" },
        { status: 500 }
      );
    }

    return NextResponse.json({ profiles });
  } catch (error: any) {
    console.error("Error fetching neighborhood profiles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
