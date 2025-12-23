-- Add GHL Custom Object ID to open_house_events
-- This stores the ID of the OpenHouse Custom Object in GHL

ALTER TABLE open_house_events
ADD COLUMN IF NOT EXISTS ghl_custom_object_id TEXT;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_open_house_events_ghl_id
  ON open_house_events(ghl_custom_object_id)
  WHERE ghl_custom_object_id IS NOT NULL;

COMMENT ON COLUMN open_house_events.ghl_custom_object_id IS 'ID of the OpenHouse Custom Object in GHL (when synced)';
