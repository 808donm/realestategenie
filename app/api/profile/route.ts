import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** GET /api/profile — returns the current agent's profile for branding */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: agent } = await supabase
      .from("agents")
      .select("display_name, phone_e164, brokerage_name, license_number, headshot_url, logo_url, brand_color")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      agent: {
        display_name: agent?.display_name || "",
        phone_e164: agent?.phone_e164 || "",
        brokerage_name: agent?.brokerage_name || "",
        license_number: agent?.license_number || "",
        headshot_url: agent?.headshot_url || "",
        logo_url: agent?.logo_url || "",
        brand_color: agent?.brand_color || "#1e3a5f",
        email: user.email || "",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
