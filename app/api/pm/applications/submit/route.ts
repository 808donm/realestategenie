import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Rental Application Submission API
 *
 * POST: Submit a rental application from an open house check-in
 */

// Use service role to create applications (check-in is public-facing)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const { eventId, applicationData } = await request.json();

    if (!eventId || !applicationData) {
      return NextResponse.json(
        { error: "Event ID and application data are required" },
        { status: 400 }
      );
    }

    // Get the open house event details
    const { data: event, error: eventError } = await supabase
      .from("open_house_events")
      .select("id, agent_id, address, pm_property_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("Event not found:", eventError);
      return NextResponse.json(
        { error: "Open house event not found" },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!applicationData.applicant_name || !applicationData.applicant_email || !applicationData.applicant_phone) {
      return NextResponse.json(
        { error: "Name, email, and phone are required" },
        { status: 400 }
      );
    }

    // Create lead submission first (for tracking and GHL sync)
    const { data: leadSubmission, error: leadError } = await supabase
      .from("lead_submissions")
      .insert({
        open_house_event_id: eventId,
        name: applicationData.applicant_name,
        email: applicationData.applicant_email,
        phone_e164: applicationData.applicant_phone,
        consent: {
          sms: applicationData.consent_sms || false,
          email: applicationData.consent_email || false,
          captured_at: new Date().toISOString(),
        },
        source: "rental_application",
      })
      .select("id")
      .single();

    if (leadError) {
      console.error("Error creating lead submission:", leadError);
      return NextResponse.json(
        { error: "Failed to create lead submission" },
        { status: 500 }
      );
    }

    // Determine pm_property_id and pm_unit_id
    // If pmPropertyId is provided via form, use it; otherwise use event's pm_property_id
    const propertyId = applicationData.pm_property_id || event.pm_property_id;

    // Create rental application
    const { data: application, error: appError } = await supabase
      .from("pm_applications")
      .insert({
        agent_id: event.agent_id,
        pm_property_id: propertyId,
        pm_unit_id: null, // Will be assigned later if needed
        lead_submission_id: leadSubmission.id,
        applicant_name: applicationData.applicant_name,
        applicant_email: applicationData.applicant_email,
        applicant_phone: applicationData.applicant_phone,

        // Additional application fields
        number_of_occupants: applicationData.number_of_occupants,
        move_in_date: applicationData.move_in_date,

        employment_status: applicationData.employment_status,
        employer_name: applicationData.employer_name,
        job_title: applicationData.job_title,
        employment_length: applicationData.employment_length,
        annual_income: applicationData.annual_income,
        employer_phone: applicationData.employer_phone,

        current_address: applicationData.current_address,
        landlord_name: applicationData.landlord_name,
        landlord_phone: applicationData.landlord_phone,
        current_rent: applicationData.current_rent,
        reason_for_moving: applicationData.reason_for_moving,
        years_at_address: applicationData.years_at_address,

        applicant_references: applicationData.applicant_references,
        pets: applicationData.pets,
        vehicles: applicationData.vehicles,
        emergency_contact: applicationData.emergency_contact,

        credit_authorized: applicationData.credit_authorized,
        background_check_consent: applicationData.background_check_consent,
        credit_authorization_signed_at: applicationData.credit_authorized ? new Date().toISOString() : null,

        status: "pending",
        application_data: applicationData, // Store full data as JSONB for reference
      })
      .select("id")
      .single();

    if (appError) {
      console.error("Error creating application:", appError);
      return NextResponse.json(
        { error: "Failed to create application" },
        { status: 500 }
      );
    }

    console.log("✅ Rental application created:", application.id);

    return NextResponse.json(
      {
        success: true,
        application_id: application.id,
        message: "Application submitted successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in rental application submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
