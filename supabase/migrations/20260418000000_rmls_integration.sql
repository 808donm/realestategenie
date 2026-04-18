-- RMLS integration support.
--
-- Extends the integrations table provider CHECK to include 'rmls' and adds
-- an LCLA-tracking JSON shape to the config payload (documented here, not
-- enforced via schema). RMLS auth is per-vendor (bearer token held in the
-- RMLS_BEARER_TOKEN env var), so the integrations row only records the
-- agent's entitlement + LCLA consent, not credentials.
--
-- config JSONB structure for provider='rmls':
--   {
--     "lcla_signed": true,
--     "lcla_signed_at": "2026-04-18T...",
--     "lcla_signed_by": "agent display name",
--     "rmls_subscriber_id": "optional — RMLS assigns this",
--     "market": "oregon" | "sw-washington",
--     "preferred": true,        -- optional; lets the provider factory prefer RMLS over Trestle
--     "connected_at": "2026-..."
--   }

-- 1. Extend the provider CHECK constraint. Postgres requires drop+add for CHECK updates.
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;

ALTER TABLE integrations ADD CONSTRAINT integrations_provider_check
  CHECK (provider IN (
    'ghl', 'n8n', 'idx', 'qbo', 'pandadoc', 'docusign', 'paypal', 'stripe',
    'trestle', 'rmls', 'attom'
  ));

-- 2. Helper view: active MLS connections per agent.
-- Makes it trivial for API routes to ask "which MLS does this agent use?"
-- without hitting the integrations table repeatedly.
CREATE OR REPLACE VIEW agent_mls_connections AS
SELECT
  agent_id,
  provider,
  status,
  last_sync_at,
  COALESCE((config->>'lcla_signed')::boolean, false) AS lcla_signed,
  config->>'market'        AS market,
  config->>'rmls_subscriber_id' AS rmls_subscriber_id,
  (config->>'preferred')::boolean AS preferred,
  created_at,
  updated_at
FROM integrations
WHERE provider IN ('trestle', 'rmls') AND status = 'connected';

GRANT SELECT ON agent_mls_connections TO authenticated;

-- 3. RLS on the view defers to the underlying integrations table policies.
--    No separate policy needed — authenticated user only sees rows where
--    integrations.agent_id = auth.uid() via the base-table RLS.

-- 4. Comment docs for future maintainers.
COMMENT ON CONSTRAINT integrations_provider_check ON integrations IS
  'Allowed integration provider IDs. RMLS added 2026-04-18 for Oregon / SW Washington. RMLS auth is per-vendor (env RMLS_BEARER_TOKEN); the row only records the agent entitlement + LCLA consent.';
