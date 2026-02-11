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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log("Creating admin client...");
    console.log("Supabase URL exists:", !!supabaseUrl);
    console.log("Service Role Key exists:", !!serviceRoleKey);
    console.log("Service Role Key length:", serviceRoleKey?.length || 0);

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase credentials");
    }

    admin = createAdminClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { persistSession: false } }
    );
    console.log("Admin client created successfully");
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
      console.error("No user found in session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User authenticated:", user.id);

    // Use admin client to check role (bypasses RLS)
    // Note: agents.id IS the user_id (it references auth.users(id))
    const { data: agentData, error: agentError } = await getAdmin()
      .from("agents")
      .select("id, role")
      .eq("id", user.id)  // Changed from user_id to id
      .single();

    console.log("Agent query result:", { agentData, agentError });

    // Type assertion for Supabase query result
    const agent = agentData as any;

    if (agentError) {
      console.error("Error fetching agent:", agentError);
      return NextResponse.json({ error: "Failed to verify admin access" }, { status: 500 });
    }

    if (!agent) {
      console.error("No agent found for user:", user.id);
      return NextResponse.json({ error: "Forbidden - No agent record" }, { status: 403 });
    }

    if (agent.role !== "admin") {
      console.error("User is not admin, role:", agent.role);
      return NextResponse.json({ error: "Forbidden - Not admin" }, { status: 403 });
    }

    console.log("Admin verified, fetching plans...");

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

    console.log("Plans fetched successfully:", plans?.length);
    return NextResponse.json({ plans: plans || [] });
  } catch (error: any) {
    console.error("Error in subscription-plans API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
