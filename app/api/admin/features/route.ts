import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET all features
export async function GET() {
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

  // Get all features
  const { data: features, error } = await supabaseAdmin
    .from("features")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ features });
}

// POST create new feature
export async function POST(request: NextRequest) {
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

  // Create feature
  const { data: feature, error } = await supabaseAdmin
    .from("features")
    .insert({
      name,
      slug,
      description: description || null,
      category,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating feature:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ feature, message: "Feature created successfully" });
}
