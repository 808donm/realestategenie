-- Recreate public_open_house_event view with all required columns
-- This ensures the view works even if previous migrations were missed

DROP VIEW IF EXISTS public_open_house_event;

CREATE OR REPLACE VIEW public_open_house_event AS
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
  a.display_name,
  a.license_number,
  a.phone_e164,
  a.locations_served,
  a.photo_url,
  a.headshot_url,
  a.company_logo_url
FROM open_house_events ohe
JOIN agents a ON ohe.agent_id = a.id
WHERE ohe.status = 'published'
  AND ohe.details_page_enabled = true;

-- Grant access to anonymous and authenticated users
GRANT SELECT ON public_open_house_event TO anon, authenticated;

-- Add comment
COMMENT ON VIEW public_open_house_event IS 'Public view of published open houses with agent details. Only shows published events with details page enabled.';
