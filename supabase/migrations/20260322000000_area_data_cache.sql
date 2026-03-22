-- Area data cache for pre-fetched neighborhood, federal, and market stats data.
-- Keyed by zip_code + data_type, refreshed monthly by cron job.
-- This avoids repeated external API calls for area-level data that changes slowly.

CREATE TABLE IF NOT EXISTS area_data_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  zip_code text NOT NULL,
  data_type text NOT NULL CHECK (data_type IN ('neighborhood', 'federal', 'market_stats')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (zip_code, data_type)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_area_data_cache_zip_type ON area_data_cache (zip_code, data_type);
CREATE INDEX IF NOT EXISTS idx_area_data_cache_fetched_at ON area_data_cache (fetched_at);

-- RLS: allow authenticated users to read cached data
ALTER TABLE area_data_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read area data cache"
  ON area_data_cache FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update (cron job runs with service role key)
CREATE POLICY "Service role can manage area data cache"
  ON area_data_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
