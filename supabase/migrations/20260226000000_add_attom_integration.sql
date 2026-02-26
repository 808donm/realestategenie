-- Add ATTOM Data to integrations provider enum
-- ATTOM provides property ownership, tax assessments, sales history, AVM, and foreclosure data

-- Drop existing constraint
ALTER TABLE integrations
DROP CONSTRAINT IF EXISTS integrations_provider_check;

-- Add new constraint with ATTOM provider
ALTER TABLE integrations
ADD CONSTRAINT integrations_provider_check
CHECK (provider IN ('ghl', 'n8n', 'idx', 'qbo', 'pandadoc', 'docusign', 'paypal', 'stripe', 'trestle', 'attom'));

COMMENT ON TABLE integrations IS 'OAuth connections and API configurations for third-party integrations (GHL, n8n, QuickBooks, PandaDoc, DocuSign, Trestle, ATTOM, etc.)';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
