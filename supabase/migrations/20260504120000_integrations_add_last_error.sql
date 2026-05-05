-- Add last_error column to integrations table.
--
-- Multiple call sites write to this column (ghl test, ghl sync, realie
-- test, ghl PIT connect) and the sync-health endpoint SELECTs it, but
-- the column was never created. Writes were either silently caught by
-- // Non-critical try/catch swallowers or returned an error to the
-- frontend ("Could not find 'last_error' column").
--
-- Already applied to production via apply_migration on 2026-05-04.
-- Tracked here for parity with the migrations folder.

ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS last_error TEXT;

COMMENT ON COLUMN public.integrations.last_error IS
  'Most recent error message for this integration. NULL on healthy/success.';
