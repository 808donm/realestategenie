-- Property Data Cache
-- System-wide persistent cache for Realie/ATTOM property data.
-- 7-day TTL, shared across all users and serverless invocations.

CREATE TABLE IF NOT EXISTS public.property_data_cache (
  cache_key  TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  source     TEXT NOT NULL DEFAULT 'realie',
  raw_key    TEXT,  -- human-readable cache key for debugging (truncated)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index for efficient expiry cleanup
CREATE INDEX IF NOT EXISTS idx_property_data_cache_expires
  ON public.property_data_cache (expires_at);

-- Allow service-role full access (no RLS needed — this is server-side only)
ALTER TABLE public.property_data_cache ENABLE ROW LEVEL SECURITY;

-- Service role bypass policy
CREATE POLICY "Service role full access"
  ON public.property_data_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.property_data_cache IS
  'System-wide cache for property data from Realie and ATTOM APIs. 7-day TTL.';
