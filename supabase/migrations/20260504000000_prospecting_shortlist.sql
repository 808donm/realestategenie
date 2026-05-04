-- Prospecting Shortlist + Search Dedup
--
-- Two tables that together implement the "shopping cart" workflow on the
-- Prospecting page: agent runs multiple searches, cherry-picks results
-- into a persistent shortlist, then runs skip trace once at the end on
-- the curated list and exports to a power-dialer-friendly XLSX.

-- ══════════════════════════════════════════════════════════════════
-- 1. Search Dedup Tracking
-- Tracks which property IDs have been returned to a given agent for a
-- given (zip, mode, propertyType) tuple so re-running the same search
-- returns NEW properties instead of the same 25 every time.
-- 30-day TTL — the same property can resurface after a month so stale
-- ownership / equity signals get a chance to refresh.
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS prospecting_fetched_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  attom_id TEXT NOT NULL,
  zip TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('absentee', 'equity', 'foreclosure', 'investor', 'radius')),
  property_type TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospecting_fetched_lookup
  ON prospecting_fetched_ids(agent_id, zip, mode, property_type, fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_prospecting_fetched_attom
  ON prospecting_fetched_ids(agent_id, attom_id);

CREATE INDEX IF NOT EXISTS idx_prospecting_fetched_at
  ON prospecting_fetched_ids(fetched_at);

-- Unique-by-tuple so re-inserting the same property in the same search
-- context is idempotent
CREATE UNIQUE INDEX IF NOT EXISTS uq_prospecting_fetched
  ON prospecting_fetched_ids(agent_id, attom_id, zip, mode, COALESCE(property_type, ''));

ALTER TABLE prospecting_fetched_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see their own fetched IDs"
  ON prospecting_fetched_ids FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Service role manages all fetched IDs"
  ON prospecting_fetched_ids FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════
-- 2. Shortlist (Shopping Cart)
-- Per-agent persistent list of properties picked from search results.
-- Stores the full property snapshot so search-result churn doesn't
-- invalidate selections. Skip trace results merge into the row when
-- the agent runs the bulk skip trace step.
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS prospecting_shortlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  attom_id TEXT NOT NULL,

  -- Address + basics for table display
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  property_type TEXT,
  owner_name TEXT,

  -- Lead context captured at the time of selection
  source_mode TEXT, -- absentee | equity | foreclosure | investor | radius
  lead_score TEXT,  -- hot | warm | cold (from REAPI response)
  estimated_value NUMERIC,
  estimated_equity NUMERIC,
  years_owned INTEGER,

  -- Full property record snapshot — saves us from re-fetching when the
  -- agent comes back next session and wants to view details.
  property_data JSONB,

  -- Skip trace fields. Populated by the bulk skip-trace step.
  skip_traced_at TIMESTAMPTZ,
  skip_trace_phones JSONB, -- array of { number, type?, source? }
  skip_trace_emails JSONB, -- array of { email, source? }
  skip_trace_data JSONB,   -- raw response for future-proofing

  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per (agent, attom_id) — adding the same property twice updates
-- in place rather than duplicating
CREATE UNIQUE INDEX IF NOT EXISTS uq_prospecting_shortlist_agent_property
  ON prospecting_shortlist(agent_id, attom_id);

CREATE INDEX IF NOT EXISTS idx_prospecting_shortlist_agent
  ON prospecting_shortlist(agent_id, added_at DESC);

CREATE INDEX IF NOT EXISTS idx_prospecting_shortlist_skip_trace
  ON prospecting_shortlist(agent_id, skip_traced_at);

ALTER TABLE prospecting_shortlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents manage their own shortlist"
  ON prospecting_shortlist FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Service role manages all shortlists"
  ON prospecting_shortlist FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════
-- Trigger: keep updated_at fresh on shortlist rows
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_prospecting_shortlist_timestamp()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prospecting_shortlist_updated_at ON prospecting_shortlist;
CREATE TRIGGER trg_prospecting_shortlist_updated_at
  BEFORE UPDATE ON prospecting_shortlist
  FOR EACH ROW
  EXECUTE FUNCTION update_prospecting_shortlist_timestamp();
