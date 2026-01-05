-- Add property description and features fields for rental listings

ALTER TABLE pm_properties
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS bedrooms INTEGER,
ADD COLUMN IF NOT EXISTS bathrooms NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS square_feet INTEGER,
ADD COLUMN IF NOT EXISTS features TEXT[];

-- Add comments for clarity
COMMENT ON COLUMN pm_properties.description IS 'Detailed property description for rental listings';
COMMENT ON COLUMN pm_properties.bedrooms IS 'Number of bedrooms';
COMMENT ON COLUMN pm_properties.bathrooms IS 'Number of bathrooms (can be decimal like 2.5)';
COMMENT ON COLUMN pm_properties.square_feet IS 'Total square footage';
COMMENT ON COLUMN pm_properties.features IS 'Property features array (e.g., "Hardwood Floors", "Central AC", "Garage")';
