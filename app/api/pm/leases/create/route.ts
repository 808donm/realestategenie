import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { prepareGHLContract, prepareFirstMonthInvoice } from "@/lib/integrations/lease-to-ghl-contract";
import { PandaDocClient } from "@/lib/integrations/pandadoc-client";
import { preparePandaDocLease } from "@/lib/integrations/lease-to-pandadoc";

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
      esignature_provider, // 'ghl', 'pandadoc', or null
      pandadoc_template_id, // Optional: specific template for PandaDoc
      // New lease fields for GHL Documents
      subletting_allowed,
      pets_allowed,
      pet_count,
      pet_types,
      pet_weight_limit,
      authorized_occupants,
      late_fee_is_percentage,
      late_fee_amount,
      late_fee_percentage,
      late_fee_frequency,
      late_grace_days,
      nsf_fee,
      deposit_return_days,
    } = body;

    // Validate required fields
    if (!pm_property_id || !tenant_name || !tenant_email || !lease_start_date || !lease_end_date || !monthly_rent || !security_deposit) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get agent's integrations (GHL and PandaDoc)
    const { data: integrations } = await supabase
      .from("integrations")
      .select("*")
      .eq("agent_id", userData.user.id);

    const ghlIntegration = integrations?.find((i) => i.provider === "ghl");
    const pandadocIntegration = integrations?.find((i) => i.provider === "pandadoc");

    const hasGHLIntegration = !!(ghlIntegration?.config?.ghl_access_token && ghlIntegration?.config?.ghl_location_id);
    const hasPandaDocIntegration = !!(pandadocIntegration?.config?.api_key && pandadocIntegration?.status === "connected");

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
      const ghlClient = new GHLClient(
        ghlIntegration!.config.ghl_access_token!,
        ghlIntegration!.config.ghl_location_id!
      );
      try {
        const searchResult = await ghlClient.searchContacts({ email: tenant_email });
        if (searchResult.contacts && searchResult.contacts.length > 0) {
          ghlContactId = searchResult.contacts[0].id!;
        } else {
          // Create new contact in GHL
          const newContact = await ghlClient.createContact({
            locationId: ghlIntegration!.config.ghl_location_id!,
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
        // New GHL Documents fields
        subletting_allowed: subletting_allowed || false,
        pets_allowed: pets_allowed || false,
        pet_count: pet_count || 0,
        pet_types: pet_types || null,
        pet_weight_limit: pet_weight_limit || null,
        authorized_occupants: authorized_occupants || null,
        late_fee_is_percentage: late_fee_is_percentage || false,
        late_fee_amount: late_fee_amount ? parseFloat(late_fee_amount) : 50.00,
        late_fee_percentage: late_fee_percentage ? parseFloat(late_fee_percentage) : 5.00,
        late_fee_frequency: late_fee_frequency || 'per occurrence',
        late_grace_days: late_grace_days || 5,
        nsf_fee: nsf_fee || 35.00,
        deposit_return_days: deposit_return_days || 60,
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
    let pandadocDocumentId: string | null = null;
    let pandadocDocumentUrl: string | null = null;

    // E-signature provider selection logic:
    // 1. If explicitly set, use that provider
    // 2. If not set, default to GHL (free) if available
    // 3. Fallback to PandaDoc only if GHL not available
    const useGHL = esignature_provider === "ghl" || (!esignature_provider && hasGHLIntegration);
    const usePandaDoc = esignature_provider === "pandadoc" || (!esignature_provider && !hasGHLIntegration && hasPandaDocIntegration);

    if (useGHL && hasGHLIntegration) {
      try {
        // Use new GHL Documents client for "Upsert-then-Dispatch" pattern
        const { sendLeaseViaGHL } = await import("@/lib/integrations/ghl-documents-client");

        // Get property data with city, state, and zip
        const { data: fullProperty } = await supabase
          .from("pm_properties")
          .select("address, city, state_province, zip_postal_code")
          .eq("id", pm_property_id)
          .single();

        // Prepare landlord notice address
        const landlordNoticeAddress = `${agent.display_name}\n${fullProperty?.address || property.address}\n${fullProperty?.city || ''}, ${fullProperty?.state_province || ''}`;

        // Send lease via GHL Documents (Upsert-then-Dispatch)
        const { contactId: ghlContactIdFromDocs } = await sendLeaseViaGHL(
          ghlIntegration!.config.ghl_access_token!,
          ghlIntegration!.config.ghl_location_id!,
          tenant_email,
          tenant_phone || '',
          {
            tenant_first_name: tenant_name.split(" ")[0] || tenant_name,
            tenant_last_name: tenant_name.split(" ").slice(1).join(" ") || '',
            property_address: unitNumber ? `${property.address}, Unit ${unitNumber}` : property.address,
            property_city: fullProperty?.city || '',
            property_state: fullProperty?.state_province || '',
            property_zipcode: fullProperty?.zip_postal_code || '',
            start_date: lease_start_date,
            end_date: lease_end_date,
            monthly_rent: parseFloat(monthly_rent),
            security_deposit: parseFloat(security_deposit),
            pet_deposit: pet_deposit ? parseFloat(pet_deposit) : 0,
            rent_due_day: parseInt(rent_due_day) || 1,
            notice_period_days: parseInt(notice_period_days) || 30,
            late_grace_days: late_grace_days || 5,
            late_fee_is_percentage: late_fee_is_percentage || false,
            late_fee_amount: late_fee_amount ? parseFloat(late_fee_amount) : 50,
            late_fee_percentage: late_fee_percentage ? parseFloat(late_fee_percentage) : 5,
            late_fee_frequency: late_fee_frequency || 'per occurrence',
            nsf_fee: nsf_fee || 35,
            deposit_return_days: deposit_return_days || 60,
            occupants: authorized_occupants || '',
            subletting_allowed: subletting_allowed || false,
            pets_allowed: pets_allowed || false,
            pet_count: pet_count || 0,
            pet_types: pet_types || '',
            pet_weight_limit: pet_weight_limit || '',
            landlord_notice_address: landlordNoticeAddress,
          }
        );

        // Update lease with GHL contact ID
        await supabase
          .from("pm_leases")
          .update({
            ghl_contact_id: ghlContactIdFromDocs,
            esignature_provider: "ghl",
          })
          .eq("id", lease.id);

        console.log(`✅ GHL Documents workflow initiated. Contact updated with lease data and trigger tag added.`);
        console.log(`   GHL workflow will detect tag and send document automatically.`);

      } catch (ghlError) {
        console.error("Error with GHL Documents workflow:", ghlError);
        // Don't fail the entire request - lease is created, just log the error
        // Agent can manually send contract from lease detail page
        console.warn("⚠️ Lease created but GHL Documents workflow failed. Agent can resend manually.");
      }
    }

    // Create PandaDoc document (if PandaDoc integration is enabled)
    if (usePandaDoc && hasPandaDocIntegration) {
      const pandadocEnvironment = pandadocIntegration!.config.environment || "production";
      const pandadocClient = new PandaDocClient(pandadocIntegration!.config.api_key!, pandadocEnvironment);
      try {
        // Determine template ID: use specific template if provided, otherwise use default from integration
        const templateId = pandadoc_template_id || pandadocIntegration!.config.default_template_id;

        if (!templateId) {
          throw new Error("No PandaDoc template ID specified. Please set a default template or provide one.");
        }

        // Prepare document from lease data
        const documentParams = preparePandaDocLease(leaseData, templateId, true);

        // Create document
        const document = await pandadocClient.createDocumentFromTemplate(documentParams);
        pandadocDocumentId = document.id;

        console.log(`✅ PandaDoc document created: ${pandadocDocumentId}`);

        // Wait a moment for document to be ready (PandaDoc processes documents async)
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Send for signature
        await pandadocClient.sendDocument(pandadocDocumentId, {
          subject: `Lease Agreement - ${leaseData.property_address}`,
          message: "Please review and sign this lease agreement.",
        });

        // Get document link
        try {
          const linkData = await pandadocClient.createDocumentLink(pandadocDocumentId);
          pandadocDocumentUrl = linkData.url;
        } catch (linkError) {
          console.warn("Could not create document link:", linkError);
        }

        // Update lease with PandaDoc document ID
        await supabase
          .from("pm_leases")
          .update({
            pandadoc_document_id: pandadocDocumentId,
            pandadoc_document_url: pandadocDocumentUrl,
            esignature_provider: "pandadoc",
          })
          .eq("id", lease.id);

        console.log(`✅ PandaDoc document sent for signature: ${pandadocDocumentId}`);
      } catch (pandadocError) {
        console.error("Error creating PandaDoc document:", pandadocError);
        // Don't fail the entire request - lease is created, just log the error
        console.warn("⚠️ Lease created but PandaDoc document creation failed. Agent can create manually.");
      }
    }

    // Determine success message based on which provider was used
    let message = "Lease created successfully.";
    if (useGHL && hasGHLIntegration) {
      message = "Lease created. GHL workflow will send document for signature automatically.";
    } else if (pandadocDocumentId) {
      message = "Lease created and PandaDoc document sent for signature";
    }

    return NextResponse.json({
      success: true,
      lease_id: lease.id,
      lease: {
        ...lease,
        ghl_contract_id: ghlContractId,
        pandadoc_document_id: pandadocDocumentId,
        pandadoc_document_url: pandadocDocumentUrl,
        esignature_provider: useGHL && hasGHLIntegration ? "ghl" : pandadocDocumentId ? "pandadoc" : null,
      },
      message,
    });
  } catch (error) {
    console.error("Error in lease create route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
