-- BRRR and House Flip Analyzer Tables
-- Supports multi-family properties

-- ============================================
-- BRRR (Buy, Renovate, Refinance, Rent) Table
-- ============================================
CREATE TABLE brrr_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Property Info
  name TEXT NOT NULL,
  address TEXT,
  number_of_units INTEGER DEFAULT 1,

  -- Phase 1: Purchase
  purchase_price DECIMAL(12,2) NOT NULL,
  purchase_closing_costs DECIMAL(10,2) DEFAULT 0,
  initial_loan_percent DECIMAL(5,2) DEFAULT 80,
  initial_interest_rate DECIMAL(5,3) DEFAULT 12,

  -- Phase 2: Renovation
  renovation_costs DECIMAL(10,2) DEFAULT 0,
  renovation_time_months INTEGER DEFAULT 3,
  holding_costs_during_reno DECIMAL(10,2) DEFAULT 0,

  -- After Repair Value
  after_repair_value DECIMAL(12,2) NOT NULL,

  -- Phase 3: Refinance
  refinance_ltv DECIMAL(5,2) DEFAULT 75,
  refinance_interest_rate DECIMAL(5,3) DEFAULT 7,
  refinance_loan_term_years INTEGER DEFAULT 30,
  refinance_closing_costs DECIMAL(10,2) DEFAULT 0,

  -- Phase 4: Rent
  monthly_rent DECIMAL(10,2) NOT NULL,
  other_monthly_income DECIMAL(10,2) DEFAULT 0,
  vacancy_rate_percent DECIMAL(5,2) DEFAULT 5,
  property_tax_annual DECIMAL(10,2) DEFAULT 0,
  insurance_annual DECIMAL(10,2) DEFAULT 0,
  maintenance_percent DECIMAL(5,2) DEFAULT 5,
  property_mgmt_percent DECIMAL(5,2) DEFAULT 0,
  other_monthly_expenses DECIMAL(10,2) DEFAULT 0,

  -- Projections
  annual_appreciation_percent DECIMAL(5,2) DEFAULT 3,
  annual_rent_increase_percent DECIMAL(5,2) DEFAULT 2,
  holding_period_years INTEGER DEFAULT 5,

  -- Calculated Results (cached)
  calculated_total_cash_invested DECIMAL(12,2),
  calculated_cash_out_at_refi DECIMAL(12,2),
  calculated_cash_left_in_deal DECIMAL(12,2),
  calculated_equity_captured DECIMAL(12,2),
  calculated_annual_cash_flow DECIMAL(12,2),
  calculated_cash_on_cash DECIMAL(10,4),
  calculated_cap_rate DECIMAL(10,4),
  calculated_deal_score DECIMAL(3,1),
  calculated_is_infinite_return BOOLEAN DEFAULT FALSE,

  -- Metadata
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for BRRR
CREATE INDEX idx_brrr_analyses_agent ON brrr_analyses(agent_id);
CREATE INDEX idx_brrr_analyses_active ON brrr_analyses(agent_id, is_active);

-- Enable RLS for BRRR
ALTER TABLE brrr_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for BRRR
CREATE POLICY "Agents can view their own BRRR analyses"
  ON brrr_analyses FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can insert their own BRRR analyses"
  ON brrr_analyses FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update their own BRRR analyses"
  ON brrr_analyses FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can delete their own BRRR analyses"
  ON brrr_analyses FOR DELETE
  USING (agent_id = auth.uid());

-- ============================================
-- House Flip Analyses Table
-- ============================================
CREATE TABLE flip_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Property Info
  name TEXT NOT NULL,
  address TEXT,
  square_feet INTEGER,

  -- Purchase
  purchase_price DECIMAL(12,2) NOT NULL,
  purchase_closing_costs DECIMAL(10,2) DEFAULT 0,

  -- Financing
  use_financing BOOLEAN DEFAULT FALSE,
  loan_to_value_percent DECIMAL(5,2) DEFAULT 70,
  loan_interest_rate DECIMAL(5,3) DEFAULT 12,
  loan_points DECIMAL(5,2) DEFAULT 2,

  -- Renovation
  renovation_costs DECIMAL(10,2) NOT NULL,
  contingency_percent DECIMAL(5,2) DEFAULT 15,
  permits_costs DECIMAL(10,2) DEFAULT 0,
  staging_costs DECIMAL(10,2) DEFAULT 0,

  -- Holding Period
  holding_period_months INTEGER DEFAULT 4,

  -- Monthly Holding Costs
  property_tax_monthly DECIMAL(10,2) DEFAULT 0,
  insurance_monthly DECIMAL(10,2) DEFAULT 0,
  utilities_monthly DECIMAL(10,2) DEFAULT 0,
  other_holding_costs_monthly DECIMAL(10,2) DEFAULT 0,

  -- Sale
  after_repair_value DECIMAL(12,2) NOT NULL,
  selling_costs_percent DECIMAL(5,2) DEFAULT 8,

  -- Calculated Results (cached)
  calculated_all_in_cost DECIMAL(12,2),
  calculated_total_cash_required DECIMAL(12,2),
  calculated_gross_profit DECIMAL(12,2),
  calculated_net_profit DECIMAL(12,2),
  calculated_roi_on_cash DECIMAL(10,4),
  calculated_annualized_roi DECIMAL(10,4),
  calculated_profit_margin DECIMAL(10,4),
  calculated_deal_score DECIMAL(3,1),
  calculated_meets_70_rule BOOLEAN DEFAULT FALSE,

  -- Metadata
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Flip
CREATE INDEX idx_flip_analyses_agent ON flip_analyses(agent_id);
CREATE INDEX idx_flip_analyses_active ON flip_analyses(agent_id, is_active);

-- Enable RLS for Flip
ALTER TABLE flip_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Flip
CREATE POLICY "Agents can view their own flip analyses"
  ON flip_analyses FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can insert their own flip analyses"
  ON flip_analyses FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update their own flip analyses"
  ON flip_analyses FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can delete their own flip analyses"
  ON flip_analyses FOR DELETE
  USING (agent_id = auth.uid());

-- ============================================
-- Add multi-family support to investment_properties
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investment_properties' AND column_name = 'number_of_units'
  ) THEN
    ALTER TABLE investment_properties ADD COLUMN number_of_units INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investment_properties' AND column_name = 'property_type'
  ) THEN
    ALTER TABLE investment_properties ADD COLUMN property_type TEXT DEFAULT 'single_family';
  END IF;
END $$;

-- ============================================
-- Updated_at triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_brrr_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brrr_analyses_updated_at
  BEFORE UPDATE ON brrr_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_brrr_analyses_updated_at();

CREATE OR REPLACE FUNCTION update_flip_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER flip_analyses_updated_at
  BEFORE UPDATE ON flip_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_flip_analyses_updated_at();
