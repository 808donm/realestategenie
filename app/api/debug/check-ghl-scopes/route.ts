import { NextResponse } from "next/server";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Diagnostic endpoint to check GHL token scopes
 * Call with: GET /api/debug/check-ghl-scopes?agentId=YOUR_AGENT_ID
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let agentId = searchParams.get('agentId');

    if (!agentId) {
      // Try to get first agent
      const { data: agent } = await admin
        .from("agents")
        .select("id")
        .limit(1)
        .single();

      if (agent) {
        agentId = agent.id;
      }
    }

    if (!agentId) {
      return NextResponse.json({
        error: "No agent found. Provide agentId parameter."
      }, { status: 400 });
    }

    const ghlConfig = await getValidGHLConfig(agentId);

    if (!ghlConfig) {
      return NextResponse.json({
        error: "GHL not connected for this agent",
        recommendation: "Connect GHL at /app/integrations"
      }, { status: 400 });
    }

    // Test associations.write scope by attempting to fetch associations
    // (We'll use GET which requires associations.readonly)
    const testResponse = await fetch(
      `https://services.leadconnectorhq.com/associations/?locationId=${ghlConfig.location_id}&limit=1`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ghlConfig.access_token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    const hasAssociationsRead = testResponse.status !== 401;

    // We can't directly test associations.write without creating one,
    // but we can check if the read scope exists
    const testContactResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/search?locationId=${ghlConfig.location_id}&limit=1`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ghlConfig.access_token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    const hasContactsRead = testContactResponse.status !== 401;

    return NextResponse.json({
      success: true,
      agentId,
      locationId: ghlConfig.location_id,
      tokenChecks: {
        associationsRead: hasAssociationsRead ? "✅ Has access" : "❌ No access (401 Unauthorized)",
        contactsRead: hasContactsRead ? "✅ Has access" : "❌ No access (401 Unauthorized)",
      },
      requiredScopes: [
        "contacts.write",
        "contacts.readonly",
        "customObjects.write",
        "customObjects.readonly",
        "associations.write ⬅️ REQUIRED for Registration → OpenHouse linking",
        "associations.readonly",
        "conversations.write (for emails/SMS)",
        "opportunities.write (for pipeline)",
      ],
      diagnosis: {
        hasAssociationsAccess: hasAssociationsRead,
        canCreateAssociations: hasAssociationsRead ? "Likely yes (has read access)" : "❌ No - missing associations.readonly/write scopes",
      },
      recommendations: hasAssociationsRead ? [
        "✅ Token appears to have association access",
        "If associations are still failing with 401, add associations.write scope in GHL Developer Portal",
        "Then reconnect the integration at /app/integrations",
      ] : [
        "❌ Token missing associations.readonly scope",
        "❌ Also likely missing associations.write scope",
        "🔧 Fix: Add these scopes in GHL Developer Portal → Your App → Settings → Scopes",
        "   - associations.readonly",
        "   - associations.write",
        "🔄 Then reconnect the integration at /app/integrations",
      ],
      nextSteps: [
        "1. Go to https://marketplace.gohighlevel.com/",
        "2. Navigate to Apps → Your OAuth App → Settings → Scopes",
        "3. Add 'associations.write' and 'associations.readonly' scopes",
        "4. Save changes",
        "5. Disconnect and reconnect GHL integration at /app/integrations",
        "6. Test by registering for an open house again",
      ],
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
