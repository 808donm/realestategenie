# GoHighLevel Lease Automation Setup Guide

## Overview
This guide explains how to set up GoHighLevel Documents & Contracts for automated residential lease signing. Once configured in the master sub-account, you can create a **snapshot** to replicate this setup across all agent sub-accounts.

## Prerequisites
- GoHighLevel SaaS Pro or Agency account
- Documents & Contracts feature enabled
- Access to Custom Fields settings
- Access to Workflows/Automations

---

## Part 1: Custom Fields Setup (One-Time)

### Step 1: Navigate to Custom Fields
1. Log into your GHL sub-account
2. Go to **Settings** → **Custom Fields**
3. Select **Contact** tab

### Step 2: Create Lease Custom Fields

Create the following custom fields **exactly as specified**:

#### Property Information
| Field Name | Field Key | Data Type | Notes |
|------------|-----------|-----------|-------|
| Property Address | `lease_property_address` | Text | Full address with unit |
| Property City | `lease_property_city` | Text | |
| Property State | `lease_property_state` | Text | |

#### Lease Term
| Field Name | Field Key | Data Type | Default Value |
|------------|-----------|-----------|---------------|
| Lease Start Date | `lease_start_date` | Date | |
| Lease End Date | `lease_end_date` | Date | |
| Termination Notice Days | `lease_notice_days` | Number | 30 |

#### Rent & Payment
| Field Name | Field Key | Data Type | Default Value |
|------------|-----------|-----------|---------------|
| Monthly Rent | `lease_monthly_rent` | Monetary | |
| Rent Due Day | `lease_rent_due_day` | Number | 1 |
| Late Fee Grace Period | `lease_late_grace_days` | Number | 5 |
| Late Fee Amount | `lease_late_fee_amount` | Text | $50.00 |
| Late Fee Type | `lease_late_fee_type` | Dropdown | per occurrence |
| NSF Check Fee | `lease_nsf_fee` | Monetary | 35.00 |
| Rent Increase Notice Days | `lease_increase_notice` | Number | 30 |

**Late Fee Type Options:** `per day`, `per occurrence`

#### Security Deposit
| Field Name | Field Key | Data Type | Default Value |
|------------|-----------|-----------|---------------|
| Security Deposit | `lease_security_deposit` | Monetary | |
| Deposit Return Days | `lease_deposit_return_days` | Number | 60 |

#### Occupants
| Field Name | Field Key | Data Type | Notes |
|------------|-----------|-----------|-------|
| Authorized Occupants | `lease_occupants` | Textarea | Comma-separated names |

#### Subletting
| Field Name | Field Key | Data Type | Notes |
|------------|-----------|-----------|-------|
| Subletting Allowed | `lease_subletting_allowed` | Checkbox | |

#### Pet Policy
| Field Name | Field Key | Data Type | Default Value | Notes |
|------------|-----------|-----------|---------------|-------|
| Pets Allowed | `lease_pets_allowed` | Checkbox | | |
| Number of Pets | `lease_pet_count` | Number | 0 | |
| Pet Types | `lease_pet_types` | Text | | e.g., "Dogs, Cats" |
| Pet Weight Limit | `lease_pet_weight_limit` | Text | | e.g., "50 pounds" |
| Pet Deposit (per pet) | `lease_pet_deposit` | Monetary | 0 | |

#### Landlord Information
| Field Name | Field Key | Data Type | Notes |
|------------|-----------|-----------|-------|
| Landlord Notice Address | `lease_landlord_notice_address` | Textarea | Where tenant sends notices |

---

## Part 2: Document Template Setup

### Step 1: Create the Lease Template
1. Go to **Sites** → **Documents & Contracts** → **Templates**
2. Click **+ New Template**
3. Name: `Standard Residential Lease Agreement`
4. Upload the PDF or create from scratch using the builder

### Step 2: Insert Merge Fields

Use the GHL merge field syntax `{{contact.field_key}}` throughout the document:

```
STANDARD LEASE AGREEMENT

THIS AGREEMENT is made this {{right_now.date}}, by and between
the Landlord known as {{user.name}} with a mailing address of
{{user.address}}, City of {{user.city}}, State of {{user.state}}
and the Tenant known as {{contact.first_name}} {{contact.last_name}}
with a mailing address of {{contact.address}}, City of {{contact.city}},
State of {{contact.state}}.

1. PROPERTY. Landlord owns certain real property located at
{{contact.lease_property_address}}, City of {{contact.lease_property_city}},
State of {{contact.lease_property_state}}.

2. TERM. This Lease shall commence on {{contact.lease_start_date}}
and end on {{contact.lease_end_date}} at 11:59 PM.

3. RENT. Tenant shall pay to Landlord the sum of ${{contact.lease_monthly_rent}}
per month. The due date shall be the {{contact.lease_rent_due_day}} day of
each month.

A. Late Rent. If Rent is not paid within {{contact.lease_late_grace_days}}
days of the Due Date, a late fee of {{contact.lease_late_fee_amount}}
shall be applied {{contact.lease_late_fee_type}}.

4. SECURITY DEPOSIT. Tenant shall deposit ${{contact.lease_security_deposit}}
as security deposit. Landlord shall return the deposit within
{{contact.lease_deposit_return_days}} days from the end of the Term.

5. USE OF PROPERTY. The Property shall be occupied solely by Tenant and
immediate family, consisting of: {{contact.lease_occupants}}

13. ANIMALS. {{#if contact.lease_pets_allowed}}
Pets Allowed: Yes
Maximum number: {{contact.lease_pet_count}}
Types allowed: {{contact.lease_pet_types}}
Weight limit: {{contact.lease_pet_weight_limit}}
Pet deposit: ${{contact.lease_pet_deposit}} per pet
{{else}}
No pets allowed on the Property.
{{/if}}

27. NOTICE. Notices to Landlord should be sent to:
{{contact.lease_landlord_notice_address}}
```

### Step 3: Add Signature Blocks
1. Insert signature field for **Tenant** (mapped to Contact)
2. Insert signature field for **Landlord** (mapped to User)
3. Add date fields next to each signature

### Step 4: Save and Activate Template

---

## Part 3: Automation Workflow Setup

### Create "Send Residential Lease" Workflow

1. Go to **Automations** → **+ Create Workflow**
2. Name: `Send Residential Lease`
3. Status: **Published**

#### Trigger Configuration
- **Trigger Type:** Contact Tag Added
- **Tag Filter:** `trigger-send-lease`
- **Filter Conditions:** None (accepts all)

#### Action 1: Send Documents & Contracts
- **Action:** Send Documents & Contracts
- **Template:** Standard Residential Lease Agreement
- **Send To:** Contact Email
- **Subject:** `Action Required: Your Lease Agreement for {{contact.lease_property_address}}`
- **Message (optional):**
  ```
  Hi {{contact.first_name}},

  Your lease agreement is ready for review and signature. Please review carefully
  and sign at your earliest convenience.

  Property: {{contact.lease_property_address}}
  Lease Start: {{contact.lease_start_date}}
  Monthly Rent: ${{contact.lease_monthly_rent}}

  If you have any questions, please contact us.
  ```

#### Action 2: Add Tag (Status Tracking)
- **Action:** Add Tag
- **Tag:** `Lease Sent`
- **Description:** Track that lease has been dispatched

#### Action 3: Remove Tag (Cleanup)
- **Action:** Remove Tag
- **Tag:** `trigger-send-lease`
- **Why:** Prevents infinite loops if contact is updated again

#### Action 4: Webhook (Notify Real Estate Genie)
- **Action:** Webhook
- **Method:** POST
- **Webhook URL:** `https://yourdomain.com/api/webhooks/ghl/document-signed`
- **Trigger:** When document status changes to "Completed"
- **Request Body:**
  ```json
  {
    "contact_id": "{{contact.id}}",
    "contact_email": "{{contact.email}}",
    "document_type": "lease",
    "document_url": "[Paste signed document URL here]"
  }
  ```
  *Note: GHL doesn't auto-populate document URL in webhooks yet, so this may need manual setup or retrieval via API*

### Create "Lease Signed - Status Update" Workflow

1. **Trigger Type:** Documents & Contracts
2. **Event:** Document Completed
3. **Filter:** Template Name = "Standard Residential Lease Agreement"

#### Actions:
1. **Add Tag:** `Tenant: Active`
2. **Add Tag:** `Lease Signed`
3. **Remove Tag:** `Lease Sent` (cleanup)
4. **Webhook:** POST to `https://yourdomain.com/api/webhooks/ghl/document-signed`
   ```json
   {
     "contact_id": "{{contact.id}}",
     "contact_email": "{{contact.email}}",
     "document_type": "lease"
   }
   ```

---

## Part 4: Create the Snapshot

### Step 1: Prepare for Snapshot
1. Verify all custom fields are created
2. Verify workflow is published and working
3. Test the flow with a dummy contact

### Step 2: Create Snapshot
1. Go to **Settings** → **Snapshots**
2. Click **Create Snapshot**
3. Name: `Real Estate Genie - PM Lease Automation v1`
4. Description:
   ```
   Complete residential lease automation including:
   - Custom fields for lease data
   - Standard Lease Agreement template
   - Auto-send workflow triggered by tag
   - Document completion tracking
   ```
5. **Include:**
   - ✅ Custom Fields
   - ✅ Workflows
   - ✅ Document Templates
   - ✅ Tags (optional)
6. Click **Create Snapshot**

### Step 3: Deploy to Agent Sub-Accounts
1. Go to each agent's sub-account
2. **Settings** → **Snapshots** → **Import Snapshot**
3. Select: `Real Estate Genie - PM Lease Automation v1`
4. Click **Import**
5. Wait for import to complete (2-5 minutes)

---

## Part 5: Testing the Integration

### Test Checklist
1. ✅ Create test contact with email
2. ✅ Manually populate all lease custom fields
3. ✅ Add tag `trigger-send-lease` to contact
4. ✅ Verify workflow fires and document is sent
5. ✅ Sign the document as tenant
6. ✅ Verify webhook fires and Real Estate Genie updates lease status
7. ✅ Verify tenant portal invitation is sent

### Test via Real Estate Genie App
1. Create a lease in Real Estate Genie
2. Select "GoHighLevel" as e-signature provider
3. Click "Create Lease & Send for Signature"
4. Check GHL sub-account to verify contact was updated with lease data
5. Verify tag `trigger-send-lease` was added
6. Check tenant email for lease document
7. Sign document
8. Verify lease status updates to "Active" in Real Estate Genie
9. Verify tenant receives portal invitation email

---

## Troubleshooting

### Document Not Sending
**Issue:** Tag added but no document sent
**Solution:**
- Check workflow is **Published** (not Draft)
- Verify tag name matches exactly: `trigger-send-lease`
- Check workflow history for errors
- Ensure contact has valid email address

### Merge Fields Blank
**Issue:** Document shows {{contact.lease_monthly_rent}} instead of value
**Solution:**
- Verify field key matches exactly (case-sensitive)
- Check contact has value populated for that field
- Ensure custom field is Contact-level, not Opportunity-level

### Webhook Not Firing
**Issue:** Document signed but Real Estate Genie not notified
**Solution:**
- Check webhook URL is correct and accessible
- Verify workflow trigger is "Document Completed", not "Document Sent"
- Check GHL webhook logs for errors
- Test webhook URL with Postman

### Multiple Documents Sent
**Issue:** Contact receives multiple copies of lease
**Solution:**
- Ensure "Remove Tag" action is in workflow
- Check for duplicate workflow triggers
- Verify tag is removed immediately after document is sent

---

## API Integration Notes

The Real Estate Genie app uses the GHL API to:
1. **Create/Update Contact** with lease data
2. **Add Tag** `trigger-send-lease` to trigger workflow
3. **Listen for Webhook** when document is signed

This follows the **"Upsert-then-Dispatch"** pattern:
- **Upsert:** Update contact with all lease data
- **Dispatch:** Add trigger tag, letting GHL workflow handle document sending

---

## Maintenance

### Updating the Template
1. Edit template in **Documents & Contracts**
2. Make changes
3. Save template
4. **Create new snapshot** (increment version: v2, v3, etc.)
5. Re-deploy to sub-accounts

### Adding New Custom Fields
1. Add field to master sub-account
2. Update template to use new merge field
3. Update Real Estate Genie API payload
4. Create new snapshot and deploy

---

## Support

For issues with this integration:
- **GHL Support:** Check GHL documentation or contact support
- **Real Estate Genie:** Submit issue at https://github.com/yourrepo/issues
- **Webhook Logs:** Check your server logs for webhook delivery issues

---

**Version:** 1.0
**Last Updated:** 2025-12-31
**Maintained By:** Real Estate Genie Development Team
