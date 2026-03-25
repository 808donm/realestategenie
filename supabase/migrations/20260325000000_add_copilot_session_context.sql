-- Add last_action_context column to genie_copilot_sessions
-- This persists the Quick Action context across conversation turns
-- so Hoku stays focused on the task throughout the session

ALTER TABLE genie_copilot_sessions
  ADD COLUMN IF NOT EXISTS last_action_context text;
