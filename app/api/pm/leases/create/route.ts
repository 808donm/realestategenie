import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { prepareGHLContract, prepareFirstMonthInvoice } from "@/lib/integrations/lease-to-ghl-contract";

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      pm_property_id,
      pm_unit_id,
      pm_application_id,
      tenant_name,
      tenant_email,
      tenant_phone,
      lease_start_date,
      lease_end_date,
      monthly_rent,
      security_deposit,
      pet_deposit,
      rent_due_day,
      notice_period_days,
      requires_professional_carpet_cleaning,
      requires_professional_house_cleaning,
      custom_requirements,
      lease_document_type,
      custom_lease_url,
    } = body;

    // Validate required fields
    if (!pm_property_id || !tenant_name || !tenant_email || !lease_start_date || !lease_end_date || !monthly_rent || !security_deposit) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get agent's GHL integration status (optional)
    const { data: integration } = await supabase
      .from("integrations")
      .select("ghl_access_token, ghl_location_id")
      .eq("agent_id", userData.user.id)
      .single();

    const hasGHLIntegration = !!(integration?.ghl_access_token && integration?.ghl_location_id);

    // Get property data
    const { data: property } = await supabase
      .from("pm_properties")
      .select("address")
      .eq("id", pm_property_id)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Get unit data if applicable
    let unitNumber: string | null = null;
    if (pm_unit_id) {
      const { data: unit } = await supabase
        .from("pm_units")
        .select("unit_number")
        .eq("id", pm_unit_id)
        .single();
      unitNumber = unit?.unit_number || null;
    }

    // Get agent data
    const { data: agent } = await supabase
      .from("agents")
      .select("display_name, email")
      .eq("id", userData.user.id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent profile not found" }, { status: 404 });
    }

    // Get or create tenant contact
    let localContactId: string;
    let ghlContactId: string | null = null;

    // If creating from application, check if contact already exists
    if (pm_application_id) {
      const { data: application } = await supabase
        .from("pm_applications")
        .select("pm_contact_id")
        .eq("id", pm_application_id)
        .single();

      if (application?.pm_contact_id) {
        // Use existing contact from application
        localContactId = application.pm_contact_id;

        // Get the contact to check for GHL ID
        const { data: contact } = await supabase
          .from("pm_contacts")
          .select("ghl_contact_id")
          .eq("id", localContactId)
          .single();

        ghlContactId = contact?.ghl_contact_id || null;

        // Update contact with latest info if needed
        await supabase
          .from("pm_contacts")
          .update({
            full_name: tenant_name,
            email: tenant_email,
            phone: tenant_phone,
            updated_at: new Date().toISOString(),
          })
          .eq("id", localContactId);
      } else {
        // Application doesn't have a contact yet - this shouldn't happen for approved apps
        // but we'll handle it anyway by creating one
        const { data: newContact, error: contactError } = await supabase
          .from("pm_contacts")
          .insert({
            agent_id: userData.user.id,
            full_name: tenant_name,
            email: tenant_email,
            phone: tenant_phone,
            contact_type: "tenant",
          })
          .select("id")
          .single();

        if (contactError) {
          return NextResponse.json(
            { error: "Failed to create tenant contact: " + contactError.message },
            { status: 500 }
          );
        }

        localContactId = newContact.id;

        // Link contact back to application
        await supabase
          .from("pm_applications")
          .update({ pm_contact_id: localContactId })
          .eq("id", pm_application_id);
      }
    } else {
      // Creating lease without application - find or create contact
      const { data: existingContact } = await supabase
        .from("pm_contacts")
        .select("id, ghl_contact_id")
        .eq("agent_id", userData.user.id)
        .eq("email", tenant_email)
        .eq("contact_type", "tenant")
        .maybeSingle();

      if (existingContact) {
        localContactId = existingContact.id;
        ghlContactId = existingContact.ghl_contact_id || null;

        // Update the contact with latest info
        await supabase
          .from("pm_contacts")
          .update({
            full_name: tenant_name,
            phone: tenant_phone,
            updated_at: new Date().toISOString(),
          })
          .eq("id", localContactId);
      } else {
        // Create new contact
        const { data: newContact, error: contactError } = await supabase
          .from("pm_contacts")
          .insert({
            agent_id: userData.user.id,
            full_name: tenant_name,
            email: tenant_email,
            phone: tenant_phone,
            contact_type: "tenant",
          })
          .select("id")
          .single();

        if (contactError) {
          console.error("Error creating local contact:", contactError);
          return NextResponse.json(
            { error: "Failed to create tenant contact: " + contactError.message },
            { status: 500 }
          );
        }

        localContactId = newContact.id;
      }
    }

    // If GHL integration enabled and no GHL contact exists yet, create one
    if (hasGHLIntegration && !ghlContactId) {
      const ghlClient = new GHLClient(integration!.ghl_access_token!);
      try {
        const searchResult = await ghlClient.searchContacts({ email: tenant_email });
        if (searchResult.contacts && searchResult.contacts.length > 0) {
          ghlContactId = searchResult.contacts[0].id!;
        } else {
          // Create new contact in GHL
          const newContact = await ghlClient.createContact({
            locationId: integration!.ghl_location_id!,
            firstName: tenant_name.split(" ")[0],
            lastName: tenant_name.split(" ").slice(1).join(" "),
            name: tenant_name,
            email: tenant_email,
            phone: tenant_phone,
            tags: ["tenant", "pm-module"],
          });
          ghlContactId = newContact.id!;
        }

        // Update local contact with GHL ID
        await supabase
          .from("pm_contacts")
          .update({ ghl_contact_id: ghlContactId })
          .eq("id", localContactId);
      } catch (ghlError) {
        console.error("Error creating/finding tenant in GHL:", ghlError);
        console.warn("⚠️ GHL tenant creation failed, continuing without GHL");
        ghlContactId = null;
      }
    }

    // Build move_out_requirements JSONB
    const move_out_requirements: any = {};
    if (custom_requirements) {
      move_out_requirements.custom = custom_requirements;
    }

    // Create lease record first (without GHL contract ID)
    const { data: lease, error: leaseError } = await supabase
      .from("pm_leases")
      .insert({
        agent_id: userData.user.id,
        pm_property_id,
        pm_unit_id: pm_unit_id || null,
        pm_application_id: pm_application_id || null,
        tenant_contact_id: localContactId,
        lease_type: "fixed-term",
        lease_start_date,
        lease_end_date,
        monthly_rent: parseFloat(monthly_rent),
        security_deposit: parseFloat(security_deposit),
        pet_deposit: pet_deposit ? parseFloat(pet_deposit) : null,
        rent_due_day: parseInt(rent_due_day),
        notice_period_days: parseInt(notice_period_days),
        status: "pending-signature",
        auto_invoice_enabled: true,
        lease_document_type,
        lease_document_url: custom_lease_url || null,
        requires_professional_carpet_cleaning,
        requires_professional_house_cleaning,
        move_out_requirements,
      })
      .select()
      .single();

    if (leaseError) {
      console.error("Error creating lease:", leaseError);
      return NextResponse.json(
        { error: leaseError.message },
        { status: 500 }
      );
    }

    // Prepare lease data for GHL contract
    const leaseData = {
      id: lease.id,
      agent_id: userData.user.id,
      pm_property_id,
      pm_unit_id,
      tenant_name,
      tenant_email,
      tenant_phone,
      lease_start_date,
      lease_end_date,
      monthly_rent: parseFloat(monthly_rent),
      security_deposit: parseFloat(security_deposit),
      pet_deposit: pet_deposit ? parseFloat(pet_deposit) : 0,
      rent_due_day: parseInt(rent_due_day),
      notice_period_days: parseInt(notice_period_days),
      requires_professional_carpet_cleaning,
      requires_professional_house_cleaning,
      custom_requirements,
      lease_document_type,
      lease_document_url: custom_lease_url,
      property_address: property.address,
      unit_number: unitNumber,
      agent_name: agent.display_name,
      agent_email: agent.email,
    };

    // Create GHL contract (if integration enabled and GHL contact was created)
    let ghlContractId: string | null = null;
    if (hasGHLIntegration && ghlContactId) {
      const ghlClient = new GHLClient(integration!.ghl_access_token!);
      try {
        // Get GHL template ID from environment (optional)
        const ghlTemplateId = process.env.GHL_LEASE_TEMPLATE_ID;

        // Prepare contract data
        const contractData = prepareGHLContract(
          leaseData,
          integration!.ghl_location_id!,
          ghlContactId,
          ghlTemplateId
        );

        // Create contract in GHL
        const { id: contractId } = await ghlClient.createContract(contractData);
        ghlContractId = contractId;

        // Send contract for signature
        await ghlClient.sendContractForSignature(contractId);

        // Update lease with GHL contract ID
        await supabase
          .from("pm_leases")
          .update({ ghl_contract_id: contractId })
          .eq("id", lease.id);

        console.log(`✅ GHL Contract created and sent: ${contractId}`);
      } catch (ghlError) {
        console.error("Error creating GHL contract:", ghlError);
        // Don't fail the entire request - lease is created, just log the error
        // Agent can manually send contract from lease detail page
        console.warn("⚠️ Lease created but contract sending failed. Agent can resend manually.");
      }
    }

    return NextResponse.json({
      success: true,
      lease_id: lease.id,
      lease: {
        ...lease,
        ghl_contract_id: ghlContractId,
      },
      message: ghlContractId
        ? "Lease created and contract sent for signature"
        : "Lease created successfully.",
    });
  } catch (error) {
    console.error("Error in lease create route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
