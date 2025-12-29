import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * QuickBooks OAuth2 Connection Endpoint
 * Initiates OAuth flow by redirecting to Intuit authorization
 */
export async function GET() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // QuickBooks OAuth configuration
  const clientId = process.env.QBO_CLIENT_ID;
  const redirectUri = process.env.QBO_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/qbo/callback`;

  if (!clientId) {
    console.error("QBO_CLIENT_ID not configured");
    return NextResponse.json(
      { error: "QuickBooks integration not configured. Please contact support." },
      { status: 500 }
    );
  }

  // Store agent ID in state parameter for callback
  const state = Buffer.from(
    JSON.stringify({
      agentId: user.id,
      timestamp: Date.now(),
    })
  ).toString("base64");

  // Build authorization URL
  const authUrl = new URL("https://appcenter.intuit.com/connect/oauth2");
  authUrl.searchParams.append("client_id", clientId);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("scope", "com.intuit.quickbooks.accounting");
  authUrl.searchParams.append("redirect_uri", redirectUri);
  authUrl.searchParams.append("state", state);

  console.log("[QBO] Redirecting to QuickBooks OAuth:", authUrl.toString());

  // Redirect to QuickBooks authorization
  return NextResponse.redirect(authUrl.toString());
}
