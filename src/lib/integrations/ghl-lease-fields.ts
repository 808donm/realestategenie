/**
 * GHL Custom Fields Schema for Residential Leases
 *
 * This file defines all custom fields required in GoHighLevel for the
 * Standard Residential Lease Agreement automation.
 *
 * SETUP: Create these fields once in GHL Settings → Custom Fields → Contact Fields
 * Then create a snapshot to replicate to all agent sub-accounts.
 */

export interface GHLCustomField {
  key: string;
  name: string;
  type: 'TEXT' | 'TEXTAREA' | 'DATE' | 'NUMERICAL' | 'MONETARY' | 'DROPDOWN' | 'CHECKBOX';
  default?: string;
  options?: string[];
  description?: string;
}

export const GHL_LEASE_CUSTOM_FIELDS: GHLCustomField[] = [
  // ========================================
  // PROPERTY INFORMATION
  // ========================================
  {
    key: 'lease_property_address',
    name: 'Property Address',
    type: 'TEXT',
    description: 'Full property address including unit number'
  },
  {
    key: 'lease_property_city',
    name: 'Property City',
    type: 'TEXT',
    description: 'City where property is located'
  },
  {
    key: 'lease_property_state',
    name: 'Property State',
    type: 'TEXT',
    description: 'State where property is located'
  },
  {
    key: 'lease_property_zipcode',
    name: 'Property Zip Code',
    type: 'TEXT',
    description: 'Zip code where property is located'
  },

  // ========================================
  // LEASE TERM
  // ========================================
  {
    key: 'lease_start_date',
    name: 'Lease Start Date',
    type: 'DATE',
    description: 'Date when lease term begins'
  },
  {
    key: 'lease_end_date',
    name: 'Lease End Date',
    type: 'DATE',
    description: 'Date when initial lease term ends'
  },
  {
    key: 'lease_notice_days',
    name: 'Termination Notice Days',
    type: 'NUMERICAL',
    default: '30',
    description: 'Days notice required for month-to-month termination'
  },

  // ========================================
  // RENT & PAYMENT TERMS
  // ========================================
  {
    key: 'lease_monthly_rent',
    name: 'Monthly Rent',
    type: 'MONETARY',
    description: 'Monthly rent amount'
  },
  {
    key: 'lease_rent_due_day',
    name: 'Rent Due Day',
    type: 'NUMERICAL',
    default: '1',
    description: 'Day of month rent is due (1-31)'
  },
  {
    key: 'lease_late_grace_days',
    name: 'Late Fee Grace Period',
    type: 'NUMERICAL',
    default: '5',
    description: 'Days after due date before late fee applies'
  },
  {
    key: 'lease_late_fee_is_percentage',
    name: 'Late Fee Is Percentage',
    type: 'CHECKBOX',
    description: 'If checked, charge percentage of rent; if unchecked, charge fixed amount'
  },
  {
    key: 'lease_late_fee_fixed_checkbox',
    name: 'Late Fee Fixed Amount Checkbox',
    type: 'TEXT',
    description: 'Checkbox symbol for fixed dollar amount option (☑ if fixed, ☐ if percentage)'
  },
  {
    key: 'lease_late_fee_percentage_checkbox',
    name: 'Late Fee Percentage Checkbox',
    type: 'TEXT',
    description: 'Checkbox symbol for percentage option (☐ if fixed, ☑ if percentage)'
  },
  {
    key: 'lease_late_fee_amount',
    name: 'Late Fee Fixed Amount',
    type: 'MONETARY',
    default: '50.00',
    description: 'Late fee fixed dollar amount (used when "Is Percentage" is unchecked)'
  },
  {
    key: 'lease_late_fee_percentage',
    name: 'Late Fee Percentage',
    type: 'NUMERICAL',
    default: '5',
    description: 'Late fee as percentage of rent (e.g., "5" for 5%, used when "Is Percentage" is checked)'
  },
  {
    key: 'lease_late_fee_frequency',
    name: 'Late Fee Frequency',
    type: 'DROPDOWN',
    options: ['per occurrence', 'per day'],
    default: 'per occurrence',
    description: 'How late fee accrues: once per late payment or daily while overdue'
  },
  {
    key: 'lease_late_fee_per_occurrence_checkbox',
    name: 'Late Fee Per Occurrence Checkbox',
    type: 'TEXT',
    description: 'Checkbox symbol for per occurrence option (☑ if per occurrence, ☐ if per day)'
  },
  {
    key: 'lease_late_fee_per_day_checkbox',
    name: 'Late Fee Per Day Checkbox',
    type: 'TEXT',
    description: 'Checkbox symbol for per day option (☐ if per occurrence, ☑ if per day)'
  },
  {
    key: 'lease_nsf_fee',
    name: 'NSF Check Fee',
    type: 'MONETARY',
    default: '35.00',
    description: 'Fee for returned/insufficient funds check'
  },
  {
    key: 'lease_increase_notice',
    name: 'Rent Increase Notice Days',
    type: 'NUMERICAL',
    default: '30',
    description: 'Days notice required for rent increase'
  },

  // ========================================
  // SECURITY DEPOSIT
  // ========================================
  {
    key: 'lease_security_deposit',
    name: 'Security Deposit',
    type: 'MONETARY',
    description: 'Security deposit amount'
  },
  {
    key: 'lease_deposit_return_days',
    name: 'Deposit Return Days',
    type: 'NUMERICAL',
    default: '60',
    description: 'Days to return security deposit after move-out (state-specific)'
  },

  // ========================================
  // OCCUPANTS
  // ========================================
  {
    key: 'lease_occupants',
    name: 'Authorized Occupants',
    type: 'TEXTAREA',
    description: 'Full names of all authorized occupants (comma-separated)'
  },

  // ========================================
  // SUBLETTING
  // ========================================
  {
    key: 'lease_subletting_allowed',
    name: 'Subletting Allowed',
    type: 'CHECKBOX',
    description: 'Whether tenant may sublet the property'
  },
  {
    key: 'lease_subletting_allowed_checkbox',
    name: 'Subletting Allowed Checkbox',
    type: 'TEXT',
    description: 'Checkbox symbol for "Subletting Allowed" option (☑ if allowed, ☐ if not)'
  },
  {
    key: 'lease_subletting_not_allowed_checkbox',
    name: 'Subletting Not Allowed Checkbox',
    type: 'TEXT',
    description: 'Checkbox symbol for "Subletting Not Allowed" option (☐ if allowed, ☑ if not)'
  },

  // ========================================
  // PET POLICY
  // ========================================
  {
    key: 'lease_pets_allowed',
    name: 'Pets Allowed',
    type: 'CHECKBOX',
    description: 'Whether pets are allowed on property'
  },
  {
    key: 'lease_pets_allowed_checkbox',
    name: 'Pets Allowed Checkbox',
    type: 'TEXT',
    description: 'Checkbox symbol for "Pets Allowed" option (☑ if allowed, ☐ if not)'
  },
  {
    key: 'lease_pets_not_allowed_checkbox',
    name: 'Pets Not Allowed Checkbox',
    type: 'TEXT',
    description: 'Checkbox symbol for "Pets Not Allowed" option (☐ if allowed, ☑ if not)'
  },
  {
    key: 'lease_pet_count',
    name: 'Number of Pets',
    type: 'NUMERICAL',
    default: '0',
    description: 'Maximum number of pets allowed'
  },
  {
    key: 'lease_pet_types',
    name: 'Pet Types',
    type: 'TEXT',
    description: 'Allowed pet types (e.g., "Dogs, Cats")'
  },
  {
    key: 'lease_pet_weight_limit',
    name: 'Pet Weight Limit',
    type: 'TEXT',
    description: 'Maximum pet weight (e.g., "50 pounds")'
  },
  {
    key: 'lease_pet_deposit',
    name: 'Pet Deposit (per pet)',
    type: 'MONETARY',
    default: '0',
    description: 'Deposit amount per pet'
  },

  // ========================================
  // LANDLORD INFORMATION (for notices)
  // ========================================
  {
    key: 'lease_landlord_notice_address',
    name: 'Landlord Notice Address',
    type: 'TEXTAREA',
    description: 'Address where tenant should send notices to landlord'
  },
];

/**
 * Field groups for GHL UI organization
 */
export const GHL_LEASE_FIELD_GROUPS = {
  property: ['lease_property_address', 'lease_property_city', 'lease_property_state', 'lease_property_zipcode'],
  term: ['lease_start_date', 'lease_end_date', 'lease_notice_days'],
  rent: [
    'lease_monthly_rent',
    'lease_rent_due_day',
    'lease_late_grace_days',
    'lease_late_fee_is_percentage',
    'lease_late_fee_fixed_checkbox',
    'lease_late_fee_percentage_checkbox',
    'lease_late_fee_amount',
    'lease_late_fee_percentage',
    'lease_late_fee_frequency',
    'lease_late_fee_per_occurrence_checkbox',
    'lease_late_fee_per_day_checkbox',
    'lease_nsf_fee',
    'lease_increase_notice',
  ],
  deposit: ['lease_security_deposit', 'lease_deposit_return_days'],
  occupants: ['lease_occupants'],
  subletting: ['lease_subletting_allowed', 'lease_subletting_allowed_checkbox', 'lease_subletting_not_allowed_checkbox'],
  pets: [
    'lease_pets_allowed',
    'lease_pets_allowed_checkbox',
    'lease_pets_not_allowed_checkbox',
    'lease_pet_count',
    'lease_pet_types',
    'lease_pet_weight_limit',
    'lease_pet_deposit',
  ],
  landlord: ['lease_landlord_notice_address'],
};

/**
 * Helper to get field by key
 */
export function getLeaseField(key: string): GHLCustomField | undefined {
  return GHL_LEASE_CUSTOM_FIELDS.find(field => field.key === key);
}

/**
 * Helper to validate required fields are present
 */
export function validateRequiredLeaseFields(data: Record<string, any>): string[] {
  const required = [
    'lease_property_address',
    'lease_start_date',
    'lease_end_date',
    'lease_monthly_rent',
    'lease_security_deposit',
  ];

  const missing: string[] = [];

  for (const key of required) {
    if (!data[key] || data[key] === '') {
      const field = getLeaseField(key);
      missing.push(field?.name || key);
    }
  }

  return missing;
}
