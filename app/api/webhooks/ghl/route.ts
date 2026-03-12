import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { handleInboundLeadMessage } from "@/lib/lead-response/engine";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Handle inbound messages from contacts
 */
async function handleInboundMessage(payload: any) {
  const message = payload.message || payload.data?.message;
  const contact = payload.contact || payload.data?.contact;
  const conversation = payload.conversation || payload.data?.conversation;

  console.log('📨 INBOUND MESSAGE RECEIVED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('From:', contact?.name || 'Unknown');
  console.log('Email:', contact?.email);
  console.log('Phone:', contact?.phone);
  console.log('Message Type:', message?.type || 'Unknown');
  console.log('Message Body:', message?.body || message?.text);
  console.log('Contact ID:', contact?.id);
  console.log('Conversation ID:', conversation?.id);
  console.log('Timestamp:', new Date().toISOString());
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Store in database for follow-up
  try {
    await admin.from('inbound_messages').insert({
      contact_id: contact?.id,
      contact_name: contact?.name,
      contact_email: contact?.email,
      contact_phone: contact?.phone,
      message_type: message?.type,
      message_body: message?.body || message?.text,
      conversation_id: conversation?.id,
      ghl_message_id: message?.id,
      location_id: payload.locationId,
      raw_payload: payload,
      received_at: new Date().toISOString(),
      read: false,
    });
    console.log('✅ Inbound message stored in database');
  } catch (err: any) {
    console.log('⚠️ Could not store inbound message:', err.message);
  }

  // Trigger AI auto-response engine
  await handleAutoResponse(payload);

  return { success: true, action: 'logged' };
}

/**
 * GHL Webhook Receiver
 * Receives events from GoHighLevel when things change
 * POST /api/webhooks/ghl
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log('[GHL Webhook] Received event:', {
      type: body.type,
      locationId: body.locationId,
      timestamp: new Date().toISOString(),
    });

    // Log the full payload for debugging
    console.log('[GHL Webhook] Full payload:', JSON.stringify(body, null, 2));

    // Store webhook event in database for audit trail
    try {
      await admin.from('webhook_events').insert({
        provider: 'ghl',
        event_type: body.type,
        payload: body,
        received_at: new Date().toISOString(),
      });
    } catch (err: any) {
      // Table might not exist yet, just log
      console.log('[GHL Webhook] Could not store event (table may not exist):', err.message);
    }

    // Handle different event types
    switch (body.type) {
      case 'ContactCreate':
      case 'ContactUpdate':
        console.log('[GHL Webhook] Contact event:', body.contact?.id);
        break;

      case 'OpportunityCreate':
      case 'OpportunityUpdate':
        console.log('[GHL Webhook] Opportunity event:', body.opportunity?.id);
        break;

      case 'TaskCreate':
      case 'TaskUpdate':
        console.log('[GHL Webhook] Task event:', body.task?.id);
        break;

      case 'InboundMessage':
        await handleInboundMessage(body);
        break;

      case 'OutboundMessage':
        console.log('[GHL Webhook] Outbound message sent:', body.message?.id);
        break;

      case 'ConversationUnreadUpdate':
        console.log('[GHL Webhook] Unread count updated:', body.conversation?.id);
        break;

      default:
        console.log('[GHL Webhook] Unknown event type:', body.type);
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({
      success: true,
      message: 'Webhook received',
      eventType: body.type,
    });

  } catch (error: any) {
    console.error('[GHL Webhook] Error processing webhook:', error);

    // Still return 200 to prevent GHL from retrying
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 200 });
  }
}

/**
 * Trigger AI auto-response engine for inbound messages
 */
async function handleAutoResponse(payload: any) {
  const message = payload.message || payload.data?.message;
  const contact = payload.contact || payload.data?.contact;
  const conversation = payload.conversation || payload.data?.conversation;

  const messageBody = message?.body || message?.text;
  if (!messageBody || !contact?.id) {
    console.log('[Auto-Response] Skipping — no message body or contact ID');
    return;
  }

  // Look up which agent owns this GHL location
  const { data: integration } = await admin
    .from('integrations')
    .select('agent_id, config')
    .eq('provider', 'ghl')
    .eq('status', 'connected')
    .single();

  if (!integration) {
    console.log('[Auto-Response] No GHL integration found for this location');
    return;
  }

  // Check if the location matches
  const config = integration.config as any;
  const locationId = config.ghl_location_id || config.location_id;
  if (payload.locationId && locationId && payload.locationId !== locationId) {
    // Try to find the right integration by location
    const { data: matchingIntegration } = await admin
      .from('integrations')
      .select('agent_id')
      .eq('provider', 'ghl')
      .eq('status', 'connected')
      .filter('config->>ghl_location_id', 'eq', payload.locationId)
      .single();

    if (!matchingIntegration) {
      console.log('[Auto-Response] No matching integration for location:', payload.locationId);
      return;
    }

    integration.agent_id = matchingIntegration.agent_id;
  }

  try {
    const result = await handleInboundLeadMessage({
      agentId: integration.agent_id,
      message: messageBody,
      source: 'ghl',
      contactId: contact.id,
      contactPhone: contact.phone,
      contactName: contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' '),
      contactEmail: contact.email,
      ghlConversationId: conversation?.id,
    });

    console.log('[Auto-Response] Result:', {
      responded: result.responded,
      phase: result.phase,
      heatScore: result.heatScore,
      escalated: result.escalated,
      reason: result.reason,
    });
  } catch (err: any) {
    console.error('[Auto-Response] Engine error:', err.message);
  }
}

// Handle GET requests (for webhook verification)
export async function GET(req: Request) {
  return NextResponse.json({
    service: 'Real Estate Genie - GHL Webhook Receiver',
    status: 'active',
    endpoint: '/api/webhooks/ghl',
    methods: ['POST'],
    description: 'Receives webhook events from GoHighLevel',
  });
}
