-- Add brokerage_name to public_open_house_event view
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
  a.company_logo_url,
  a.agency_name as brokerage_name
FROM open_house_events ohe
JOIN agents a ON ohe.agent_id = a.id
WHERE ohe.status = 'published';

-- Grant access to the view
GRANT SELECT ON public_open_house_event TO anon, authenticated;
