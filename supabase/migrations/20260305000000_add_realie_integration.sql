-- Add Realie.ai to integrations provider enum
-- Realie.ai provides county-sourced property data: ownership, tax assessments,
-- sales history, valuations, and parcel boundaries at lower cost than ATTOM.
-- It serves as the primary property data source, with ATTOM supplementing gaps.

-- Drop existing constraint
ALTER TABLE integrations
DROP CONSTRAINT IF EXISTS integrations_provider_check;

-- Add new constraint with realie provider
ALTER TABLE integrations
ADD CONSTRAINT integrations_provider_check
CHECK (provider IN ('ghl', 'n8n', 'idx', 'qbo', 'pandadoc', 'docusign', 'paypal', 'stripe', 'trestle', 'attom', 'federal_data', 'realie'));

COMMENT ON TABLE integrations IS 'OAuth connections and API configurations for third-party integrations (GHL, n8n, QuickBooks, PandaDoc, DocuSign, Trestle, ATTOM, Federal Data, Realie.ai, etc.)';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
