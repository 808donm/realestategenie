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
    console.log('[Scope Test] Testing associations.readonly scope...');
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

    const associationsResponseText = await testResponse.text();
    console.log('[Scope Test] Associations response:', testResponse.status, associationsResponseText);
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

    // Test conversations/message scope for email sending
    console.log('[Scope Test] Testing conversations/message.readonly scope...');
    const testMessagesResponse = await fetch(
      `https://services.leadconnectorhq.com/conversations/messages?locationId=${ghlConfig.location_id}&limit=1`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ghlConfig.access_token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    const messagesResponseText = await testMessagesResponse.text();
    console.log('[Scope Test] Messages response:', testMessagesResponse.status, messagesResponseText);
    const hasMessagesRead = testMessagesResponse.status !== 401;

    const allScopesPresent = hasAssociationsRead && hasContactsRead && hasMessagesRead;

    return NextResponse.json({
      success: true,
      agentId,
      locationId: ghlConfig.location_id,
      tokenChecks: {
        associationsRead: hasAssociationsRead ? "✅ Has access" : "❌ No access (401 Unauthorized)",
        contactsRead: hasContactsRead ? "✅ Has access" : "❌ No access (401 Unauthorized)",
        messagesRead: hasMessagesRead ? "✅ Has access (can send emails)" : "❌ No access (401 Unauthorized)",
      },
      rawResponses: {
        associations: {
          status: testResponse.status,
          response: associationsResponseText.substring(0, 500),
        },
        messages: {
          status: testMessagesResponse.status,
          response: messagesResponseText.substring(0, 500),
        },
      },
      requiredScopes: [
        "contacts.write",
        "contacts.readonly",
        "objects/record.write",
        "objects/record.readonly",
        "associations.write ⬅️ REQUIRED for Registration → OpenHouse linking",
        "associations.readonly",
        "conversations.write ⬅️ REQUIRED for email sending",
        "conversations.readonly",
        "conversations/message.write ⬅️ REQUIRED for email sending",
        "conversations/message.readonly",
        "opportunities.write (for pipeline)",
      ],
      diagnosis: {
        hasAssociationsAccess: hasAssociationsRead,
        canCreateAssociations: hasAssociationsRead ? "Likely yes (has read access)" : "❌ No - missing associations.readonly/write scopes",
        hasMessagesAccess: hasMessagesRead,
        canSendEmails: hasMessagesRead ? "✅ Yes (has messages access)" : "❌ No - missing conversations/message scopes",
        overallStatus: allScopesPresent ? "✅ All critical scopes present" : "⚠️ Some scopes missing",
      },
      recommendations: allScopesPresent ? [
        "✅ Token has all tested scopes!",
        "If you're still seeing 401 errors:",
        "  - Check that scopes are added in GHL Marketplace settings",
        "  - Try disconnecting and reconnecting at /app/integrations",
      ] : [
        !hasAssociationsRead && "❌ Missing associations scopes (needed for linking registrations)",
        !hasMessagesRead && "❌ Missing conversations/message scopes (needed for email sending)",
        "🔧 Fix: The OAuth code already requests these scopes, but your current token doesn't have them",
        "🔄 Solution: Disconnect and reconnect GHL at /app/integrations to get a new token with all scopes",
      ].filter(Boolean),
      nextSteps: !allScopesPresent ? [
        "1. Verify scopes are enabled in GHL Marketplace: https://marketplace.gohighlevel.com/",
        "   Apps → Your OAuth App → Settings → Scopes",
        "   Enable: associations.write, associations.readonly, conversations/message.write, conversations/message.readonly",
        "2. Go to /app/integrations in your app",
        "3. Disconnect GHL integration",
        "4. Reconnect GHL integration (this creates a new token with the scopes)",
        "5. Test by registering for an open house",
      ] : [
        "✅ Your token has all required scopes!",
        "If issues persist, check application logs for specific API errors",
      ],
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
