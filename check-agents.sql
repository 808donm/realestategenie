-- Check all agents and their GHL integrations
SELECT
  a.id as agent_id,
  a.email,
  i.id as integration_id,
  i.created_at,
  i.updated_at,
  i.config->>'ghl_location_id' as location_id,
  i.config->>'ghl_user_id' as user_id
FROM agents a
LEFT JOIN integrations i ON i.agent_id = a.id AND i.provider = 'ghl'
ORDER BY i.created_at DESC;

-- Show the most recent GHL integration
SELECT
  agent_id,
  id as integration_id,
  created_at,
  config->>'ghl_location_id' as location_id,
  config->>'ghl_user_id' as user_id
FROM integrations
WHERE provider = 'ghl'
ORDER BY created_at DESC
LIMIT 5;
