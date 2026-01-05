-- Add lease status and termination tracking fields
-- Migration: 032_pm_leases_status_termination.sql

-- Add status field to pm_leases
ALTER TABLE pm_leases
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'month_to_month', 'terminating', 'ended'));

-- Add termination_date field (only populated when notice is given)
ALTER TABLE pm_leases
ADD COLUMN IF NOT EXISTS termination_date DATE;

-- Add termination_notice_date field (when notice was received)
ALTER TABLE pm_leases
ADD COLUMN IF NOT EXISTS termination_notice_date DATE;

-- Update existing leases to have 'active' status
UPDATE pm_leases
SET status = 'active'
WHERE status IS NULL;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_pm_leases_status ON pm_leases(status);

-- Create index for termination date queries
CREATE INDEX IF NOT EXISTS idx_pm_leases_termination_date ON pm_leases(termination_date) WHERE termination_date IS NOT NULL;
