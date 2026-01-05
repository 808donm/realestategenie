import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

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
