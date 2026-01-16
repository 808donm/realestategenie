import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logError } from "@/lib/error-logging";

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, phone, company, message } = await request.json();

    // Validate required fields
    if (!fullName || !email || !phone) {
      return NextResponse.json(
        { error: "Name, email, and phone are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Check if there's already a pending request from this email
    const { data: existingRequest } = await admin
      .from("access_requests")
      .select("id, status")
      .eq("email", email)
      .single();

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return NextResponse.json(
          { error: "You already have a pending access request. We'll be in touch soon!" },
          { status: 400 }
        );
      }
      if (existingRequest.status === "approved" || existingRequest.status === "payment_sent") {
        return NextResponse.json(
          { error: "Your application has already been approved. Check your email for next steps." },
          { status: 400 }
        );
      }
      if (existingRequest.status === "completed") {
        return NextResponse.json(
          { error: "You already have an account. Please sign in instead." },
          { status: 400 }
        );
      }
      if (existingRequest.status === "rejected") {
        // Allow resubmission if previously rejected
        await admin
          .from("access_requests")
          .delete()
          .eq("id", existingRequest.id);
      }
    }

    // Check if user already exists
    const { data: existingUser } = await admin
      .from("agents")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 400 }
      );
    }

    // Create access request
    const { data: accessRequest, error: createError } = await admin
      .from("access_requests")
      .insert({
        full_name: fullName,
        email,
        phone,
        company: company || null,
        message: message || null,
        status: "pending",
      })
      .select()
      .single();

    if (createError || !accessRequest) {
      console.error("Failed to create access request:", createError);
      await logError({
        endpoint: "/api/request-access",
        errorMessage: createError?.message || "Failed to create access request",
        severity: "error",
      });
      return NextResponse.json(
        { error: "Failed to submit access request. Please try again." },
        { status: 500 }
      );
    }

    // Send email notification to admin
    const adminEmail = process.env.ADMIN_EMAIL || "support@realestategenie.app";

    try {
      // Dynamic import to avoid build-time initialization
      const { sendAccessRequestNotification } = await import("@/lib/email/resend");

      await sendAccessRequestNotification({
        to: adminEmail,
        applicantName: fullName,
        applicantEmail: email,
        applicantPhone: phone,
        company,
        message,
        requestId: accessRequest.id,
      });
    } catch (emailError: any) {
      // Log error but don't fail the request - the access request was still created
      console.error("Failed to send admin notification email:", emailError);
      await logError({
        endpoint: "/api/request-access",
        errorMessage: `Failed to send admin notification: ${emailError.message}`,
        severity: "warning",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Access request submitted successfully",
    });
  } catch (error: any) {
    console.error("Error in /api/request-access:", error);
    await logError({
      endpoint: "/api/request-access",
      errorMessage: error.message,
      stackTrace: error.stack,
      severity: "error",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
