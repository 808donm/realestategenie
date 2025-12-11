-- Add property photo URL to open house events
ALTER TABLE open_house_events
ADD COLUMN IF NOT EXISTS property_photo_url TEXT;

COMMENT ON COLUMN open_house_events.property_photo_url IS 'URL to property photo in Supabase Storage';
