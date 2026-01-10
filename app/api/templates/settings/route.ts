import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from("flyer_template_settings")
      .select("*")
      .eq("agent_id", userData.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error
      throw error;
    }

    return NextResponse.json({ settings: settings || null });
  } catch (error: any) {
    console.error("Error fetching template settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await request.json();

    // Check if settings already exist
    const { data: existing } = await supabase
      .from("flyer_template_settings")
      .select("id")
      .eq("agent_id", userData.user.id)
      .single();

    let result;

    if (existing) {
      // Update existing settings
      result = await supabase
        .from("flyer_template_settings")
        .update({
          ...settings,
          agent_id: userData.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("agent_id", userData.user.id)
        .select()
        .single();
    } else {
      // Insert new settings
      result = await supabase
        .from("flyer_template_settings")
        .insert({
          ...settings,
          agent_id: userData.user.id,
        })
        .select()
        .single();
    }

    if (result.error) {
      throw result.error;
    }

    return NextResponse.json({ settings: result.data });
  } catch (error: any) {
    console.error("Error saving template settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save settings" },
      { status: 500 }
    );
  }
}
