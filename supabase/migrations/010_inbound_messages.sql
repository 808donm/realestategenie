-- Create table for storing inbound messages from GHL
CREATE TABLE IF NOT EXISTS inbound_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  message_type TEXT, -- SMS, Email, etc.
  message_body TEXT,
  conversation_id TEXT,
  ghl_message_id TEXT,
  location_id TEXT,
  raw_payload JSONB,
  received_at TIMESTAMPTZ NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_inbound_messages_contact_id ON inbound_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_inbound_messages_received_at ON inbound_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_messages_read ON inbound_messages(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_inbound_messages_location ON inbound_messages(location_id);

-- Add comment
COMMENT ON TABLE inbound_messages IS 'Stores inbound messages from GHL contacts for monitoring and follow-up';
