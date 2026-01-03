import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GHLClient } from "@/lib/integrations/ghl-client";

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
    // This is optional - if it fails, we still create the application
    let leadSubmissionId: string | null = null;

    try {
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

      if (!leadError && leadSubmission) {
        leadSubmissionId = leadSubmission.id;
        console.log("✅ Lead submission created:", leadSubmissionId);
      } else {
        console.warn("Could not create lead submission (non-fatal):", leadError?.message);
      }
    } catch (err: any) {
      console.warn("Lead submission failed (continuing anyway):", err.message);
    }

    // Determine pm_property_id and pm_unit_id
    // If pmPropertyId is provided via form, use it; otherwise use event's pm_property_id
    const propertyId = applicationData.pm_property_id || event.pm_property_id;

    // Create or find contact for the applicant
    let contactId: string | null = null;
    let ghlContactId: string | null = null;

    try {
      // Check if contact already exists
      const { data: existingContact } = await supabase
        .from("pm_contacts")
        .select("id, ghl_contact_id")
        .eq("agent_id", event.agent_id)
        .eq("email", applicationData.applicant_email)
        .eq("contact_type", "tenant")
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
        ghlContactId = existingContact.ghl_contact_id;

        // Update existing contact with latest info
        await supabase
          .from("pm_contacts")
          .update({
            full_name: applicationData.applicant_name,
            phone: applicationData.applicant_phone,
            updated_at: new Date().toISOString(),
          })
          .eq("id", contactId);

        console.log("✅ Updated existing contact:", contactId);
      } else {
        // Create new contact
        const { data: newContact, error: contactError } = await supabase
          .from("pm_contacts")
          .insert({
            agent_id: event.agent_id,
            full_name: applicationData.applicant_name,
            email: applicationData.applicant_email,
            phone: applicationData.applicant_phone,
            contact_type: "tenant",
          })
          .select("id")
          .single();

        if (!contactError && newContact) {
          contactId = newContact.id;
          console.log("✅ Created new contact:", contactId);
        } else {
          console.warn("Could not create contact (non-fatal):", contactError?.message);
        }
      }
    } catch (err: any) {
      console.warn("Contact creation/update failed (continuing anyway):", err.message);
    }

    // Create contact in GHL for future lease creation
    // This ensures the contact exists with custom fields when we need to create a lease
    try {
      // Get GHL integration
      const { data: ghlIntegration } = await supabase
        .from("integrations")
        .select("*")
        .eq("agent_id", event.agent_id)
        .eq("provider", "ghl")
        .eq("status", "connected")
        .maybeSingle();

      if (ghlIntegration?.config?.ghl_access_token && ghlIntegration?.config?.ghl_location_id) {
        const ghlClient = new GHLClient(
          ghlIntegration.config.ghl_access_token,
          ghlIntegration.config.ghl_location_id
        );

        // Split name into first and last
        const nameParts = applicationData.applicant_name.split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        // Check if contact already exists in GHL
        if (!ghlContactId) {
          const searchResult = await ghlClient.searchContacts({
            email: applicationData.applicant_email,
          });

          if (searchResult.contacts && searchResult.contacts.length > 0) {
            ghlContactId = searchResult.contacts[0].id!;
            console.log("✅ Found existing GHL contact:", ghlContactId);
          }
        }

        if (ghlContactId) {
          // Update existing GHL contact
          await ghlClient.updateContact(ghlContactId, {
            firstName,
            lastName,
            name: applicationData.applicant_name,
            email: applicationData.applicant_email,
            phone: applicationData.applicant_phone,
            tags: ["rental-applicant"],
          });
          console.log("✅ Updated GHL contact:", ghlContactId);
        } else {
          // Create new GHL contact
          const newGHLContact = await ghlClient.createContact({
            locationId: ghlIntegration.config.ghl_location_id,
            firstName,
            lastName,
            name: applicationData.applicant_name,
            email: applicationData.applicant_email,
            phone: applicationData.applicant_phone,
            tags: ["rental-applicant"],
            source: "Rental Application",
          });
          ghlContactId = newGHLContact.id!;
          console.log("✅ Created GHL contact:", ghlContactId);
        }

        // Update pm_contact with ghl_contact_id
        if (contactId && ghlContactId) {
          await supabase
            .from("pm_contacts")
            .update({ ghl_contact_id: ghlContactId })
            .eq("id", contactId);
          console.log("✅ Linked pm_contact to GHL contact");
        }
      } else {
        console.log("ℹ️ GHL integration not configured - skipping GHL contact creation");
      }
    } catch (ghlError: any) {
      console.warn("GHL contact creation failed (non-fatal):", ghlError.message);
      // Continue anyway - GHL contact creation is optional
    }

    // Create rental application
    const { data: application, error: appError } = await supabase
      .from("pm_applications")
      .insert({
        agent_id: event.agent_id,
        pm_property_id: propertyId,
        pm_unit_id: null, // Will be assigned later if needed
        pm_contact_id: contactId, // Link to contact
        lead_submission_id: leadSubmissionId,
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
