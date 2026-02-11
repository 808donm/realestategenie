/**
 * Recurring Invoice Generation Utilities
 * Handles automatic monthly invoice creation for active leases
 */

import { supabaseAdmin } from "@/lib/supabase/admin";

interface RentIncrease {
  effective_date: string;
  new_rent: number;
  reason?: string;
}

interface Lease {
  id: string;
  agent_id: string;
  tenant_name: string;
  pm_property_id: string;
  pm_unit_id: string | null;
  lease_start_date: string;
  lease_end_date: string;
  monthly_rent: number;
  rent_due_day: number;
  rent_increase_history: RentIncrease[] | null;
  status: string;
}

/**
 * Calculate current rent amount for a lease considering rent increases
 */
export function getCurrentRent(lease: Lease, forDate: Date): number {
  if (!lease.rent_increase_history || lease.rent_increase_history.length === 0) {
    return lease.monthly_rent;
  }

  // Sort rent increases by date (most recent first)
  const increases = [...lease.rent_increase_history].sort(
    (a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
  );

  // Find the most recent rent increase that applies to this date
  for (const increase of increases) {
    if (new Date(increase.effective_date) <= forDate) {
      return increase.new_rent;
    }
  }

  // No increases apply yet, use base rent
  return lease.monthly_rent;
}

/**
 * Check if invoice already exists for a lease in a given month/year
 */
export async function invoiceExistsForMonth(
  leaseId: string,
  year: number,
  month: number
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("pm_rent_payments")
    .select("id")
    .eq("lease_id", leaseId)
    .eq("year", year)
    .eq("month", month)
    .limit(1);

  if (error) {
    console.error("Error checking for existing invoice:", error);
    return false;
  }

  return (data?.length || 0) > 0;
}

/**
 * Generate invoice for a lease for a specific month
 */
export async function generateInvoiceForLease(
  lease: Lease,
  year: number,
  month: number
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  try {
    // Check if invoice already exists
    const exists = await invoiceExistsForMonth(lease.id, year, month);
    if (exists) {
      return { success: false, error: "Invoice already exists for this period" };
    }

    // Calculate due date
    const dueDate = new Date(year, month - 1, lease.rent_due_day);

    // Calculate rent amount for this period
    const rentAmount = getCurrentRent(lease, dueDate);

    // Create invoice
    const { data: invoice, error } = await supabaseAdmin
      .from("pm_rent_payments")
      .insert({
        lease_id: lease.id,
        amount: rentAmount,
        due_date: dueDate.toISOString().split('T')[0],
        status: "pending",
        payment_type: "monthly",
        year,
        month,
        payment_method: null,
        paid_at: null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating invoice:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Generated invoice ${invoice.id} for lease ${lease.id} - ${year}-${month} - $${rentAmount}`);
    return { success: true, invoiceId: invoice.id };
  } catch (error) {
    console.error("Error generating invoice:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Get all active leases that need invoices generated
 */
export async function getActiveLeasesForInvoicing(): Promise<Lease[]> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const { data: leases, error } = await supabaseAdmin
    .from("pm_leases")
    .select(`
      id,
      agent_id,
      tenant_name,
      pm_property_id,
      pm_unit_id,
      lease_start_date,
      lease_end_date,
      monthly_rent,
      rent_due_day,
      rent_increase_history,
      status
    `)
    .eq("status", "active")
    .lte("lease_start_date", todayStr)
    .gte("lease_end_date", todayStr);

  if (error) {
    console.error("Error fetching active leases:", error);
    return [];
  }

  return (leases || []) as Lease[];
}

/**
 * Generate invoices for next month for all active leases
 */
export async function generateMonthlyInvoices(): Promise<{
  success: boolean;
  generated: number;
  skipped: number;
  errors: number;
  details: string[];
}> {
  const details: string[] = [];
  let generated = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Get next month
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const year = nextMonth.getFullYear();
    const month = nextMonth.getMonth() + 1; // JavaScript months are 0-indexed

    details.push(`Generating invoices for ${year}-${month.toString().padStart(2, '0')}`);

    // Get all active leases
    const leases = await getActiveLeasesForInvoicing();
    details.push(`Found ${leases.length} active leases`);

    // Generate invoice for each lease
    for (const lease of leases) {
      const result = await generateInvoiceForLease(lease, year, month);

      if (result.success) {
        generated++;
        details.push(`✅ Generated invoice ${result.invoiceId} for lease ${lease.id}`);
      } else if (result.error?.includes("already exists")) {
        skipped++;
        details.push(`⏭️  Skipped lease ${lease.id} - invoice already exists`);
      } else {
        errors++;
        details.push(`❌ Failed for lease ${lease.id}: ${result.error}`);
      }
    }

    details.push(`\nSummary: ${generated} generated, ${skipped} skipped, ${errors} errors`);

    return {
      success: true,
      generated,
      skipped,
      errors,
      details,
    };
  } catch (error) {
    console.error("Error in generateMonthlyInvoices:", error);
    return {
      success: false,
      generated,
      skipped,
      errors: errors + 1,
      details: [...details, `Fatal error: ${error instanceof Error ? error.message : "Unknown error"}`],
    };
  }
}
