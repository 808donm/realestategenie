import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get tenant user to find lease_id
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("lease_id")
      .eq("id", user.id)
      .single();

    if (!tenantUser) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Fetch messages for this lease
    const { data: messages, error: messagesError } = await supabase
      .from("pm_messages")
      .select("*")
      .eq("lease_id", tenantUser.lease_id)
      .order("created_at", { ascending: false });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error in GET /api/tenant/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify this is a tenant account
    const userMetadata = user.user_metadata;
    if (userMetadata?.role !== "tenant") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { lease_id, to_user_id, message, attachments } = body;

    // Validate input
    if (!lease_id || !to_user_id || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify tenant owns this lease
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("lease_id")
      .eq("id", user.id)
      .eq("lease_id", lease_id)
      .single();

    if (!tenantUser) {
      return NextResponse.json(
        { error: "Unauthorized - lease not found" },
        { status: 403 }
      );
    }

    // Verify recipient is the agent for this lease
    const { data: lease } = await supabase
      .from("pm_leases")
      .select("agent_id")
      .eq("id", lease_id)
      .single();

    if (!lease || lease.agent_id !== to_user_id) {
      return NextResponse.json(
        { error: "Invalid recipient" },
        { status: 400 }
      );
    }

    // Create message
    const { data: newMessage, error: createError } = await supabase
      .from("pm_messages")
      .insert({
        lease_id,
        from_user_id: user.id,
        from_user_type: "tenant",
        to_user_id,
        to_user_type: "agent",
        message,
        attachments: attachments || null,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating message:", createError);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    // TODO: Sync to GHL
    // This would send the message to GoHighLevel via their API
    // For now, we'll mark it as pending sync
    await supabase
      .from("pm_messages")
      .update({ synced_to_ghl: false })
      .eq("id", newMessage.id);

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/tenant/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
