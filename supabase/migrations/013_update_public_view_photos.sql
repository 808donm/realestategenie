-- Update public_open_house_event view to include headshot_url, company_logo_url, and location
-- This allows the open house registration page to display agent photos and map

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
WHERE ohe.status = 'published';
