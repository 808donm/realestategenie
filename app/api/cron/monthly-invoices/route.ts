import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GHLClient } from "@/lib/integrations/ghl-client";

/**
 * Monthly Rent Invoice Automation
 *
 * Cron job that runs on the 1st of every month to create rent invoices
 * for all active leases.
 *
 * Setup in Vercel:
 * - Add cron schedule in vercel.json
 * - Or use external cron service (cron-job.org, EasyCron, etc.)
 *
 * Trigger manually: POST /api/cron/monthly-invoices
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

    console.log("🔄 Starting monthly invoice generation...");

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Get all active leases
    const { data: activeLeases, error: leasesError } = await supabase
      .from("pm_leases")
      .select(`
        id,
        agent_id,
        tenant_contact_id,
        pm_property_id,
        pm_unit_id,
        monthly_rent,
        rent_due_day,
        lease_start_date,
        lease_end_date,
        auto_invoice_enabled,
        pm_properties (address),
        pm_units (unit_number)
      `)
      .eq("status", "active")
      .eq("auto_invoice_enabled", true);

    if (leasesError) {
      console.error("Error fetching leases:", leasesError);
      return NextResponse.json(
        { error: "Failed to fetch active leases" },
        { status: 500 }
      );
    }

    console.log(`📊 Found ${activeLeases?.length || 0} active leases with auto-invoicing enabled`);

    const results = {
      total: activeLeases?.length || 0,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ lease_id: string; error: string }>,
    };

    // Process each lease
    for (const lease of activeLeases || []) {
      try {
        // Check if invoice already exists for this month
        const { data: existingInvoice } = await supabase
          .from("pm_rent_payments")
          .select("id")
          .eq("lease_id", lease.id)
          .eq("month", currentMonth)
          .eq("year", currentYear)
          .single();

        if (existingInvoice) {
          console.log(`⏭️  Invoice already exists for lease ${lease.id} - skipping`);
          results.skipped++;
          continue;
        }

        // Get agent's GHL integration
        const { data: integration } = await supabase
          .from("integrations")
          .select("ghl_access_token, ghl_location_id")
          .eq("agent_id", lease.agent_id)
          .single();

        if (!integration?.ghl_access_token) {
          console.warn(`⚠️  No GHL integration for agent ${lease.agent_id} - skipping lease ${lease.id}`);
          results.skipped++;
          continue;
        }

        const ghlClient = new GHLClient(integration.ghl_access_token);

        // Calculate due date (rent_due_day of current month)
        const dueDate = new Date(currentYear, currentMonth - 1, lease.rent_due_day);
        const dueDateStr = dueDate.toISOString().split("T")[0];

        // Prepare invoice
        const fullAddress = lease.pm_units?.unit_number
          ? `${lease.pm_properties?.address}, Unit ${lease.pm_units.unit_number}`
          : lease.pm_properties?.address || "Property";

        const invoice = {
          locationId: integration.ghl_location_id,
          contactId: lease.tenant_contact_id,
          title: `Rent - ${fullAddress} - ${today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
          currency: "USD",
          dueDate: dueDateStr,
          items: [
            {
              name: "Monthly Rent",
              description: `Rent for ${fullAddress}`,
              price: lease.monthly_rent,
              quantity: 1,
            },
          ],
          status: "draft" as const,
        };

        // Create invoice in GHL
        const { id: ghlInvoiceId } = await ghlClient.createInvoice(invoice);

        // Send invoice to tenant
        await ghlClient.sendInvoice(ghlInvoiceId);

        // Record payment in database
        const { error: insertError } = await supabase
          .from("pm_rent_payments")
          .insert({
            lease_id: lease.id,
            agent_id: lease.agent_id,
            tenant_contact_id: lease.tenant_contact_id,
            amount: lease.monthly_rent,
            due_date: dueDateStr,
            month: currentMonth,
            year: currentYear,
            status: "pending",
            ghl_invoice_id: ghlInvoiceId,
            invoice_sent_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error(`Error recording payment for lease ${lease.id}:`, insertError);
          results.errors.push({
            lease_id: lease.id,
            error: insertError.message,
          });
          results.failed++;
        } else {
          console.log(`✅ Invoice created for lease ${lease.id} - GHL Invoice: ${ghlInvoiceId}`);
          results.success++;
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

    console.log("✨ Monthly invoice generation complete:", results);

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Fatal error in monthly invoice cron:", error);
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
