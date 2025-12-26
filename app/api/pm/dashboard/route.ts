import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("sb-access-token");

    if (!authCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser(authCookie.value);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Note: user.id is the same as agent.id (created via trigger)
    const agentId = user.id;

    // Get current month/year
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // 1. RENT COLLECTED (THIS MONTH)
    const { data: rentPayments } = await supabase
      .from("pm_rent_payments")
      .select("amount, status, late_fee_amount")
      .eq("agent_id", agentId)
      .eq("month", currentMonth)
      .eq("year", currentYear);

    const totalBilled = rentPayments?.reduce((sum, p) => sum + Number(p.amount) + Number(p.late_fee_amount || 0), 0) || 0;
    const totalCollected = rentPayments?.filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount) + Number(p.late_fee_amount || 0), 0) || 0;
    const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

    // 2. PAST-DUE RENT
    const { data: overduePayments } = await supabase
      .from("pm_rent_payments")
      .select("amount, late_fee_amount, lease_id")
      .eq("agent_id", agentId)
      .eq("status", "overdue");

    const pastDueAmount = overduePayments?.reduce((sum, p) => sum + Number(p.amount) + Number(p.late_fee_amount || 0), 0) || 0;
    const tenantsLate = new Set(overduePayments?.map(p => p.lease_id) || []).size;

    // 3. OCCUPANCY
    const { data: properties } = await supabase
      .from("pm_properties")
      .select("id, units_count")
      .eq("agent_id", agentId);

    const totalUnits = properties?.reduce((sum, p) => sum + (p.units_count || 1), 0) || 0;

    const { data: activeLeases } = await supabase
      .from("pm_leases")
      .select("id")
      .eq("agent_id", agentId)
      .in("status", ["active", "month_to_month"])
      .lte("lease_start_date", now.toISOString())
      .or(`lease_end_date.gte.${now.toISOString()},status.eq.month_to_month`);

    const occupiedUnits = activeLeases?.length || 0;
    const vacancyRate = totalUnits > 0 ? ((totalUnits - occupiedUnits) / totalUnits) * 100 : 0;

    // 4. LEASES TERMINATING SOON (only those with termination notice)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const { data: terminatingLeases } = await supabase
      .from("pm_leases")
      .select("id, termination_date")
      .eq("agent_id", agentId)
      .eq("status", "terminating")
      .not("termination_date", "is", null)
      .lte("termination_date", ninetyDaysFromNow.toISOString());

    const terminating30 = terminatingLeases?.filter(l =>
      new Date(l.termination_date) <= thirtyDaysFromNow
    ).length || 0;

    const terminating60 = terminatingLeases?.filter(l =>
      new Date(l.termination_date) <= sixtyDaysFromNow
    ).length || 0;

    const terminating90 = terminatingLeases?.filter(l =>
      new Date(l.termination_date) <= ninetyDaysFromNow
    ).length || 0;

    // 5. MAINTENANCE OPEN
    const { data: workOrders } = await supabase
      .from("pm_work_orders")
      .select("id, created_at, status")
      .eq("agent_id", agentId)
      .not("status", "in", '("completed","cancelled")');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const openWorkOrders = workOrders?.length || 0;
    const openOver7Days = workOrders?.filter(wo =>
      new Date(wo.created_at) <= sevenDaysAgo
    ).length || 0;

    // 6. NEEDS ATTENTION TODAY
    const issues = [];

    if (tenantsLate > 0) {
      issues.push({
        type: "late_rent",
        priority: "high",
        message: `${tenantsLate} tenant${tenantsLate > 1 ? 's' : ''} with late rent`,
        count: tenantsLate
      });
    }

    if (terminating30 > 0) {
      issues.push({
        type: "leases_terminating",
        priority: "high",
        message: `${terminating30} lease${terminating30 > 1 ? 's' : ''} terminating within 30 days`,
        count: terminating30
      });
    }

    if (openOver7Days > 0) {
      issues.push({
        type: "maintenance_aging",
        priority: "medium",
        message: `${openOver7Days} work order${openOver7Days > 1 ? 's' : ''} open over 7 days`,
        count: openOver7Days
      });
    }

    const vacantUnits = totalUnits - occupiedUnits;
    if (vacantUnits > 0) {
      issues.push({
        type: "vacant_units",
        priority: "medium",
        message: `${vacantUnits} vacant unit${vacantUnits > 1 ? 's' : ''}`,
        count: vacantUnits
      });
    }

    // Return all dashboard data
    return NextResponse.json({
      rentCollected: {
        collected: Math.round(totalCollected * 100) / 100,
        billed: Math.round(totalBilled * 100) / 100,
        collectionRate: Math.round(collectionRate * 10) / 10
      },
      pastDue: {
        amount: Math.round(pastDueAmount * 100) / 100,
        tenantCount: tenantsLate
      },
      occupancy: {
        occupied: occupiedUnits,
        total: totalUnits,
        vacancyRate: Math.round(vacancyRate * 10) / 10
      },
      leasesTerminating: {
        within30Days: terminating30,
        within60Days: terminating60,
        within90Days: terminating90
      },
      maintenance: {
        openWorkOrders: openWorkOrders,
        openOver7Days: openOver7Days
      },
      needsAttention: {
        count: issues.length,
        issues: issues.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority as keyof typeof priorityOrder] -
                 priorityOrder[b.priority as keyof typeof priorityOrder];
        })
      }
    });

  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
