/**
 * Lease to PandaDoc Document Mapping Service
 *
 * Converts lease data from our database into PandaDoc document format
 */

import {
  PandaDocRecipient,
  PandaDocToken,
  CreateDocumentFromTemplateParams,
  PandaDocPricingItem,
} from "./pandadoc-client";

export type LeaseDataForPandaDoc = {
  id: string;
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
  // Property data
  property_address: string;
  unit_number?: string | null;
  // Agent data
  agent_name: string;
  agent_email: string;
};

/**
 * Prepare PandaDoc document from lease data
 * @param leaseData - Lease data from database
 * @param templateId - PandaDoc template UUID
 * @param includePayment - Whether to include payment collection for move-in charges
 * @returns PandaDoc document creation parameters
 */
export function preparePandaDocLease(
  leaseData: LeaseDataForPandaDoc,
  templateId: string,
  includePayment: boolean = true
): CreateDocumentFromTemplateParams {
  const fullAddress = leaseData.unit_number
    ? `${leaseData.property_address}, Unit ${leaseData.unit_number}`
    : leaseData.property_address;

  const documentName = `Lease Agreement - ${fullAddress}`;

  // Split tenant name into first and last
  const nameParts = leaseData.tenant_name.trim().split(" ");
  const tenantFirstName = nameParts[0] || "";
  const tenantLastName = nameParts.slice(1).join(" ") || "";

  // Split agent name into first and last
  const agentNameParts = leaseData.agent_name.trim().split(" ");
  const agentFirstName = agentNameParts[0] || "";
  const agentLastName = agentNameParts.slice(1).join(" ") || "";

  // Define recipients (signers)
  const recipients: PandaDocRecipient[] = [
    {
      email: leaseData.tenant_email,
      first_name: tenantFirstName,
      last_name: tenantLastName,
      role: "Tenant",
      signing_order: 1,
    },
    {
      email: leaseData.agent_email,
      first_name: agentFirstName,
      last_name: agentLastName,
      role: "Landlord",
      signing_order: 2,
    },
  ];

  // Format dates
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

  // Define tokens (merge fields) for the template
  const tokens: PandaDocToken[] = [
    // Property Information
    { name: "property_address", value: fullAddress },
    { name: "unit_number", value: leaseData.unit_number || "N/A" },

    // Tenant Information
    { name: "tenant_name", value: leaseData.tenant_name },
    { name: "tenant_first_name", value: tenantFirstName },
    { name: "tenant_last_name", value: tenantLastName },
    { name: "tenant_email", value: leaseData.tenant_email },
    { name: "tenant_phone", value: leaseData.tenant_phone || "" },

    // Landlord Information
    { name: "landlord_name", value: leaseData.agent_name },
    { name: "landlord_first_name", value: agentFirstName },
    { name: "landlord_last_name", value: agentLastName },
    { name: "landlord_email", value: leaseData.agent_email },

    // Lease Terms
    { name: "lease_start_date", value: formatDate(leaseData.lease_start_date) },
    { name: "lease_end_date", value: formatDate(leaseData.lease_end_date) },
    { name: "monthly_rent", value: `$${leaseData.monthly_rent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { name: "monthly_rent_amount", value: leaseData.monthly_rent.toString() },
    { name: "security_deposit", value: `$${leaseData.security_deposit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { name: "security_deposit_amount", value: leaseData.security_deposit.toString() },
    { name: "pet_deposit", value: `$${(leaseData.pet_deposit || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { name: "pet_deposit_amount", value: (leaseData.pet_deposit || 0).toString() },
    { name: "rent_due_day", value: leaseData.rent_due_day.toString() },
    { name: "notice_period_days", value: leaseData.notice_period_days.toString() },

    // Move-Out Requirements
    { name: "move_out_requirements", value: moveOutText },

    // Current Date (for contract date)
    { name: "contract_date", value: formatDate(new Date().toISOString()) },
  ];

  // Build document parameters
  const documentParams: CreateDocumentFromTemplateParams = {
    name: documentName,
    template_uuid: templateId,
    recipients,
    tokens,
    metadata: {
      lease_id: leaseData.id,
      property_address: fullAddress,
      tenant_email: leaseData.tenant_email,
    },
    tags: ["lease", "property-management"],
  };

  // Add pricing table for move-in charges if payment collection is enabled
  if (includePayment) {
    const pricingItems: PandaDocPricingItem[] = [
      {
        name: "First Month's Rent",
        description: `Rent for ${fullAddress}`,
        price: leaseData.monthly_rent,
        qty: 1,
      },
      {
        name: "Security Deposit",
        description: "Refundable security deposit",
        price: leaseData.security_deposit,
        qty: 1,
      },
    ];

    // Add pet deposit if applicable
    if (leaseData.pet_deposit && leaseData.pet_deposit > 0) {
      pricingItems.push({
        name: "Pet Deposit",
        description: "Refundable pet deposit",
        price: leaseData.pet_deposit,
        qty: 1,
      });
    }

    documentParams.pricing_tables = [
      {
        name: "Move-In Charges",
        data_merge: true,
        options: {
          currency: "USD",
        },
        sections: [
          {
            title: "Move-In Charges",
            default: true,
            rows: pricingItems,
          },
        ],
      },
    ];
  }

  return documentParams;
}

/**
 * Calculate total move-in charges
 */
export function calculateMoveInTotal(leaseData: LeaseDataForPandaDoc): number {
  return (
    leaseData.monthly_rent +
    leaseData.security_deposit +
    (leaseData.pet_deposit || 0)
  );
}
