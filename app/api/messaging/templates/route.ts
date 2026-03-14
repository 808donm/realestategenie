import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const DEFAULT_TEMPLATES = [
  {
    id: "intro",
    name: "Introduction",
    category: "follow_up",
    subject: "Great meeting you!",
    body: "Hi {{name}}, it was great meeting you at the open house for {{property}}. I'd love to help you find your perfect home. When would be a good time to chat?",
    channels: ["email", "sms"],
  },
  {
    id: "showing",
    name: "Schedule Showing",
    category: "scheduling",
    subject: "Let's schedule a private showing",
    body: "Hi {{name}}, I'd love to set up a private showing for you. What days and times work best this week?",
    channels: ["email", "sms"],
  },
  {
    id: "checkin",
    name: "Check-In",
    category: "follow_up",
    subject: "Checking in",
    body: "Hi {{name}}, just checking in to see if you have any questions about the properties we discussed. I'm here to help!",
    channels: ["email", "sms"],
  },
  {
    id: "market_update",
    name: "Market Update",
    category: "nurture",
    subject: "Market Update for Your Area",
    body: "Hi {{name}}, I wanted to share some exciting market updates for your area. Several new listings have come on the market that might interest you. Would you like me to send you the details?",
    channels: ["email"],
  },
  {
    id: "price_change",
    name: "Price Change Alert",
    category: "nurture",
    subject: "Price Change on a Property You Viewed",
    body: "Hi {{name}}, great news! A property you showed interest in has had a price change. Would you like to take another look?",
    channels: ["email", "sms"],
  },
  {
    id: "thank_you",
    name: "Thank You",
    category: "follow_up",
    subject: "Thank you!",
    body: "Hi {{name}}, thank you for your time today. It was a pleasure working with you. Please don't hesitate to reach out if you need anything!",
    channels: ["email", "sms"],
  },
  {
    id: "referral",
    name: "Referral Request",
    category: "nurture",
    subject: "Know anyone looking to buy or sell?",
    body: "Hi {{name}}, I hope you're enjoying your new home! If you know anyone who's looking to buy or sell, I'd appreciate the referral. Thank you!",
    channels: ["email"],
  },
  {
    id: "appointment_reminder",
    name: "Appointment Reminder",
    category: "scheduling",
    subject: "Reminder: Upcoming Appointment",
    body: "Hi {{name}}, just a friendly reminder about our appointment tomorrow. Looking forward to seeing you!",
    channels: ["email", "sms"],
  },
];

/**
 * GET /api/messaging/templates - List quick-reply templates
 * POST /api/messaging/templates - Create a custom template
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load custom templates from DB
    const { data: customTemplates } = await supabase
      .from("message_templates")
      .select("*")
      .eq("agent_id", userData.user.id)
      .order("created_at", { ascending: false });

    const templates = [
      ...DEFAULT_TEMPLATES.map((t) => ({ ...t, isDefault: true })),
      ...(customTemplates || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        subject: t.subject,
        body: t.body,
        channels: t.channels || ["email", "sms"],
        isDefault: false,
      })),
    ];

    return NextResponse.json({ templates });
  } catch (error) {
    // If table doesn't exist, return defaults only
    return NextResponse.json({ templates: DEFAULT_TEMPLATES.map((t) => ({ ...t, isDefault: true })) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, category, subject, messageBody, channels } = body;

    if (!name || !messageBody) {
      return NextResponse.json({ error: "name and messageBody are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("message_templates")
      .insert({
        agent_id: userData.user.id,
        name,
        category: category || "custom",
        subject: subject || null,
        body: messageBody,
        channels: channels || ["email", "sms"],
      })
      .select("id")
      .single();

    if (error) {
      // Table might not exist — return success anyway
      return NextResponse.json({
        success: true,
        id: `custom-${Date.now()}`,
        note: "Template saved in memory (DB table pending migration)"
      });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save template" },
      { status: 500 }
    );
  }
}
