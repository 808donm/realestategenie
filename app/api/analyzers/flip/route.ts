import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Map camelCase to snake_case for database
    const analysisData = {
      agent_id: user.id,
      name: body.name,
      address: body.address || null,
      square_feet: body.squareFeet || null,
      purchase_price: body.purchasePrice,
      purchase_closing_costs: body.purchaseClosingCosts || 0,
      use_financing: body.useFinancing || false,
      loan_to_value_percent: body.loanToValuePercent || 70,
      loan_interest_rate: body.loanInterestRate || 12,
      loan_points: body.loanPoints || 2,
      renovation_costs: body.renovationCosts,
      contingency_percent: body.contingencyPercent || 15,
      permits_costs: body.permitsCosts || 0,
      staging_costs: body.stagingCosts || 0,
      holding_period_months: body.holdingPeriodMonths || 4,
      property_tax_monthly: body.propertyTaxMonthly || 0,
      insurance_monthly: body.insuranceMonthly || 0,
      utilities_monthly: body.utilitiesMonthly || 0,
      other_holding_costs_monthly: body.otherHoldingCostsMonthly || 0,
      after_repair_value: body.afterRepairValue,
      selling_costs_percent: body.sellingCostsPercent || 8,
      // Calculated fields
      calculated_all_in_cost: body.calculated_all_in_cost,
      calculated_total_cash_required: body.calculated_total_cash_required,
      calculated_gross_profit: body.calculated_gross_profit,
      calculated_net_profit: body.calculated_net_profit,
      calculated_roi_on_cash: body.calculated_roi_on_cash,
      calculated_annualized_roi: body.calculated_annualized_roi,
      calculated_profit_margin: body.calculated_profit_margin,
      calculated_deal_score: body.calculated_deal_score,
      calculated_meets_70_rule: body.calculated_meets_70_rule || false,
      notes: body.notes || null,
    };

    const { data, error } = await supabase
      .from("flip_analyses")
      .insert(analysisData)
      .select()
      .single();

    if (error) {
      console.error("Error saving flip analysis:", error);
      return NextResponse.json({ error: "Failed to save analysis" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in flip POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("flip_analyses")
      .select("*")
      .eq("agent_id", user.id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching flip analyses:", error);
      return NextResponse.json({ error: "Failed to fetch analyses" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in flip GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
