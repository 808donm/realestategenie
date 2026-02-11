-- Update pipeline configuration for agent b80d448f-d58a-4cb6-bb13-f5a6d38b30ae
-- Pipeline ID: yGkdoIRAz83GmWQ74HOw
-- New Lead Stage ID: ac0c6f3b-56fa-42aa-951b-79907dbb0c2b

UPDATE integrations
SET
  config = jsonb_set(
    jsonb_set(
      config,
      '{ghl_pipeline_id}',
      '"yGkdoIRAz83GmWQ74HOw"'
    ),
    '{ghl_new_lead_stage}',
    '"ac0c6f3b-56fa-42aa-951b-79907dbb0c2b"'
  ),
  updated_at = NOW()
WHERE
  agent_id = 'b80d448f-d58a-4cb6-bb13-f5a6d38b30ae'
  AND provider = 'ghl';

-- Verify the update
SELECT
  id,
  agent_id,
  provider,
  config->>'ghl_pipeline_id' as pipeline_id,
  config->>'ghl_new_lead_stage' as new_lead_stage,
  config->>'ghl_location_id' as location_id,
  updated_at
FROM integrations
WHERE
  agent_id = 'b80d448f-d58a-4cb6-bb13-f5a6d38b30ae'
  AND provider = 'ghl';
