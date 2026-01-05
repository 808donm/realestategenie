-- Add PandaDoc document tracking to pm_leases table

ALTER TABLE pm_leases
  ADD COLUMN IF NOT EXISTS esignature_provider TEXT CHECK (esignature_provider IN ('ghl', 'pandadoc', 'docusign', 'custom') OR esignature_provider IS NULL),
  ADD COLUMN IF NOT EXISTS pandadoc_document_id TEXT,
  ADD COLUMN IF NOT EXISTS pandadoc_document_url TEXT;

COMMENT ON COLUMN pm_leases.esignature_provider IS 'E-signature provider used for this lease (ghl, pandadoc, docusign, or custom PDF)';
COMMENT ON COLUMN pm_leases.pandadoc_document_id IS 'PandaDoc document ID if using PandaDoc for e-signatures';
COMMENT ON COLUMN pm_leases.pandadoc_document_url IS 'Public URL to view/sign PandaDoc document';

-- Create index for document tracking
CREATE INDEX IF NOT EXISTS idx_pm_leases_pandadoc_document ON pm_leases(pandadoc_document_id) WHERE pandadoc_document_id IS NOT NULL;
