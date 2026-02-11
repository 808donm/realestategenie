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
      .from("flip_analyses")
      .select("*")
      .eq("id", id)
      .eq("agent_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching flip analysis:", error);
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in flip GET by ID:", error);
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
      .update(analysisData)
      .eq("id", id)
      .eq("agent_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating flip analysis:", error);
      return NextResponse.json({ error: "Failed to update analysis" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in flip PUT:", error);
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
      .from("flip_analyses")
      .update({ is_active: false })
      .eq("id", id)
      .eq("agent_id", user.id);

    if (error) {
      console.error("Error deleting flip analysis:", error);
      return NextResponse.json({ error: "Failed to delete analysis" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in flip DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
