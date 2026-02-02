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

    const rawSettings = await request.json();

    // Only include valid database columns - strip out id, created_at, updated_at, etc.
    const settings = {
      template_id: rawSettings.template_id,
      logo_url: rawSettings.logo_url,
      primary_color: rawSettings.primary_color,
      secondary_color: rawSettings.secondary_color,
      font_family: rawSettings.font_family,
      show_price: rawSettings.show_price,
      show_bedrooms: rawSettings.show_bedrooms,
      show_bathrooms: rawSettings.show_bathrooms,
      show_square_feet: rawSettings.show_square_feet,
      show_lot_size: rawSettings.show_lot_size,
      show_year_built: rawSettings.show_year_built,
      show_property_type: rawSettings.show_property_type,
      show_mls_number: rawSettings.show_mls_number,
      header_style: rawSettings.header_style,
      footer_style: rawSettings.footer_style,
      image_layout: rawSettings.image_layout,
      show_agent_photo: rawSettings.show_agent_photo,
      show_agent_phone: rawSettings.show_agent_phone,
      show_agent_email: rawSettings.show_agent_email,
      show_agent_website: rawSettings.show_agent_website,
      show_qr_code: rawSettings.show_qr_code,
      custom_tagline: rawSettings.custom_tagline,
      custom_footer_text: rawSettings.custom_footer_text,
    };

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
        .update(settings)
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
