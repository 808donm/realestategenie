import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Lease Expiration Checker
 *
 * Cron job that runs daily to check for expired leases and transition them
 * to month-to-month or ended status based on configuration
 *
 * Setup in Vercel:
 * - Add cron schedule in vercel.json: "0 0 * * *" (daily at midnight)
 * - Or use external cron service
 *
 * Trigger manually: POST /api/cron/check-lease-expirations
 * Required header: Authorization: Bearer [CRON_SECRET]
 */

// Use service role for cron jobs (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔄 Checking for expired leases...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    // Get all active leases that have expired (end date is today or earlier)
    const { data: expiredLeases, error: leasesError } = await supabase
      .from("pm_leases")
      .select(`
        id,
        agent_id,
        tenant_contact_id,
        lease_end_date,
        monthly_rent,
        auto_invoice_enabled,
        pm_properties (address),
        pm_units (unit_number)
      `)
      .eq("status", "active")
      .lte("lease_end_date", todayStr);

    if (leasesError) {
      console.error("Error fetching expired leases:", leasesError);
      return NextResponse.json(
        { error: "Failed to fetch expired leases" },
        { status: 500 }
      );
    }

    console.log(`📊 Found ${expiredLeases?.length || 0} expired leases`);

    const results = {
      total: expiredLeases?.length || 0,
      transitioned_to_month_to_month: 0,
      ended: 0,
      failed: 0,
      errors: [] as Array<{ lease_id: string; error: string }>,
    };

    // Process each expired lease
    for (const lease of expiredLeases || []) {
      try {
        // Check if lease is pending termination
        const { data: leaseWithTermination } = await supabase
          .from("pm_leases")
          .select("termination_date")
          .eq("id", lease.id)
          .single();

        // If termination was scheduled, end the lease
        // Otherwise, transition to month-to-month
        const newStatus = leaseWithTermination?.termination_date
          ? "ended"
          : "month_to_month";

        const updateData: any = {
          status: newStatus,
        };

        // If ending the lease, disable auto-invoicing
        if (newStatus === "ended") {
          updateData.auto_invoice_enabled = false;
        }

        const { error: updateError } = await supabase
          .from("pm_leases")
          .update(updateData)
          .eq("id", lease.id);

        if (updateError) {
          console.error(`Error updating lease ${lease.id}:`, updateError);
          results.errors.push({
            lease_id: lease.id,
            error: updateError.message,
          });
          results.failed++;
        } else {
          const property = Array.isArray(lease.pm_properties)
            ? lease.pm_properties[0]
            : lease.pm_properties;
          const unit = Array.isArray(lease.pm_units)
            ? lease.pm_units[0]
            : lease.pm_units;

          console.log(
            `✅ Lease ${lease.id} transitioned to ${newStatus} - ${property?.address}${unit ? ` Unit ${unit.unit_number}` : ""}`
          );

          if (newStatus === "month_to_month") {
            results.transitioned_to_month_to_month++;
          } else {
            results.ended++;
          }
        }
      } catch (error) {
        console.error(`Error processing lease ${lease.id}:`, error);
        results.errors.push({
          lease_id: lease.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        results.failed++;
      }
    }

    console.log("✨ Lease expiration check complete:", results);

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Fatal error in lease expiration cron:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
