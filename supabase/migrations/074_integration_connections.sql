-- Migration: Integration Connections for OAuth
-- Stores OAuth tokens and connection details for Stripe, PayPal, and other integrations

-- ============================================================================
-- INTEGRATION CONNECTIONS TABLE
-- ============================================================================

CREATE TABLE integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,

  -- Integration details
  integration_type TEXT NOT NULL CHECK (integration_type IN ('stripe', 'paypal', 'quickbooks', 'gohighlevel', 'pandadoc')),

  -- OAuth tokens (encrypted at rest)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Integration-specific IDs
  external_account_id TEXT, -- Stripe connected account ID, PayPal merchant ID, etc.
  external_user_id TEXT,

  -- Connection metadata
  connection_status TEXT NOT NULL DEFAULT 'connected' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'expired')),
  last_synced_at TIMESTAMPTZ,
  error_message TEXT,

  -- Integration capabilities/scopes
  scopes TEXT[],

  -- Additional metadata (JSON for flexibility)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one connection per agent per integration type
  UNIQUE(agent_id, integration_type)
);

CREATE INDEX idx_integration_connections_agent_id ON integration_connections(agent_id);
CREATE INDEX idx_integration_connections_account_id ON integration_connections(account_id);
CREATE INDEX idx_integration_connections_type ON integration_connections(integration_type);
CREATE INDEX idx_integration_connections_status ON integration_connections(connection_status);
CREATE INDEX idx_integration_connections_external_account ON integration_connections(external_account_id);

-- Enable RLS
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;

-- Agents can view and manage their own connections
CREATE POLICY "Agents can view own connections"
  ON integration_connections FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can insert own connections"
  ON integration_connections FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own connections"
  ON integration_connections FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can delete own connections"
  ON integration_connections FOR DELETE
  USING (agent_id = auth.uid());

-- Account admins can view connections in their account
CREATE POLICY "Account admins can view account connections"
  ON integration_connections FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM account_members
      WHERE agent_id = auth.uid()
        AND account_role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if agent has a specific integration connected
CREATE OR REPLACE FUNCTION has_integration_connected(
  p_agent_id UUID,
  p_integration_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM integration_connections
    WHERE agent_id = p_agent_id
      AND integration_type = p_integration_type
      AND connection_status = 'connected'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active integration connection
CREATE OR REPLACE FUNCTION get_integration_connection(
  p_agent_id UUID,
  p_integration_type TEXT
)
RETURNS integration_connections AS $$
DECLARE
  connection integration_connections;
BEGIN
  SELECT * INTO connection
  FROM integration_connections
  WHERE agent_id = p_agent_id
    AND integration_type = p_integration_type
    AND connection_status = 'connected'
  ORDER BY connected_at DESC
  LIMIT 1;

  RETURN connection;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark connection as expired if token is past expiration
CREATE OR REPLACE FUNCTION check_expired_connections()
RETURNS void AS $$
BEGIN
  UPDATE integration_connections
  SET connection_status = 'expired',
      error_message = 'Access token expired',
      updated_at = NOW()
  WHERE connection_status = 'connected'
    AND token_expires_at IS NOT NULL
    AND token_expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE integration_connections IS 'OAuth connections for third-party integrations (Stripe, PayPal, etc.)';
COMMENT ON COLUMN integration_connections.access_token IS 'OAuth access token (should be encrypted at rest)';
COMMENT ON COLUMN integration_connections.external_account_id IS 'Connected account ID in external system (e.g., Stripe acct_xxx)';
COMMENT ON COLUMN integration_connections.scopes IS 'OAuth scopes granted during connection';
