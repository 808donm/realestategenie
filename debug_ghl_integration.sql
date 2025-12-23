-- Check if GHL integration is connected
SELECT
  a.id as agent_id,
  a.display_name,
  a.email,
  i.provider,
  i.status,
  i.connected_at,
  i.last_sync_at,
  i.last_error,
  i.config->>'location_id' as location_id,
  CASE
    WHEN i.config->>'access_token' IS NOT NULL THEN 'Has access token'
    ELSE 'No access token'
  END as token_status
FROM agents a
LEFT JOIN integrations i ON a.id = i.agent_id AND i.provider = 'ghl'
ORDER BY a.created_at DESC;

-- Check recent lead submissions
SELECT
  id,
  created_at,
  agent_id,
  event_id,
  pushed_to_ghl,
  ghl_sync_error,
  payload->>'email' as lead_email,
  payload->>'name' as lead_name
FROM lead_submissions
ORDER BY created_at DESC
LIMIT 5;
