import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { getCurrentRent } from "@/lib/invoicing/recurring-invoices";

/**
 * Monthly Rent Invoice Automation (Timezone-Aware)
 *
 * Runs HOURLY to generate invoices at midnight in each agent's timezone.
 * This ensures invoices are generated on the 1st of the month at the correct local time.
 *
 * How it works:
 * - Runs every hour at :00
 * - Checks which agents are currently at midnight on the 1st in their timezone
 * - Generates invoices only for those agents
 * - Prevents duplicate invoices by checking existing records
 *
 * Setup in Vercel:
 * - Schedule: "0 * * * *" (every hour)
 * - Required header: Authorization: Bearer [CRON_SECRET]
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

    console.log("🔄 Starting timezone-aware monthly invoice generation...");

    const now = new Date();
    const currentUTCHour = now.getUTCHours();

    console.log(`Current UTC time: ${now.toISOString()}, UTC Hour: ${currentUTCHour}`);

    // Get all agents with their timezones
    const { data: agentsData, error: agentsError } = await supabase
      .from("agents")
      .select("id, timezone");

    if (agentsError) {
      console.error("Error fetching agents:", agentsError);
      return NextResponse.json(
        { error: "Failed to fetch agents" },
        { status: 500 }
      );
    }

    // Determine which agents are at midnight (hour 0) on the 1st of the month in their timezone
    const agentsAtTargetTime: string[] = [];

    for (const agent of agentsData || []) {
      const timezone = agent.timezone || 'America/New_York';

      try {
        // Get current time in agent's timezone
        const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        const localHour = localTime.getHours();
        const localDay = localTime.getDate();

        // Check if it's midnight (hour 0) on the 1st day of the month
        if (localHour === 0 && localDay === 1) {
          agentsAtTargetTime.push(agent.id);
          console.log(`✅ Agent ${agent.id} is at midnight on the 1st (${timezone})`);
        }
      } catch (error) {
        console.error(`Invalid timezone for agent ${agent.id}: ${timezone}`);
      }
    }

    if (agentsAtTargetTime.length === 0) {
      console.log("⏭️  No agents at target time (midnight on 1st) - skipping this hour");
      return NextResponse.json({
        success: true,
        message: "No agents at target time",
        agentsProcessed: 0,
      });
    }

    console.log(`📊 Found ${agentsAtTargetTime.length} agents at midnight on the 1st`);

    // Now get the current month/year in UTC (for record keeping)
    const currentMonth = now.getUTCMonth() + 1;
    const currentYear = now.getUTCFullYear();

    // Get all active leases for agents at target time
    const { data: activeLeases, error: leasesError } = await supabase
      .from("pm_leases")
      .select(`
        id,
        agent_id,
        tenant_contact_id,
        tenant_name,
        pm_property_id,
        pm_unit_id,
        monthly_rent,
        rent_due_day,
        lease_start_date,
        lease_end_date,
        auto_invoice_enabled,
        status,
        qbo_customer_id,
        rent_increase_history,
        pm_properties (address),
        pm_units (unit_number)
      `)
      .in("status", ["active", "month_to_month"])
      .eq("auto_invoice_enabled", true)
      .in("agent_id", agentsAtTargetTime);

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

        // Calculate current rent amount (handles rent increases)
        const currentRent = getCurrentRent(lease as any, dueDate);

        console.log(`💰 Lease ${lease.id} - Base rent: $${lease.monthly_rent}, Current rent: $${currentRent}`);

        // Prepare invoice
        // Handle Supabase joins that may return arrays
        const unit = Array.isArray(lease.pm_units) ? lease.pm_units[0] : lease.pm_units;
        const property = Array.isArray(lease.pm_properties) ? lease.pm_properties[0] : lease.pm_properties;

        const fullAddress = unit?.unit_number
          ? `${property?.address}, Unit ${unit.unit_number}`
          : property?.address || "Property";

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
              price: currentRent,
              quantity: 1,
            },
          ],
          status: "draft" as const,
        };

        // Create invoice in GHL
        const { id: ghlInvoiceId } = await ghlClient.createInvoice(invoice);

        // Send invoice to tenant
        await ghlClient.sendInvoice(ghlInvoiceId);

        // Sync to QuickBooks if integrated
        let qboInvoiceId: string | null = null;
        const { data: qboIntegration } = await supabase
          .from("integrations")
          .select("*")
          .eq("agent_id", lease.agent_id)
          .eq("provider", "qbo")
          .eq("status", "connected")
          .single();

        if (qboIntegration?.config?.access_token && lease.qbo_customer_id) {
          try {
            const { QBOClient, syncInvoiceToQBO } = await import("@/lib/integrations/qbo-client");

            const qboClient = new QBOClient({
              access_token: qboIntegration.config.access_token,
              refresh_token: qboIntegration.config.refresh_token,
              realmId: qboIntegration.config.realmId,
              expires_at: qboIntegration.config.expires_at,
              refresh_expires_at: qboIntegration.config.refresh_expires_at,
            });

            // Get tenant contact info for QBO
            const { data: contact } = await supabase
              .from("pm_contacts")
              .select("*")
              .eq("id", lease.tenant_contact_id)
              .single();

            if (contact) {
              const { qbo_invoice_id } = await syncInvoiceToQBO(qboClient, {
                tenant_name: contact.full_name || "",
                tenant_email: contact.email || "",
                tenant_phone: contact.phone,
                property_address: fullAddress,
                monthly_rent: currentRent,
                due_date: dueDateStr,
                ghl_invoice_id: ghlInvoiceId,
                invoice_type: "monthly_rent",
              });

              qboInvoiceId = qbo_invoice_id;
              console.log(`✅ Invoice synced to QuickBooks: ${qbo_invoice_id}`);
            }
          } catch (qboError) {
            console.error(`❌ Error syncing to QuickBooks for lease ${lease.id}:`, qboError);
            // Don't fail the cron job - QBO sync is optional
          }
        }

        // Record payment in database
        const { error: insertError } = await supabase
          .from("pm_rent_payments")
          .insert({
            lease_id: lease.id,
            amount: currentRent,
            due_date: dueDateStr,
            month: currentMonth,
            year: currentYear,
            status: "pending",
            payment_type: "monthly",
            ghl_invoice_id: ghlInvoiceId,
            qbo_invoice_id: qboInvoiceId,
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
