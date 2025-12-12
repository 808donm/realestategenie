-- Fix missing columns in integrations table
-- Run this in Supabase SQL Editor if the integrations table is missing columns

-- Add last_sync_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integrations'
    AND column_name = 'last_sync_at'
  ) THEN
    ALTER TABLE integrations ADD COLUMN last_sync_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integrations'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE integrations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add created_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integrations'
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE integrations ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

COMMENT ON COLUMN integrations.last_sync_at IS 'Last time the integration synced data';
COMMENT ON COLUMN integrations.updated_at IS 'Last time the integration configuration was updated';
COMMENT ON COLUMN integrations.created_at IS 'When the integration was first connected';
