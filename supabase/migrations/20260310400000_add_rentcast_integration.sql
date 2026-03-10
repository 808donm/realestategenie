-- Add Rentcast as a supported integration provider
-- Rentcast provides property data, rental AVM, listings, and market statistics.

ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;

ALTER TABLE integrations
ADD CONSTRAINT integrations_provider_check
CHECK (provider IN ('ghl', 'n8n', 'idx', 'qbo', 'pandadoc', 'docusign', 'paypal', 'stripe', 'trestle', 'attom', 'federal_data', 'realie', 'rentcast'));

COMMENT ON TABLE integrations IS 'OAuth connections and API configurations for third-party integrations (GHL, n8n, QuickBooks, PandaDoc, DocuSign, Trestle, ATTOM, Federal Data, Realie.ai, Rentcast, etc.)';
