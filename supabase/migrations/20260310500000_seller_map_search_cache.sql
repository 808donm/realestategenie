-- Seller Map Search Cache
-- Global cache for scored seller-map search results.
-- 7-day TTL, shared across all users. Keyed by geographic area.

CREATE TABLE IF NOT EXISTS public.seller_map_search_cache (
  cache_key   TEXT PRIMARY KEY,
  properties  JSONB NOT NULL,         -- scored property results array
  total       INTEGER NOT NULL DEFAULT 0,
  market_data JSONB,                  -- market context by zip
  center_lat  DOUBLE PRECISION,
  center_lng  DOUBLE PRECISION,
  radius      DOUBLE PRECISION,
  zip         TEXT,
  raw_key     TEXT,                   -- human-readable key for debugging
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

-- Index for efficient expiry cleanup
CREATE INDEX IF NOT EXISTS idx_seller_map_search_cache_expires
  ON public.seller_map_search_cache (expires_at);

-- Index for geographic lookups
CREATE INDEX IF NOT EXISTS idx_seller_map_search_cache_geo
  ON public.seller_map_search_cache (center_lat, center_lng, radius);

-- Allow service-role full access (server-side only)
ALTER TABLE public.seller_map_search_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON public.seller_map_search_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.seller_map_search_cache IS
  'Global cache for seller-map search results. 7-day TTL, shared across all app users.';
