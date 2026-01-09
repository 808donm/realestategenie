import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET feature details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await supabaseServer();

  // Check if user is admin
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (agent?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Get feature
  const { data: feature, error } = await supabaseAdmin
    .from("features")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !feature) {
    return NextResponse.json({ error: "Feature not found" }, { status: 404 });
  }

  return NextResponse.json({ feature });
}

// PATCH update feature
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await supabaseServer();

  // Check if user is admin
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (agent?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Parse request body
  const body = await request.json();
  const { name, slug, description, category } = body;

  // Validate required fields
  if (!name || !slug || !category) {
    return NextResponse.json(
      { error: "Missing required fields: name, slug, category" },
      { status: 400 }
    );
  }

  // Update feature
  const { data: feature, error } = await supabaseAdmin
    .from("features")
    .update({
      name,
      slug,
      description: description || null,
      category,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating feature:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ feature, message: "Feature updated successfully" });
}

// DELETE feature
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await supabaseServer();

  // Check if user is admin
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (agent?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Check if feature is used in any plans
  const { count } = await supabaseAdmin
    .from("plan_features")
    .select("*", { count: "exact", head: true })
    .eq("feature_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete feature that is used in ${count} plan(s)` },
      { status: 400 }
    );
  }

  // Delete feature
  const { error } = await supabaseAdmin
    .from("features")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting feature:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Feature deleted successfully" });
}
