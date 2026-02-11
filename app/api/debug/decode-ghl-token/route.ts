import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Decode GHL JWT token to inspect scopes
 * GET /api/debug/decode-ghl-token?agentId=xxx
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let agentId = searchParams.get('agentId');

    if (!agentId) {
      // Try to get first agent
      const { data: agent } = await admin
        .from("agents")
        .select("id, email")
        .order("created_at", { ascending: true })
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

    // Fetch integration
    const { data: integration, error } = await admin
      .from("integrations")
      .select("*")
      .eq("agent_id", agentId)
      .eq("provider", "ghl")
      .single();

    if (error || !integration) {
      return NextResponse.json({
        error: "No GHL integration found",
        agentId,
      }, { status: 404 });
    }

    const config = integration.config as any;
    const accessToken = config.ghl_access_token || config.access_token;

    if (!accessToken) {
      return NextResponse.json({
        error: "No access token found in config"
      }, { status: 404 });
    }

    // Decode JWT (it's base64 encoded, split by dots)
    const parts = accessToken.split('.');

    if (parts.length !== 3) {
      return NextResponse.json({
        error: "Invalid JWT format"
      }, { status: 400 });
    }

    // Decode the payload (second part)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );

    return NextResponse.json({
      success: true,
      agentId,
      integration: {
        id: integration.id,
        created_at: integration.created_at,
        updated_at: integration.updated_at,
      },
      tokenPayload: {
        authClass: payload.authClass,
        authClassId: payload.authClassId,
        primaryAuthClassId: payload.primaryAuthClassId,
        scopes: payload.oauthMeta?.scopes || [],
        scopeCount: payload.oauthMeta?.scopes?.length || 0,
        exp: payload.exp,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        iat: payload.iat,
        issuedAt: new Date(payload.iat * 1000).toISOString(),
      },
      scopeAnalysis: {
        hasContacts: payload.oauthMeta?.scopes?.some((s: string) => s.includes('contacts')),
        hasAssociations: payload.oauthMeta?.scopes?.some((s: string) => s.includes('associations')),
        hasConversations: payload.oauthMeta?.scopes?.some((s: string) => s.includes('conversations')),
        hasMessages: payload.oauthMeta?.scopes?.some((s: string) => s.includes('message')),
        hasObjects: payload.oauthMeta?.scopes?.some((s: string) => s.includes('objects')),
      },
      allScopes: payload.oauthMeta?.scopes || [],
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
