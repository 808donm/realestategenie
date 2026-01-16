-- Create table to track access requests from potential users
CREATE TABLE access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status options: 'pending', 'approved', 'rejected', 'payment_sent', 'completed'

  -- Admin notes
  admin_notes TEXT,
  reviewed_by UUID REFERENCES agents(id),
  reviewed_at TIMESTAMPTZ,

  -- Payment tracking
  stripe_checkout_session_id TEXT,
  payment_link_sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Invitation tracking
  invitation_id UUID REFERENCES user_invitations(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one request per email at a time
  UNIQUE(email)
);

-- Create index for admin dashboard queries
CREATE INDEX idx_access_requests_status ON access_requests(status);
CREATE INDEX idx_access_requests_created_at ON access_requests(created_at DESC);
CREATE INDEX idx_access_requests_email ON access_requests(email);

-- Add RLS policies
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (admin endpoints use service role key)
-- No need for complex RLS policies since this table is accessed via admin client

-- Add trigger to update updated_at
CREATE TRIGGER update_access_requests_updated_at
  BEFORE UPDATE ON access_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
