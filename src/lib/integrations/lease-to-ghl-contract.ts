/**
 * Lease to GHL Contract Mapping Service
 *
 * Converts lease data from our database into GHL Contract format
 * Handles both standard template-based contracts and custom PDF uploads
 */

import { GHLContract } from "./ghl-client";

export type LeaseData = {
  id: string;
  agent_id: string;
  pm_property_id: string;
  pm_unit_id?: string | null;
  tenant_name: string;
  tenant_email: string;
  tenant_phone?: string | null;
  lease_start_date: string;
  lease_end_date: string;
  monthly_rent: number;
  security_deposit: number;
  pet_deposit?: number;
  rent_due_day: number;
  notice_period_days: number;
  requires_professional_carpet_cleaning?: boolean;
  requires_professional_house_cleaning?: boolean;
  custom_requirements?: string | null;
  lease_document_type: "standard" | "custom";
  lease_document_url?: string | null;
  // Property data
  property_address: string;
  unit_number?: string | null;
  // Agent data
  agent_name: string;
  agent_email: string;
};

/**
 * Prepare GHL contract data from lease information
 * @param leaseData - Lease data from database
 * @param ghlLocationId - GHL location ID for this agent
 * @param ghlContactId - GHL contact ID for the tenant
 * @param ghlTemplateId - Optional: GHL template ID for standard leases
 * @returns GHL contract object ready to be created
 */
export function prepareGHLContract(
  leaseData: LeaseData,
  ghlLocationId: string,
  ghlContactId: string,
  ghlTemplateId?: string
): GHLContract {
  const fullAddress = leaseData.unit_number
    ? `${leaseData.property_address}, Unit ${leaseData.unit_number}`
    : leaseData.property_address;

  const contractTitle = `Lease Agreement - ${fullAddress}`;

  // Base contract structure
  const contract: GHLContract = {
    locationId: ghlLocationId,
    title: contractTitle,
    contactId: ghlContactId,
    signers: [
      {
        email: leaseData.tenant_email,
        name: leaseData.tenant_name,
        role: "tenant",
      },
      {
        email: leaseData.agent_email,
        name: leaseData.agent_name,
        role: "landlord",
      },
    ],
  };

  // Handle custom lease upload
  if (leaseData.lease_document_type === "custom" && leaseData.lease_document_url) {
    contract.customDocument = {
      fileUrl: leaseData.lease_document_url,
      fileName: `lease-${leaseData.id}.pdf`,
    };
  }
  // Handle standard template
  else if (ghlTemplateId) {
    contract.templateId = ghlTemplateId;
    contract.fields = buildTemplateFields(leaseData);
  }

  return contract;
}

/**
 * Build merge fields for GHL lease template
 * These fields will auto-populate the template
 */
function buildTemplateFields(leaseData: LeaseData): Array<{ key: string; value: string }> {
  const fullAddress = leaseData.unit_number
    ? `${leaseData.property_address}, Unit ${leaseData.unit_number}`
    : leaseData.property_address;

  // Format dates for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Build move-out requirements text
  const moveOutRequirements: string[] = [];
  if (leaseData.requires_professional_carpet_cleaning) {
    moveOutRequirements.push("Professional carpet cleaning");
  }
  if (leaseData.requires_professional_house_cleaning) {
    moveOutRequirements.push("Professional house cleaning");
  }
  if (leaseData.custom_requirements) {
    moveOutRequirements.push(leaseData.custom_requirements);
  }
  const moveOutText =
    moveOutRequirements.length > 0
      ? moveOutRequirements.join("; ")
      : "Standard cleaning as per lease agreement";

  return [
    // Property Information
    { key: "property_address", value: fullAddress },
    { key: "unit_number", value: leaseData.unit_number || "N/A" },

    // Tenant Information
    { key: "tenant_name", value: leaseData.tenant_name },
    { key: "tenant_email", value: leaseData.tenant_email },
    { key: "tenant_phone", value: leaseData.tenant_phone || "" },

    // Landlord Information
    { key: "landlord_name", value: leaseData.agent_name },
    { key: "landlord_email", value: leaseData.agent_email },

    // Lease Terms
    { key: "lease_start_date", value: formatDate(leaseData.lease_start_date) },
    { key: "lease_end_date", value: formatDate(leaseData.lease_end_date) },
    { key: "monthly_rent", value: `$${leaseData.monthly_rent.toFixed(2)}` },
    { key: "security_deposit", value: `$${leaseData.security_deposit.toFixed(2)}` },
    { key: "pet_deposit", value: `$${(leaseData.pet_deposit || 0).toFixed(2)}` },
    { key: "rent_due_day", value: leaseData.rent_due_day.toString() },
    { key: "notice_period_days", value: leaseData.notice_period_days.toString() },

    // Move-Out Requirements
    { key: "move_out_requirements", value: moveOutText },

    // Current Date (for contract date)
    { key: "contract_date", value: formatDate(new Date().toISOString()) },
  ];
}

/**
 * Prepare first month's invoice data for a new lease
 * @param leaseData - Lease data from database
 * @param ghlLocationId - GHL location ID
 * @param ghlContactId - GHL contact ID for tenant
 * @returns Invoice data ready for GHL
 */
export function prepareFirstMonthInvoice(
  leaseData: LeaseData,
  ghlLocationId: string,
  ghlContactId: string
) {
  const fullAddress = leaseData.unit_number
    ? `${leaseData.property_address}, Unit ${leaseData.unit_number}`
    : leaseData.property_address;

  // Calculate due date (use lease start date)
  const dueDate = new Date(leaseData.lease_start_date).toISOString().split("T")[0];

  // Build invoice items
  const items = [
    {
      name: "First Month's Rent",
      description: `Rent for ${fullAddress}`,
      price: leaseData.monthly_rent,
      quantity: 1,
    },
    {
      name: "Security Deposit",
      description: "Refundable security deposit",
      price: leaseData.security_deposit,
      quantity: 1,
    },
  ];

  // Add pet deposit if applicable
  if (leaseData.pet_deposit && leaseData.pet_deposit > 0) {
    items.push({
      name: "Pet Deposit",
      description: "Refundable pet deposit",
      price: leaseData.pet_deposit,
      quantity: 1,
    });
  }

  return {
    locationId: ghlLocationId,
    contactId: ghlContactId,
    title: `Move-In Charges - ${fullAddress}`,
    currency: "USD",
    dueDate,
    items,
    status: "draft" as const,
  };
}
