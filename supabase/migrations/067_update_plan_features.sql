-- Migration: Update Plan Features
-- Replace existing features with new feature structure

-- ============================================================================
-- CLEAR EXISTING MAPPINGS
-- ============================================================================
DELETE FROM plan_features;
DELETE FROM features;

-- ============================================================================
-- INSERT NEW FEATURES
-- ============================================================================
-- Solo Agent Pro features
INSERT INTO features (name, slug, description, category) VALUES
  ('Full CRM', 'full-crm', 'Complete customer relationship management system', 'core'),
  ('Lead Generation & Open House Workflows', 'lead-open-house-workflows', 'Tools for generating leads and managing open houses', 'marketing'),
  ('AI Neighborhood Profiles', 'ai-neighborhood-profiles', 'AI-powered neighborhood marketing pages', 'marketing'),
  ('Open House Registration Pages', 'open-house-registration', 'Custom registration pages for open houses', 'marketing'),
  ('Payments & Invoicing', 'payments-invoicing', 'Payment processing and invoice management', 'payments'),
  ('Basic Property Management', 'basic-property-management', 'Essential property management features', 'core'),
  ('Tenant Portal (Limited)', 'tenant-portal-limited', 'Basic self-service tenant portal', 'core'),

-- Team Growth features (additive)
  ('Shared CRM & Pipelines', 'shared-crm-pipelines', 'Team-wide CRM with shared pipelines', 'team'),
  ('Team Reporting', 'team-reporting', 'Performance tracking and reporting for teams', 'analytics'),
  ('Multi-Agent Access Controls', 'multi-agent-access', 'Granular permissions and access controls', 'team'),
  ('Expanded Property Management', 'expanded-property-management', 'Advanced property management capabilities', 'core'),
  ('Team-Wide Open House Coordination', 'team-open-house-coordination', 'Coordinate open houses across team members', 'team'),

-- Brokerage Growth features (additive)
  ('Brokerage Admin & Compliance Controls', 'brokerage-admin-compliance', 'Administrative and compliance management tools', 'enterprise'),
  ('Central Billing & Reporting', 'central-billing-reporting', 'Centralized billing and comprehensive reporting', 'analytics'),
  ('Branded Tenant Portal', 'branded-tenant-portal', 'White-labeled tenant portal with custom branding', 'enterprise'),
  ('Broker Dashboard', 'broker-dashboard', 'Comprehensive broker analytics and oversight', 'analytics'),
  ('Onboarding Support', 'onboarding-support', 'Dedicated onboarding assistance', 'support'),

-- Brokerage Scale features (additive)
  ('Priority Support', 'priority-support', '24/7 priority customer support', 'support'),
  ('Advanced Reporting', 'advanced-reporting', 'In-depth business intelligence and analytics', 'analytics'),
  ('Higher Volume Processing', 'higher-volume-processing', 'Increased capacity for high-volume operations', 'enterprise'),
  ('Operational Workflows Across Teams', 'operational-workflows', 'Cross-team operational process management', 'team'),

-- Enterprise features
  ('Agent Count Pricing', 'agent-count-pricing', 'Custom pricing based on agent count', 'enterprise'),
  ('Property Volume Pricing', 'property-volume-pricing', 'Custom pricing based on property volume', 'enterprise'),
  ('Tenant Volume Pricing', 'tenant-volume-pricing', 'Custom pricing based on tenant volume', 'enterprise'),
  ('MLS Integration', 'mls-integration', 'Multiple Listing Service integration', 'integrations'),
  ('AI Assistants', 'ai-assistants', 'Advanced AI-powered automation', 'enterprise'),
  ('SLA Guarantees', 'sla-guarantees', 'Service level agreement guarantees', 'support')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- ============================================================================
-- MAP FEATURES TO PLANS
-- ============================================================================
DO $$
DECLARE
  solo_id UUID;
  team_id UUID;
  broker_growth_id UUID;
  broker_scale_id UUID;
  enterprise_id UUID;

  -- Solo features
  full_crm_id UUID;
  lead_workflows_id UUID;
  ai_neighborhoods_id UUID;
  open_house_reg_id UUID;
  payments_invoicing_id UUID;
  basic_pm_id UUID;
  tenant_portal_limited_id UUID;

  -- Team Growth features
  shared_crm_id UUID;
  team_reporting_id UUID;
  multi_agent_access_id UUID;
  expanded_pm_id UUID;
  team_open_house_id UUID;

  -- Brokerage Growth features
  brokerage_admin_id UUID;
  central_billing_id UUID;
  branded_portal_id UUID;
  broker_dashboard_id UUID;
  onboarding_support_id UUID;

  -- Brokerage Scale features
  priority_support_id UUID;
  advanced_reporting_id UUID;
  higher_volume_id UUID;
  operational_workflows_id UUID;

  -- Enterprise features
  agent_count_pricing_id UUID;
  property_volume_pricing_id UUID;
  tenant_volume_pricing_id UUID;
  mls_integration_id UUID;
  ai_assistants_id UUID;
  sla_guarantees_id UUID;
BEGIN
  -- Get plan IDs
  SELECT id INTO solo_id FROM subscription_plans WHERE slug = 'solo-agent-pro';
  SELECT id INTO team_id FROM subscription_plans WHERE slug = 'team-growth';
  SELECT id INTO broker_growth_id FROM subscription_plans WHERE slug = 'brokerage-growth';
  SELECT id INTO broker_scale_id FROM subscription_plans WHERE slug = 'brokerage-scale';
  SELECT id INTO enterprise_id FROM subscription_plans WHERE slug = 'enterprise';

  -- Get feature IDs - Solo
  SELECT id INTO full_crm_id FROM features WHERE slug = 'full-crm';
  SELECT id INTO lead_workflows_id FROM features WHERE slug = 'lead-open-house-workflows';
  SELECT id INTO ai_neighborhoods_id FROM features WHERE slug = 'ai-neighborhood-profiles';
  SELECT id INTO open_house_reg_id FROM features WHERE slug = 'open-house-registration';
  SELECT id INTO payments_invoicing_id FROM features WHERE slug = 'payments-invoicing';
  SELECT id INTO basic_pm_id FROM features WHERE slug = 'basic-property-management';
  SELECT id INTO tenant_portal_limited_id FROM features WHERE slug = 'tenant-portal-limited';

  -- Get feature IDs - Team Growth
  SELECT id INTO shared_crm_id FROM features WHERE slug = 'shared-crm-pipelines';
  SELECT id INTO team_reporting_id FROM features WHERE slug = 'team-reporting';
  SELECT id INTO multi_agent_access_id FROM features WHERE slug = 'multi-agent-access';
  SELECT id INTO expanded_pm_id FROM features WHERE slug = 'expanded-property-management';
  SELECT id INTO team_open_house_id FROM features WHERE slug = 'team-open-house-coordination';

  -- Get feature IDs - Brokerage Growth
  SELECT id INTO brokerage_admin_id FROM features WHERE slug = 'brokerage-admin-compliance';
  SELECT id INTO central_billing_id FROM features WHERE slug = 'central-billing-reporting';
  SELECT id INTO branded_portal_id FROM features WHERE slug = 'branded-tenant-portal';
  SELECT id INTO broker_dashboard_id FROM features WHERE slug = 'broker-dashboard';
  SELECT id INTO onboarding_support_id FROM features WHERE slug = 'onboarding-support';

  -- Get feature IDs - Brokerage Scale
  SELECT id INTO priority_support_id FROM features WHERE slug = 'priority-support';
  SELECT id INTO advanced_reporting_id FROM features WHERE slug = 'advanced-reporting';
  SELECT id INTO higher_volume_id FROM features WHERE slug = 'higher-volume-processing';
  SELECT id INTO operational_workflows_id FROM features WHERE slug = 'operational-workflows';

  -- Get feature IDs - Enterprise
  SELECT id INTO agent_count_pricing_id FROM features WHERE slug = 'agent-count-pricing';
  SELECT id INTO property_volume_pricing_id FROM features WHERE slug = 'property-volume-pricing';
  SELECT id INTO tenant_volume_pricing_id FROM features WHERE slug = 'tenant-volume-pricing';
  SELECT id INTO mls_integration_id FROM features WHERE slug = 'mls-integration';
  SELECT id INTO ai_assistants_id FROM features WHERE slug = 'ai-assistants';
  SELECT id INTO sla_guarantees_id FROM features WHERE slug = 'sla-guarantees';

  -- Solo Agent Pro (Tier 1) - Base features
  INSERT INTO plan_features (plan_id, feature_id, is_enabled) VALUES
    (solo_id, full_crm_id, true),
    (solo_id, lead_workflows_id, true),
    (solo_id, ai_neighborhoods_id, true),
    (solo_id, open_house_reg_id, true),
    (solo_id, payments_invoicing_id, true),
    (solo_id, basic_pm_id, true),
    (solo_id, tenant_portal_limited_id, true);

  -- Team Growth (Tier 2) - Includes Solo + Team features
  INSERT INTO plan_features (plan_id, feature_id, is_enabled) VALUES
    -- Solo features
    (team_id, full_crm_id, true),
    (team_id, lead_workflows_id, true),
    (team_id, ai_neighborhoods_id, true),
    (team_id, open_house_reg_id, true),
    (team_id, payments_invoicing_id, true),
    (team_id, basic_pm_id, true),
    (team_id, tenant_portal_limited_id, true),
    -- Team Growth features
    (team_id, shared_crm_id, true),
    (team_id, team_reporting_id, true),
    (team_id, multi_agent_access_id, true),
    (team_id, expanded_pm_id, true),
    (team_id, team_open_house_id, true);

  -- Brokerage Growth (Tier 3) - Includes Solo + Team + Brokerage features
  INSERT INTO plan_features (plan_id, feature_id, is_enabled) VALUES
    -- Solo features
    (broker_growth_id, full_crm_id, true),
    (broker_growth_id, lead_workflows_id, true),
    (broker_growth_id, ai_neighborhoods_id, true),
    (broker_growth_id, open_house_reg_id, true),
    (broker_growth_id, payments_invoicing_id, true),
    (broker_growth_id, basic_pm_id, true),
    (broker_growth_id, tenant_portal_limited_id, true),
    -- Team Growth features
    (broker_growth_id, shared_crm_id, true),
    (broker_growth_id, team_reporting_id, true),
    (broker_growth_id, multi_agent_access_id, true),
    (broker_growth_id, expanded_pm_id, true),
    (broker_growth_id, team_open_house_id, true),
    -- Brokerage Growth features
    (broker_growth_id, brokerage_admin_id, true),
    (broker_growth_id, central_billing_id, true),
    (broker_growth_id, branded_portal_id, true),
    (broker_growth_id, broker_dashboard_id, true),
    (broker_growth_id, onboarding_support_id, true);

  -- Brokerage Scale (Tier 4) - Includes Solo + Team + Brokerage + Scale features
  INSERT INTO plan_features (plan_id, feature_id, is_enabled) VALUES
    -- Solo features
    (broker_scale_id, full_crm_id, true),
    (broker_scale_id, lead_workflows_id, true),
    (broker_scale_id, ai_neighborhoods_id, true),
    (broker_scale_id, open_house_reg_id, true),
    (broker_scale_id, payments_invoicing_id, true),
    (broker_scale_id, basic_pm_id, true),
    (broker_scale_id, tenant_portal_limited_id, true),
    -- Team Growth features
    (broker_scale_id, shared_crm_id, true),
    (broker_scale_id, team_reporting_id, true),
    (broker_scale_id, multi_agent_access_id, true),
    (broker_scale_id, expanded_pm_id, true),
    (broker_scale_id, team_open_house_id, true),
    -- Brokerage Growth features
    (broker_scale_id, brokerage_admin_id, true),
    (broker_scale_id, central_billing_id, true),
    (broker_scale_id, branded_portal_id, true),
    (broker_scale_id, broker_dashboard_id, true),
    (broker_scale_id, onboarding_support_id, true),
    -- Brokerage Scale features
    (broker_scale_id, priority_support_id, true),
    (broker_scale_id, advanced_reporting_id, true),
    (broker_scale_id, higher_volume_id, true),
    (broker_scale_id, operational_workflows_id, true);

  -- Enterprise Operator (Tier 5) - All features
  INSERT INTO plan_features (plan_id, feature_id, is_enabled) VALUES
    -- Solo features
    (enterprise_id, full_crm_id, true),
    (enterprise_id, lead_workflows_id, true),
    (enterprise_id, ai_neighborhoods_id, true),
    (enterprise_id, open_house_reg_id, true),
    (enterprise_id, payments_invoicing_id, true),
    (enterprise_id, basic_pm_id, true),
    (enterprise_id, tenant_portal_limited_id, true),
    -- Team Growth features
    (enterprise_id, shared_crm_id, true),
    (enterprise_id, team_reporting_id, true),
    (enterprise_id, multi_agent_access_id, true),
    (enterprise_id, expanded_pm_id, true),
    (enterprise_id, team_open_house_id, true),
    -- Brokerage Growth features
    (enterprise_id, brokerage_admin_id, true),
    (enterprise_id, central_billing_id, true),
    (enterprise_id, branded_portal_id, true),
    (enterprise_id, broker_dashboard_id, true),
    (enterprise_id, onboarding_support_id, true),
    -- Brokerage Scale features
    (enterprise_id, priority_support_id, true),
    (enterprise_id, advanced_reporting_id, true),
    (enterprise_id, higher_volume_id, true),
    (enterprise_id, operational_workflows_id, true),
    -- Enterprise features
    (enterprise_id, agent_count_pricing_id, true),
    (enterprise_id, property_volume_pricing_id, true),
    (enterprise_id, tenant_volume_pricing_id, true),
    (enterprise_id, mls_integration_id, true),
    (enterprise_id, ai_assistants_id, true),
    (enterprise_id, sla_guarantees_id, true);

  RAISE NOTICE 'Successfully updated plan features for all subscription tiers';
END $$;
