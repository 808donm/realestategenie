-- Agent-created MLS listings stored locally
-- Made idempotent so it can be re-run safely if partially applied.
CREATE TABLE IF NOT EXISTS agent_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Status
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Active', 'Pending', 'Closed', 'Withdrawn', 'Expired', 'Canceled')),

  -- Address
  street_number text,
  street_name text,
  street_suffix text,
  unit_number text,
  city text NOT NULL,
  state_or_province text NOT NULL DEFAULT 'NJ',
  postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  unparsed_address text,
  latitude numeric,
  longitude numeric,

  -- Property details
  property_type text NOT NULL DEFAULT 'Residential' CHECK (property_type IN ('Residential', 'Residential Income', 'Commercial', 'Land', 'Farm')),
  property_sub_type text,
  bedrooms_total integer,
  bathrooms_total integer,
  living_area numeric,
  lot_size_area numeric,
  year_built integer,
  stories integer,
  garage_spaces integer,
  parking_total integer,

  -- Pricing
  list_price numeric NOT NULL,
  original_list_price numeric,
  close_price numeric,

  -- Descriptions
  public_remarks text,
  private_remarks text,

  -- Agent / Office
  list_agent_name text,
  list_agent_email text,
  list_agent_phone text,
  list_office_name text,

  -- Dates
  on_market_date date,
  listing_contract_date date,
  close_date date,
  expiration_date date,

  -- Features (stored as JSONB arrays for flexibility)
  interior_features jsonb DEFAULT '[]'::jsonb,
  exterior_features jsonb DEFAULT '[]'::jsonb,
  appliances jsonb DEFAULT '[]'::jsonb,
  heating jsonb DEFAULT '[]'::jsonb,
  cooling jsonb DEFAULT '[]'::jsonb,

  -- Photos stored as JSONB array of { url, order, description }
  photos jsonb DEFAULT '[]'::jsonb,

  -- MLS reference (if synced)
  mls_listing_id text,
  mls_listing_key text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_agent_listings_user_id ON agent_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_listings_status ON agent_listings(status);
CREATE INDEX IF NOT EXISTS idx_agent_listings_created ON agent_listings(created_at DESC);

-- RLS policies
ALTER TABLE agent_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own listings" ON agent_listings;
CREATE POLICY "Users can view own listings"
  ON agent_listings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own listings" ON agent_listings;
CREATE POLICY "Users can create own listings"
  ON agent_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own listings" ON agent_listings;
CREATE POLICY "Users can update own listings"
  ON agent_listings FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own listings" ON agent_listings;
CREATE POLICY "Users can delete own listings"
  ON agent_listings FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_agent_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_agent_listings_updated_at ON agent_listings;
CREATE TRIGGER trigger_agent_listings_updated_at
  BEFORE UPDATE ON agent_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_listings_updated_at();

-- Storage bucket for listing photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-photos', 'listing-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for listing photos
DROP POLICY IF EXISTS "Users can upload listing photos" ON storage.objects;
CREATE POLICY "Users can upload listing photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listing-photos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own listing photos" ON storage.objects;
CREATE POLICY "Users can update own listing photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'listing-photos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete own listing photos" ON storage.objects;
CREATE POLICY "Users can delete own listing photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'listing-photos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can view listing photos" ON storage.objects;
CREATE POLICY "Anyone can view listing photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-photos');
