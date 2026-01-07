-- Add missing columns to pm_work_orders for tenant portal
-- These columns are needed for tenant-submitted work orders

ALTER TABLE pm_work_orders
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS tenant_availability TEXT;

COMMENT ON COLUMN pm_work_orders.location IS 'Location within the unit (e.g., Master bathroom, Kitchen)';
COMMENT ON COLUMN pm_work_orders.tenant_availability IS 'Tenant availability for repairs (e.g., Weekdays after 5pm)';
