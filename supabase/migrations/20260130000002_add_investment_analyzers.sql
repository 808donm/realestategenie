-- Migration: Add Investment Property and 1031 Exchange Analyzer tables
--
-- Features supported:
-- 1. Investment Property Analysis (ROI, Cap Rate, IRR, Cash-on-Cash)
-- 2. 1031 Exchange Analysis (Timeline, Tax Savings, Property Comparison)
-- 3. Property Comparison (side-by-side analysis)

-- ============================================================================
-- Investment Properties Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.investment_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,

    -- Property Details
    name TEXT NOT NULL,
    address TEXT,
    property_type TEXT, -- 'single_family', 'multi_family', 'commercial', 'land', 'mixed_use'

    -- Purchase Info
    purchase_price NUMERIC(12, 2) NOT NULL,
    closing_costs NUMERIC(12, 2) DEFAULT 0,
    renovation_costs NUMERIC(12, 2) DEFAULT 0,
    down_payment_percent NUMERIC(5, 2) DEFAULT 20,
    loan_interest_rate NUMERIC(5, 3) DEFAULT 7.0,
    loan_term_years INTEGER DEFAULT 30,

    -- Income
    monthly_rent NUMERIC(10, 2) DEFAULT 0,
    other_monthly_income NUMERIC(10, 2) DEFAULT 0,
    vacancy_rate_percent NUMERIC(5, 2) DEFAULT 5,

    -- Expenses
    property_tax_annual NUMERIC(10, 2) DEFAULT 0,
    insurance_annual NUMERIC(10, 2) DEFAULT 0,
    hoa_monthly NUMERIC(10, 2) DEFAULT 0,
    maintenance_percent NUMERIC(5, 2) DEFAULT 5, -- % of rent
    property_mgmt_percent NUMERIC(5, 2) DEFAULT 0, -- % of rent
    other_monthly_expenses NUMERIC(10, 2) DEFAULT 0,

    -- Appreciation & Growth
    annual_appreciation_percent NUMERIC(5, 2) DEFAULT 3,
    annual_rent_increase_percent NUMERIC(5, 2) DEFAULT 2,

    -- Analysis Period
    holding_period_years INTEGER DEFAULT 5,

    -- Calculated Fields (cached for performance)
    calculated_noi NUMERIC(12, 2),
    calculated_cap_rate NUMERIC(5, 2),
    calculated_cash_on_cash NUMERIC(5, 2),
    calculated_total_roi NUMERIC(8, 2),
    calculated_irr NUMERIC(5, 2),

    -- Metadata
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 1031 Exchange Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.exchange_1031 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,

    -- Exchange Details
    name TEXT NOT NULL,
    status TEXT DEFAULT 'planning', -- 'planning', 'active', 'identification', 'closing', 'completed', 'failed'

    -- Relinquished Property (property being sold)
    relinquished_property_address TEXT,
    relinquished_sale_price NUMERIC(12, 2),
    relinquished_original_basis NUMERIC(12, 2), -- Original purchase price + improvements
    relinquished_accumulated_depreciation NUMERIC(12, 2) DEFAULT 0,
    relinquished_selling_costs NUMERIC(12, 2) DEFAULT 0,

    -- Timeline (critical for 1031 compliance)
    sale_close_date DATE,
    identification_deadline DATE, -- 45 days from sale
    exchange_deadline DATE, -- 180 days from sale

    -- Identified Replacement Properties (up to 3 for standard rule)
    identified_properties JSONB DEFAULT '[]'::jsonb,

    -- Selected Replacement Property
    replacement_property_id UUID REFERENCES public.investment_properties(id) ON DELETE SET NULL,
    replacement_purchase_price NUMERIC(12, 2),
    replacement_close_date DATE,

    -- Tax Analysis
    capital_gain NUMERIC(12, 2),
    depreciation_recapture NUMERIC(12, 2),
    federal_tax_rate NUMERIC(5, 2) DEFAULT 20, -- Long-term capital gains rate
    state_tax_rate NUMERIC(5, 2) DEFAULT 0,
    depreciation_recapture_rate NUMERIC(5, 2) DEFAULT 25,

    -- Calculated Tax Savings
    calculated_tax_without_exchange NUMERIC(12, 2),
    calculated_tax_with_exchange NUMERIC(12, 2),
    calculated_tax_savings NUMERIC(12, 2),

    -- Boot (taxable portion if not fully reinvested)
    cash_boot NUMERIC(12, 2) DEFAULT 0,
    mortgage_boot NUMERIC(12, 2) DEFAULT 0,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Property Comparison Sets
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.property_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    comparison_type TEXT DEFAULT 'investment', -- 'investment', '1031_replacement'
    property_ids UUID[] DEFAULT '{}', -- Array of investment_property IDs
    exchange_id UUID REFERENCES public.exchange_1031(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_investment_properties_agent ON public.investment_properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_investment_properties_active ON public.investment_properties(agent_id, is_active);
CREATE INDEX IF NOT EXISTS idx_exchange_1031_agent ON public.exchange_1031(agent_id);
CREATE INDEX IF NOT EXISTS idx_exchange_1031_status ON public.exchange_1031(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_property_comparisons_agent ON public.property_comparisons(agent_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Investment Properties RLS
ALTER TABLE public.investment_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own investment properties" ON public.investment_properties;
CREATE POLICY "Users can view their own investment properties"
ON public.investment_properties FOR SELECT TO authenticated
USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own investment properties" ON public.investment_properties;
CREATE POLICY "Users can insert their own investment properties"
ON public.investment_properties FOR INSERT TO authenticated
WITH CHECK (agent_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own investment properties" ON public.investment_properties;
CREATE POLICY "Users can update their own investment properties"
ON public.investment_properties FOR UPDATE TO authenticated
USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own investment properties" ON public.investment_properties;
CREATE POLICY "Users can delete their own investment properties"
ON public.investment_properties FOR DELETE TO authenticated
USING (agent_id = auth.uid());

-- 1031 Exchange RLS
ALTER TABLE public.exchange_1031 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own 1031 exchanges" ON public.exchange_1031;
CREATE POLICY "Users can view their own 1031 exchanges"
ON public.exchange_1031 FOR SELECT TO authenticated
USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own 1031 exchanges" ON public.exchange_1031;
CREATE POLICY "Users can insert their own 1031 exchanges"
ON public.exchange_1031 FOR INSERT TO authenticated
WITH CHECK (agent_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own 1031 exchanges" ON public.exchange_1031;
CREATE POLICY "Users can update their own 1031 exchanges"
ON public.exchange_1031 FOR UPDATE TO authenticated
USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own 1031 exchanges" ON public.exchange_1031;
CREATE POLICY "Users can delete their own 1031 exchanges"
ON public.exchange_1031 FOR DELETE TO authenticated
USING (agent_id = auth.uid());

-- Property Comparisons RLS
ALTER TABLE public.property_comparisons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own comparisons" ON public.property_comparisons;
CREATE POLICY "Users can view their own comparisons"
ON public.property_comparisons FOR SELECT TO authenticated
USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own comparisons" ON public.property_comparisons;
CREATE POLICY "Users can insert their own comparisons"
ON public.property_comparisons FOR INSERT TO authenticated
WITH CHECK (agent_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own comparisons" ON public.property_comparisons;
CREATE POLICY "Users can update their own comparisons"
ON public.property_comparisons FOR UPDATE TO authenticated
USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own comparisons" ON public.property_comparisons;
CREATE POLICY "Users can delete their own comparisons"
ON public.property_comparisons FOR DELETE TO authenticated
USING (agent_id = auth.uid());

-- ============================================================================
-- Updated At Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_investment_properties_updated_at ON public.investment_properties;
CREATE TRIGGER update_investment_properties_updated_at
    BEFORE UPDATE ON public.investment_properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exchange_1031_updated_at ON public.exchange_1031;
CREATE TRIGGER update_exchange_1031_updated_at
    BEFORE UPDATE ON public.exchange_1031
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_property_comparisons_updated_at ON public.property_comparisons;
CREATE TRIGGER update_property_comparisons_updated_at
    BEFORE UPDATE ON public.property_comparisons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
