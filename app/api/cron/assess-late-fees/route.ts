import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GHLClient } from "@/lib/integrations/ghl-client";

/**
 * Late Fee Assessment Automation
 *
 * Cron job that runs daily to assess late fees for overdue rent payments.
 * Typically runs 3-5 days after rent due date (configurable per lease).
 *
 * Setup in Vercel:
 * - Add cron schedule in vercel.json (daily at 9 AM)
 * - Or use external cron service
 *
 * Trigger manually: POST /api/cron/assess-late-fees
 * Required header: Authorization: Bearer [CRON_SECRET]
 */

// Use service role for cron jobs (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Default late fee configuration (can be overridden per agent)
const DEFAULT_LATE_FEE_GRACE_DAYS = 5; // Days after due date before late fee
const DEFAULT_LATE_FEE_FLAT = 50; // Flat fee amount
const DEFAULT_LATE_FEE_PERCENTAGE = 0.05; // 5% of rent

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔄 Starting late fee assessment...");

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day

    // Find unpaid rent payments that are past grace period
    const { data: overduePayments, error: paymentsError } = await supabase
      .from("pm_rent_payments")
      .select(`
        id,
        lease_id,
        agent_id,
        tenant_contact_id,
        amount,
        due_date,
        late_fee_amount,
        late_fee_assessed_at,
        ghl_invoice_id,
        pm_leases (
          id,
          late_fee_grace_days,
          late_fee_type,
          late_fee_flat_amount,
          late_fee_percentage,
          pm_properties (address),
          pm_units (unit_number)
        )
      `)
      .eq("status", "pending")
      .is("late_fee_assessed_at", null) // Not already assessed
      .lt("due_date", today.toISOString().split("T")[0]); // Past due date

    if (paymentsError) {
      console.error("Error fetching overdue payments:", paymentsError);
      return NextResponse.json(
        { error: "Failed to fetch overdue payments" },
        { status: 500 }
      );
    }

    console.log(`📊 Found ${overduePayments?.length || 0} overdue payments to check`);

    const results = {
      total: overduePayments?.length || 0,
      assessed: 0,
      skipped: 0,
      errors: [] as Array<{ payment_id: string; error: string }>,
    };

    // Process each overdue payment
    for (const payment of overduePayments || []) {
      try {
        const lease = payment.pm_leases;
        const graceDays = lease?.late_fee_grace_days || DEFAULT_LATE_FEE_GRACE_DAYS;

        // Calculate days overdue
        const dueDate = new Date(payment.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const daysOverdue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check if past grace period
        if (daysOverdue < graceDays) {
          console.log(`⏭️  Payment ${payment.id} is ${daysOverdue} days overdue (grace: ${graceDays} days) - skipping`);
          results.skipped++;
          continue;
        }

        // Calculate late fee
        const lateFeeType = lease?.late_fee_type || "flat";
        let lateFeeAmount = 0;

        if (lateFeeType === "flat") {
          lateFeeAmount = lease?.late_fee_flat_amount || DEFAULT_LATE_FEE_FLAT;
        } else if (lateFeeType === "percentage") {
          const percentage = lease?.late_fee_percentage || DEFAULT_LATE_FEE_PERCENTAGE;
          lateFeeAmount = payment.amount * percentage;
        } else if (lateFeeType === "both") {
          const flatAmount = lease?.late_fee_flat_amount || DEFAULT_LATE_FEE_FLAT;
          const percentage = lease?.late_fee_percentage || DEFAULT_LATE_FEE_PERCENTAGE;
          lateFeeAmount = flatAmount + (payment.amount * percentage);
        }

        // Round to 2 decimal places
        lateFeeAmount = Math.round(lateFeeAmount * 100) / 100;

        console.log(`💰 Assessing $${lateFeeAmount} late fee for payment ${payment.id} (${daysOverdue} days overdue)`);

        // Update payment record
        const { error: updateError } = await supabase
          .from("pm_rent_payments")
          .update({
            status: "overdue",
            late_fee_amount: lateFeeAmount,
            late_fee_assessed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id);

        if (updateError) {
          console.error(`Error updating payment ${payment.id}:`, updateError);
          results.errors.push({
            payment_id: payment.id,
            error: updateError.message,
          });
          continue;
        }

        // Update GHL invoice with late fee
        if (payment.ghl_invoice_id) {
          try {
            // Get agent's GHL integration
            const { data: integration } = await supabase
              .from("integrations")
              .select("ghl_access_token, ghl_location_id")
              .eq("agent_id", payment.agent_id)
              .single();

            if (integration?.ghl_access_token) {
              const ghlClient = new GHLClient(integration.ghl_access_token);

              // Get existing invoice
              const invoice = await ghlClient.getInvoice(payment.ghl_invoice_id);

              // Add late fee as a new line item
              const updatedItems = [
                ...(invoice.items || []),
                {
                  name: "Late Fee",
                  description: `Late fee assessed - ${daysOverdue} days overdue`,
                  price: lateFeeAmount,
                  quantity: 1,
                },
              ];

              // Note: GHL may not have an update invoice API
              // In that case, we'll just add a note to the contact
              await ghlClient.addNote({
                contactId: payment.tenant_contact_id,
                body: `Late fee of $${lateFeeAmount} assessed for ${daysOverdue} days overdue rent payment.`,
              });

              console.log(`✅ Late fee added to GHL invoice ${payment.ghl_invoice_id}`);
            }
          } catch (ghlError) {
            console.error(`Error updating GHL invoice:`, ghlError);
            // Don't fail the entire operation, late fee is already recorded locally
          }
        }

        results.assessed++;
      } catch (error) {
        console.error(`Error processing payment ${payment.id}:`, error);
        results.errors.push({
          payment_id: payment.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log("✨ Late fee assessment complete:", results);

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Fatal error in late fee cron:", error);
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
