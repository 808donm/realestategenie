import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Initiate GHL OAuth flow
 * GET /api/integrations/ghl/connect
 */
export async function GET(req: NextRequest) {
  const supabase = await supabaseServer();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate state for CSRF protection
  const state = crypto.randomUUID();

  // Store state in session (you could also use cookies)
  // For now, we'll pass it through and verify on callback

  const ghlAuthUrl = new URL("https://marketplace.gohighlevel.com/oauth/chooselocation");
  ghlAuthUrl.searchParams.append("response_type", "code");
  ghlAuthUrl.searchParams.append("client_id", process.env.GHL_CLIENT_ID!);
  ghlAuthUrl.searchParams.append(
    "redirect_uri",
    `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/crm-callback`
  );
  // Request all necessary scopes for Real Estate Genie
  // Custom objects scopes: using path-based format (objects/record, objects/schema)
  ghlAuthUrl.searchParams.append(
    "scope",
    "contacts.write contacts.readonly opportunities.write opportunities.readonly locations.readonly conversations.write conversations.readonly objects/record.readonly objects/record.write objects/schema.readonly objects/schema.write"
  );
  ghlAuthUrl.searchParams.append("state", state);

  // Redirect to GHL OAuth page
  return NextResponse.redirect(ghlAuthUrl.toString());
}
