-- Add Federal Data to integrations provider enum
-- Federal Data provides supplemental property intelligence from US government sources:
-- USPS (vacancy), HUD (fair market rents), Census (demographics), FEMA (flood zones),
-- FHFA (loan limits), BLS (employment), EPA (environmental), CFPB (HMDA lending)

-- Drop existing constraint
ALTER TABLE integrations
DROP CONSTRAINT IF EXISTS integrations_provider_check;

-- Add new constraint with federal_data provider
ALTER TABLE integrations
ADD CONSTRAINT integrations_provider_check
CHECK (provider IN ('ghl', 'n8n', 'idx', 'qbo', 'pandadoc', 'docusign', 'paypal', 'stripe', 'trestle', 'attom', 'federal_data'));

COMMENT ON TABLE integrations IS 'OAuth connections and API configurations for third-party integrations (GHL, n8n, QuickBooks, PandaDoc, DocuSign, Trestle, ATTOM, Federal Data, etc.)';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
