import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Lease Status Transition Cron Job
 *
 * This endpoint should be called daily (via cron) to automatically update lease statuses:
 * 1. Activate leases that have reached their start date
 * 2. Convert leases to month-to-month when they reach their end date
 *
 * GET /api/cron/lease-status-transitions
 *
 * Security: Should be called with a cron secret to prevent unauthorized access
 */

// Use service role to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day
    const todayISO = today.toISOString();

    console.log(`🔄 Running lease status transitions for ${todayISO}`);

    let activatedCount = 0;
    let convertedToMTMCount = 0;
    const errors: string[] = [];

    // 1. ACTIVATE LEASES THAT HAVE REACHED THEIR START DATE
    const { data: leasesToActivate, error: fetchActivateError } = await supabase
      .from("pm_leases")
      .select("id, pm_property_id, pm_unit_id, tenant_name, lease_start_date")
      .in("status", ["pending_start", "pending-signature"])
      .lte("lease_start_date", todayISO);

    if (fetchActivateError) {
      console.error("Error fetching leases to activate:", fetchActivateError);
      errors.push(`Failed to fetch leases to activate: ${fetchActivateError.message}`);
    } else if (leasesToActivate && leasesToActivate.length > 0) {
      console.log(`📋 Found ${leasesToActivate.length} lease(s) to activate`);

      for (const lease of leasesToActivate) {
        try {
          // Update lease status to active
          const { error: updateError } = await supabase
            .from("pm_leases")
            .update({
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("id", lease.id);

          if (updateError) {
            console.error(`❌ Failed to activate lease ${lease.id}:`, updateError);
            errors.push(`Lease ${lease.id}: ${updateError.message}`);
            continue;
          }

          // Mark property or unit as rented
          if (lease.pm_unit_id) {
            await supabase
              .from("pm_units")
              .update({ status: "rented" })
              .eq("id", lease.pm_unit_id);
          } else if (lease.pm_property_id) {
            await supabase
              .from("pm_properties")
              .update({ status: "rented" })
              .eq("id", lease.pm_property_id);
          }

          activatedCount++;
          console.log(`✅ Activated lease ${lease.id} for ${lease.tenant_name}`);
        } catch (error) {
          console.error(`❌ Error processing lease ${lease.id}:`, error);
          errors.push(`Lease ${lease.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // 2. CONVERT LEASES TO MONTH-TO-MONTH WHEN END DATE IS REACHED
    const { data: leasesToConvert, error: fetchConvertError } = await supabase
      .from("pm_leases")
      .select("id, tenant_name, lease_end_date")
      .eq("status", "active")
      .lt("lease_end_date", todayISO);

    if (fetchConvertError) {
      console.error("Error fetching leases to convert:", fetchConvertError);
      errors.push(`Failed to fetch leases to convert: ${fetchConvertError.message}`);
    } else if (leasesToConvert && leasesToConvert.length > 0) {
      console.log(`📋 Found ${leasesToConvert.length} lease(s) to convert to month-to-month`);

      for (const lease of leasesToConvert) {
        try {
          const { error: updateError } = await supabase
            .from("pm_leases")
            .update({
              status: "month_to_month",
              converted_to_mtm_date: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", lease.id);

          if (updateError) {
            console.error(`❌ Failed to convert lease ${lease.id}:`, updateError);
            errors.push(`Lease ${lease.id}: ${updateError.message}`);
            continue;
          }

          convertedToMTMCount++;
          console.log(`✅ Converted lease ${lease.id} to month-to-month for ${lease.tenant_name}`);
        } catch (error) {
          console.error(`❌ Error processing lease ${lease.id}:`, error);
          errors.push(`Lease ${lease.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      activated: activatedCount,
      convertedToMonthToMonth: convertedToMTMCount,
      totalProcessed: activatedCount + convertedToMTMCount,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("✅ Lease status transition complete:", summary);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("❌ Error in lease status transition cron:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
