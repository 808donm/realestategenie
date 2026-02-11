import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Get inbound messages from contacts
 * GET /api/messages/inbound?unreadOnly=true&limit=50
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = admin
      .from('inbound_messages')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json({
        error: error.message,
      }, { status: 500 });
    }

    // Group by contact for easier review
    const groupedByContact = messages?.reduce((acc: any, msg: any) => {
      const contactId = msg.contact_id || 'unknown';
      if (!acc[contactId]) {
        acc[contactId] = {
          contactId,
          contactName: msg.contact_name,
          contactEmail: msg.contact_email,
          contactPhone: msg.contact_phone,
          messages: [],
          unreadCount: 0,
          lastMessageAt: msg.received_at,
        };
      }
      acc[contactId].messages.push(msg);
      if (!msg.read) {
        acc[contactId].unreadCount++;
      }
      return acc;
    }, {});

    const contacts = Object.values(groupedByContact || {});

    return NextResponse.json({
      success: true,
      totalMessages: messages?.length || 0,
      totalContacts: contacts.length,
      unreadCount: messages?.filter((m: any) => !m.read).length || 0,
      contacts,
      messages: messages || [],
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

/**
 * Mark messages as read
 * POST /api/messages/inbound
 * Body: { messageIds: string[] }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messageIds } = body;

    if (!messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json({
        error: 'messageIds array required',
      }, { status: 400 });
    }

    const { error } = await admin
      .from('inbound_messages')
      .update({ read: true })
      .in('id', messageIds);

    if (error) {
      return NextResponse.json({
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      markedAsRead: messageIds.length,
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
    }, { status: 500 });
  }
}
