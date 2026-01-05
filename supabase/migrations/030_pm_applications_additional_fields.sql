-- Add missing fields to pm_applications table
-- These fields are collected in the rental application form but weren't in the original schema

ALTER TABLE pm_applications
-- Basic applicant info
ADD COLUMN IF NOT EXISTS number_of_occupants INTEGER,

-- Employment details
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS employment_length TEXT,
ADD COLUMN IF NOT EXISTS employer_phone TEXT,

-- Current residence details
ADD COLUMN IF NOT EXISTS landlord_name TEXT,
ADD COLUMN IF NOT EXISTS landlord_phone TEXT,
ADD COLUMN IF NOT EXISTS current_rent NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS reason_for_moving TEXT,
ADD COLUMN IF NOT EXISTS years_at_address TEXT,

-- Additional info
ADD COLUMN IF NOT EXISTS vehicles TEXT, -- Can be JSONB if needed, but TEXT for simple description works
ADD COLUMN IF NOT EXISTS background_check_consent BOOLEAN DEFAULT FALSE,

-- Approval tracking
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add comment for clarity
COMMENT ON COLUMN pm_applications.approved_at IS 'Timestamp when the application was approved';
COMMENT ON COLUMN pm_applications.background_check_consent IS 'Whether applicant consented to background check';
COMMENT ON COLUMN pm_applications.number_of_occupants IS 'Total number of people who will occupy the unit';
