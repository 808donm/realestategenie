-- Add secondary and tertiary photo URL columns for multi-image flyer templates
ALTER TABLE open_house_events
  ADD COLUMN IF NOT EXISTS secondary_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS tertiary_photo_url TEXT;
