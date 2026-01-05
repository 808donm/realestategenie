import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Rental Application Submission from Property Showing
 *
 * POST: Submit a rental application from a property showing
 */

// Use service role to create applications (check-in is public-facing)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const { showingId, applicationData } = await request.json();

    if (!showingId || !applicationData) {
      return NextResponse.json(
        { error: "Showing ID and application data are required" },
        { status: 400 }
      );
    }

    // Get the showing details
    const { data: showing, error: showingError } = await supabase
      .from("pm_showings")
      .select("id, agent_id, pm_property_id")
      .eq("id", showingId)
      .single();

    if (showingError || !showing) {
      console.error("Showing not found:", showingError);
      return NextResponse.json(
        { error: "Property showing not found" },
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

    // Determine pm_property_id
    const propertyId = applicationData.pm_property_id || showing.pm_property_id;

    // Create rental application
    const { data: application, error: appError } = await supabase
      .from("pm_applications")
      .insert({
        agent_id: showing.agent_id,
        pm_property_id: propertyId,
        pm_unit_id: null,
        pm_showing_id: showingId, // Link to showing
        lead_submission_id: null, // No lead submission for showings
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

    console.log("✅ Rental application created from showing:", application.id);

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
