import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Lazy initialization
let admin: ReturnType<typeof createAdminClient> | null = null;

function getAdmin() {
  if (!admin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase credentials");
    }

    admin = createAdminClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { persistSession: false } }
    );
  }
  return admin;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to check role
    const { data: agentData } = await getAdmin()
      .from("agents")
      .select("id, role")
      .eq("id", user.id)
      .single();

    const agent = agentData as any;

    if (!agent || agent.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get request body
    const { requestId } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    // Delete the access request
    const { error: deleteError } = await getAdmin()
      .from("access_requests")
      .delete()
      .eq("id", requestId);

    if (deleteError) {
      console.error("Error deleting access request:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete access request" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in delete-access-request API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
