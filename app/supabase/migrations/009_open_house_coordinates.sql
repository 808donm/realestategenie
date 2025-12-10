-- Add latitude and longitude to open_house_events table
ALTER TABLE open_house_events
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Add index for location-based queries
CREATE INDEX idx_open_house_events_coordinates ON open_house_events(latitude, longitude);

-- Add comment explaining the fields
COMMENT ON COLUMN open_house_events.latitude IS 'Property latitude for map display (-90 to 90)';
COMMENT ON COLUMN open_house_events.longitude IS 'Property longitude for map display (-180 to 180)';
