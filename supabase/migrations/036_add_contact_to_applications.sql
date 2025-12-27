-- Add pm_contact_id to pm_applications to link approved applications to contacts
ALTER TABLE pm_applications
ADD COLUMN IF NOT EXISTS pm_contact_id UUID REFERENCES pm_contacts(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_pm_applications_contact_id ON pm_applications(pm_contact_id);
