-- Add Trestle (CoreLogic MLS) to integrations provider enum
-- Trestle provides MLS property listings via RESO Web API

-- Drop existing constraint
ALTER TABLE integrations
DROP CONSTRAINT IF EXISTS integrations_provider_check;

-- Add new constraint with Trestle provider
ALTER TABLE integrations
ADD CONSTRAINT integrations_provider_check
CHECK (provider IN ('ghl', 'n8n', 'idx', 'qbo', 'pandadoc', 'docusign', 'paypal', 'stripe', 'trestle'));

COMMENT ON TABLE integrations IS 'OAuth connections and API configurations for third-party integrations (GHL, n8n, QuickBooks, PandaDoc, DocuSign, Trestle, etc.)';

-- Reload PostgREST schema cache so the updated constraint is recognized immediately
NOTIFY pgrst, 'reload schema';
