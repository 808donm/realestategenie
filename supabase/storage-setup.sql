-- Storage Setup for Property Photos
-- Run this in your Supabase SQL Editor

-- 1. Apply the migration to add property_photo_url column
-- (This may already be applied if you ran migration 010_property_photo.sql)
ALTER TABLE open_house_events
ADD COLUMN IF NOT EXISTS property_photo_url TEXT;

COMMENT ON COLUMN open_house_events.property_photo_url IS 'URL to property photo in Supabase Storage';

-- 2. Create the storage bucket for property photos
-- Note: This must be run from the Supabase Dashboard > Storage section
-- OR you can create it manually through the UI:
--   1. Go to Storage in Supabase Dashboard
--   2. Click "New bucket"
--   3. Name: property-photos
--   4. Public bucket: Yes (checked)
--   5. Click "Create bucket"

-- If you want to create it via SQL (requires storage schema access):
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up storage policies for property-photos bucket
-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload property photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-photos');

-- Allow authenticated users to update their own photos
CREATE POLICY "Users can update their own property photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-photos');

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete their own property photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-photos');

-- Allow public read access to all property photos
CREATE POLICY "Public read access to property photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-photos');
