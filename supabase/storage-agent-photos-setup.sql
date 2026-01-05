-- Supabase Storage Setup for Agent Photos
-- Run this in the Supabase SQL Editor to create the agent-photos bucket

-- Create agent-photos bucket for headshots and company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-photos', 'agent-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own photos
-- Headshots in /headshots/ subfolder
-- Company logos in /logos/ subfolder
CREATE POLICY "Authenticated users can upload agent photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agent-photos' AND
  (STORAGE.foldername(name))[1] IN ('headshots', 'logos')
);

-- Allow authenticated users to update their own photos
CREATE POLICY "Authenticated users can update own agent photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'agent-photos');

-- Allow authenticated users to delete their own photos
CREATE POLICY "Authenticated users can delete own agent photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'agent-photos');

-- Allow public read access to all agent photos (for displaying on open house pages)
CREATE POLICY "Public read access for agent photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'agent-photos');
