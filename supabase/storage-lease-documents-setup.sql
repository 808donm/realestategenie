-- Create storage bucket for lease documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('lease-documents', 'lease-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lease documents
-- Allow authenticated users to upload their own lease documents
CREATE POLICY "Users can upload own lease documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lease-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own lease documents
CREATE POLICY "Users can read own lease documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lease-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own lease documents
CREATE POLICY "Users can delete own lease documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lease-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (needed for GHL to access signed URLs)
CREATE POLICY "Public can read lease documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lease-documents');
