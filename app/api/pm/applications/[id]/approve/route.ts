import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, reason } = body;

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // If approving, create a contact for the tenant
    if (action === "approve") {
      updateData.approved_date = new Date().toISOString();
      updateData.credit_check_result = "approved";

      // First, get the application data to create contact
      const { data: application } = await supabase
        .from("pm_applications")
        .select("applicant_name, applicant_email, applicant_phone, pm_contact_id")
        .eq("id", id)
        .eq("agent_id", userData.user.id)
        .single();

      if (application) {
        let contactId = application.pm_contact_id;

        // Only create contact if it doesn't already exist
        if (!contactId) {
          // Try to find existing contact by email
          const { data: existingContact } = await supabase
            .from("pm_contacts")
            .select("id")
            .eq("agent_id", userData.user.id)
            .eq("email", application.applicant_email)
            .eq("contact_type", "tenant")
            .maybeSingle();

          if (existingContact) {
            contactId = existingContact.id;

            // Update the contact with latest info
            await supabase
              .from("pm_contacts")
              .update({
                full_name: application.applicant_name,
                phone: application.applicant_phone,
                updated_at: new Date().toISOString(),
              })
              .eq("id", contactId);
          } else {
            // Create new contact
            const { data: newContact, error: contactError } = await supabase
              .from("pm_contacts")
              .insert({
                agent_id: userData.user.id,
                full_name: application.applicant_name,
                email: application.applicant_email,
                phone: application.applicant_phone,
                contact_type: "tenant",
              })
              .select("id")
              .single();

            if (contactError) {
              console.error("Error creating contact:", contactError);
              // Don't fail the approval, just log it
            } else {
              contactId = newContact.id;
            }
          }

          // Store the contact ID on the application
          if (contactId) {
            updateData.pm_contact_id = contactId;
          }
        }
      }
    }

    if (action === "reject" && reason) {
      updateData.application_data = {
        ...updateData.application_data,
        rejection_reason: reason,
      };
    }

    // Update application
    const { data, error } = await supabase
      .from("pm_applications")
      .update(updateData)
      .eq("id", id)
      .eq("agent_id", userData.user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating application:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // TODO: Sync to GHL - update contact tags based on approval/rejection
    // Tag approved: "rental-application-approved"
    // Tag rejected: "rental-application-rejected"

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in approve route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
