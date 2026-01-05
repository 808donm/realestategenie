-- Property Fact Sheet Fields for Open House Events
-- Verified property information shown to attendees

ALTER TABLE open_house_events
ADD COLUMN IF NOT EXISTS beds INTEGER,
ADD COLUMN IF NOT EXISTS baths NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS sqft INTEGER,
ADD COLUMN IF NOT EXISTS price NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS key_features TEXT[], -- Array of bullet points
ADD COLUMN IF NOT EXISTS hoa_fee NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS parking_notes TEXT,
ADD COLUMN IF NOT EXISTS showing_notes TEXT,
ADD COLUMN IF NOT EXISTS disclosure_url TEXT,
ADD COLUMN IF NOT EXISTS offer_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS flyer_url TEXT,
ADD COLUMN IF NOT EXISTS flyer_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS listing_description TEXT,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES agents(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

COMMENT ON COLUMN open_house_events.beds IS 'Number of bedrooms';
COMMENT ON COLUMN open_house_events.baths IS 'Number of bathrooms (can be decimal, e.g., 2.5)';
COMMENT ON COLUMN open_house_events.sqft IS 'Square footage';
COMMENT ON COLUMN open_house_events.price IS 'Listing price';
COMMENT ON COLUMN open_house_events.key_features IS 'Array of key property features';
COMMENT ON COLUMN open_house_events.hoa_fee IS 'Monthly HOA fee (if applicable)';
COMMENT ON COLUMN open_house_events.parking_notes IS 'Parking instructions for attendees';
COMMENT ON COLUMN open_house_events.showing_notes IS 'Special showing instructions';
COMMENT ON COLUMN open_house_events.disclosure_url IS 'Link to property disclosures';
COMMENT ON COLUMN open_house_events.offer_deadline IS 'Deadline for offers';
COMMENT ON COLUMN open_house_events.flyer_url IS 'URL to uploaded property flyer PDF';
COMMENT ON COLUMN open_house_events.flyer_enabled IS 'Whether flyer download is enabled for attendees';
COMMENT ON COLUMN open_house_events.listing_description IS 'Full listing description text';
COMMENT ON COLUMN open_house_events.verified_by IS 'Agent who verified the fact sheet';
COMMENT ON COLUMN open_house_events.verified_at IS 'When fact sheet was verified';
