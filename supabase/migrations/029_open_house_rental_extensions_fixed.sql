-- Migration 029: Open House Rental Extensions (FIXED)
-- Extends open_house_events table to support rental showings and rental applications

-- Add event_type and pm_property_id columns to open_house_events
ALTER TABLE open_house_events
ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'sales' CHECK (event_type IN ('sales', 'rental', 'both')),
ADD COLUMN IF NOT EXISTS pm_property_id UUID REFERENCES pm_properties(id) ON DELETE SET NULL;

-- Add index for pm_property_id
CREATE INDEX IF NOT EXISTS idx_open_house_events_pm_property_id ON open_house_events(pm_property_id);

-- Add index for event_type
CREATE INDEX IF NOT EXISTS idx_open_house_events_event_type ON open_house_events(event_type);

-- Comment on new columns
COMMENT ON COLUMN open_house_events.event_type IS 'Type of open house: sales (traditional), rental (showing), or both (attendee chooses)';
COMMENT ON COLUMN open_house_events.pm_property_id IS 'Link to rental property (for rental or both events)';

-- DROP the existing view first, then recreate it with new columns
DROP VIEW IF EXISTS public_open_house_event;

CREATE VIEW public_open_house_event AS
SELECT
  ohe.id,
  ohe.address,
  ohe.start_at,
  ohe.end_at,
  ohe.details_page_enabled,
  ohe.flyer_pdf_url,
  ohe.pdf_download_enabled,
  ohe.latitude,
  ohe.longitude,
  ohe.event_type,
  ohe.pm_property_id,
  a.display_name,
  a.license_number,
  a.phone_e164,
  a.locations_served,
  a.photo_url,
  a.headshot_url,
  a.company_logo_url
FROM open_house_events ohe
JOIN agents a ON ohe.agent_id = a.id
WHERE ohe.status = 'published';

-- Grant access to the view
GRANT SELECT ON public_open_house_event TO anon, authenticated;
