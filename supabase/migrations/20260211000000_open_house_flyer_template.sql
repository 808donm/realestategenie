-- Add flyer_template_id to open_house_events so each open house can have its own template
ALTER TABLE open_house_events
ADD COLUMN IF NOT EXISTS flyer_template_id TEXT DEFAULT 'modern';
