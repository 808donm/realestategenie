-- Add flyer-specific description and structured feature highlights
-- Full description (listing_description) stays for internal use
-- flyer_description is a short version for the flyer
-- flyer_features stores up to 4 structured highlights (beds, baths, parking, custom)

ALTER TABLE open_house_events
ADD COLUMN IF NOT EXISTS flyer_description TEXT,
ADD COLUMN IF NOT EXISTS flyer_features JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN open_house_events.flyer_description IS 'Short property description for flyer (separate from full listing_description)';
COMMENT ON COLUMN open_house_events.flyer_features IS 'Structured feature highlights for flyer: array of {icon, label, value} objects, max 4';
