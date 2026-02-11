import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("brrr_analyses")
      .select("*")
      .eq("id", id)
      .eq("agent_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching BRRR analysis:", error);
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in BRRR GET by ID:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const analysisData = {
      name: body.name,
      address: body.address || null,
      number_of_units: body.numberOfUnits || 1,
      purchase_price: body.purchasePrice,
      purchase_closing_costs: body.purchaseClosingCosts || 0,
      initial_loan_percent: body.initialLoanPercent || 80,
      initial_interest_rate: body.initialInterestRate || 12,
      renovation_costs: body.renovationCosts || 0,
      renovation_time_months: body.renovationTimeMonths || 3,
      holding_costs_during_reno: body.holdingCostsDuringReno || 0,
      after_repair_value: body.afterRepairValue,
      refinance_ltv: body.refinanceLTV || 75,
      refinance_interest_rate: body.refinanceInterestRate || 7,
      refinance_loan_term_years: body.refinanceLoanTermYears || 30,
      refinance_closing_costs: body.refinanceClosingCosts || 0,
      monthly_rent: body.monthlyRent,
      other_monthly_income: body.otherMonthlyIncome || 0,
      vacancy_rate_percent: body.vacancyRatePercent || 5,
      property_tax_annual: body.propertyTaxAnnual || 0,
      insurance_annual: body.insuranceAnnual || 0,
      maintenance_percent: body.maintenancePercent || 5,
      property_mgmt_percent: body.propertyMgmtPercent || 0,
      other_monthly_expenses: body.otherMonthlyExpenses || 0,
      annual_appreciation_percent: body.annualAppreciationPercent || 3,
      annual_rent_increase_percent: body.annualRentIncreasePercent || 2,
      holding_period_years: body.holdingPeriodYears || 5,
      calculated_total_cash_invested: body.calculated_total_cash_invested,
      calculated_cash_out_at_refi: body.calculated_cash_out_at_refi,
      calculated_cash_left_in_deal: body.calculated_cash_left_in_deal,
      calculated_equity_captured: body.calculated_equity_captured,
      calculated_annual_cash_flow: body.calculated_annual_cash_flow,
      calculated_cash_on_cash: body.calculated_cash_on_cash,
      calculated_cap_rate: body.calculated_cap_rate,
      calculated_deal_score: body.calculated_deal_score,
      calculated_is_infinite_return: body.calculated_is_infinite_return || false,
      notes: body.notes || null,
    };

    const { data, error } = await supabase
      .from("brrr_analyses")
      .update(analysisData)
      .eq("id", id)
      .eq("agent_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating BRRR analysis:", error);
      return NextResponse.json({ error: "Failed to update analysis" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in BRRR PUT:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from("brrr_analyses")
      .update({ is_active: false })
      .eq("id", id)
      .eq("agent_id", user.id);

    if (error) {
      console.error("Error deleting BRRR analysis:", error);
      return NextResponse.json({ error: "Failed to delete analysis" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in BRRR DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
