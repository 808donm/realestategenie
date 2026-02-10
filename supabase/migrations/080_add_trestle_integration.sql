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

-- RPC function to upsert Trestle integration (bypasses PostgREST schema cache issues)
CREATE OR REPLACE FUNCTION upsert_trestle_integration(
  p_agent_id UUID,
  p_config JSONB,
  p_last_sync_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS void AS $$
BEGIN
  INSERT INTO integrations (agent_id, provider, config, status, last_sync_at)
  VALUES (p_agent_id, 'trestle', p_config, 'connected', p_last_sync_at)
  ON CONFLICT (agent_id, provider)
  DO UPDATE SET
    config = EXCLUDED.config,
    status = EXCLUDED.status,
    last_sync_at = EXCLUDED.last_sync_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_trestle_integration(UUID, JSONB, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_trestle_integration(UUID, JSONB, TIMESTAMPTZ) TO service_role;

-- Reload PostgREST schema cache so the new function and constraint are recognized
NOTIFY pgrst, 'reload schema';
