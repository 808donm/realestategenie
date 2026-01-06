-- Configure GHL lease template ID for direct document creation
-- Replace YOUR_TEMPLATE_ID with your actual GHL template ID
--
-- To find your template ID:
-- 1. Go to GHL → Marketing → Documents & Contracts
-- 2. Click on your lease template
-- 3. Copy the ID from the URL (e.g., the ID in: /location/xxx/documents/templates/abc123xyz)

UPDATE integrations
SET
  config = jsonb_set(
    config,
    '{ghl_lease_template_id}',
    '"YOUR_TEMPLATE_ID"'::jsonb
  ),
  updated_at = NOW()
WHERE
  agent_id = 'b80d448f-d58a-4cb6-bb13-f5a6d38b30ae'
  AND provider = 'ghl';

-- Verify the update
SELECT
  agent_id,
  provider,
  config->>'ghl_lease_template_id' as lease_template_id,
  config->>'ghl_location_id' as location_id,
  status,
  updated_at
FROM integrations
WHERE
  agent_id = 'b80d448f-d58a-4cb6-bb13-f5a6d38b30ae'
  AND provider = 'ghl';
