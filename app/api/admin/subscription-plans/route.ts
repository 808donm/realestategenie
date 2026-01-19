import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Lazy initialization
let admin: ReturnType<typeof createAdminClient> | null = null;

function getAdmin() {
  if (!admin) {
    admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return admin;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to check role (bypasses RLS)
    const { data: agent } = await getAdmin()
      .from("agents")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (!agent || agent.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all active subscription plans
    const { data: plans, error } = await getAdmin()
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .eq("is_custom", false)
      .order("tier_level", { ascending: true });

    if (error) {
      console.error("Error fetching plans:", error);
      return NextResponse.json(
        { error: "Failed to fetch plans" },
        { status: 500 }
      );
    }

    return NextResponse.json({ plans: plans || [] });
  } catch (error: any) {
    console.error("Error in subscription-plans API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
