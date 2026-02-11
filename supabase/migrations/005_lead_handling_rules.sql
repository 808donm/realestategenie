-- Lead Handling Rules and Consent Configuration
-- Per-event rules for how to handle leads based on representation status

ALTER TABLE open_house_events
ADD COLUMN IF NOT EXISTS represented_send_info_only BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS unrepresented_ask_reach_out BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS unrepresented_notify_immediately BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS unrepresented_start_workflows BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS consent_sms_text TEXT,
ADD COLUMN IF NOT EXISTS consent_email_text TEXT,
ADD COLUMN IF NOT EXISTS consent_version INTEGER DEFAULT 1;

-- Set default consent text for existing events
UPDATE open_house_events
SET consent_sms_text = 'By checking this box, you agree to receive SMS messages from us about this property and related listings. Message and data rates may apply. Reply STOP to opt out.'
WHERE consent_sms_text IS NULL;

UPDATE open_house_events
SET consent_email_text = 'By checking this box, you agree to receive email communications from us about this property and related listings. You can unsubscribe at any time.'
WHERE consent_email_text IS NULL;

COMMENT ON COLUMN open_house_events.represented_send_info_only IS 'If visitor is represented, only send property info (no agent outreach)';
COMMENT ON COLUMN open_house_events.unrepresented_ask_reach_out IS 'Ask unrepresented visitors if they want agent to reach out';
COMMENT ON COLUMN open_house_events.unrepresented_notify_immediately IS 'Notify agent immediately when unrepresented visitor requests reach-out';
COMMENT ON COLUMN open_house_events.unrepresented_start_workflows IS 'Trigger automation workflows for unrepresented visitors';
COMMENT ON COLUMN open_house_events.consent_sms_text IS 'SMS consent disclaimer text (versioned)';
COMMENT ON COLUMN open_house_events.consent_email_text IS 'Email consent disclaimer text (versioned)';
COMMENT ON COLUMN open_house_events.consent_version IS 'Version number for tracking consent text changes';
