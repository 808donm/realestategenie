import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { FLYER_TEMPLATES } from "@/lib/flyer-templates";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const templateId = body.template_id;

  if (!templateId || !FLYER_TEMPLATES.find(t => t.id === templateId)) {
    return NextResponse.json({ error: "Invalid template_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("open_house_events")
    .update({ flyer_template_id: templateId })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, template_id: templateId });
}
