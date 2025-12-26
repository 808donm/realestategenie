import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

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
    if (!pm_property_id || !tenant_name || !lease_start_date || !lease_end_date || !monthly_rent || !security_deposit) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // TODO: Create tenant as contact in agents table or GHL
    // For now, we'll use a placeholder tenant_contact_id
    // In production, this should create/find the contact first

    // Build move_out_requirements JSONB
    const move_out_requirements: any = {};
    if (custom_requirements) {
      move_out_requirements.custom = custom_requirements;
    }

    // Create lease
    const { data: lease, error: leaseError } = await supabase
      .from("pm_leases")
      .insert({
        agent_id: userData.user.id,
        pm_property_id,
        pm_unit_id: pm_unit_id || null,
        pm_application_id: pm_application_id || null,
        tenant_contact_id: userData.user.id, // TEMP: Using agent_id as placeholder
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

    // TODO: Create GHL contract and store ghl_contract_id
    // This will be implemented when we add GHL contract integration

    // TODO: Trigger GHL workflow to send contract for e-signature

    return NextResponse.json({ success: true, lease });
  } catch (error) {
    console.error("Error in lease create route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
