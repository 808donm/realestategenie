import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Push Notification Subscription API
 *
 * POST   — Subscribe to push notifications
 * DELETE — Unsubscribe
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint, keys } = await request.json();

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "endpoint and keys (p256dh, auth) are required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          agent_id: userData.user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: request.headers.get("user-agent") || null,
        },
        { onConflict: "endpoint" }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to subscribe" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
    }

    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("agent_id", userData.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}
