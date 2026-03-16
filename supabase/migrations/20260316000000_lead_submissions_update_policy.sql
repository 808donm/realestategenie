-- Add UPDATE policy so agents can update their own leads (e.g. drag-and-drop pipeline stage)
CREATE POLICY "Agents can update own leads"
  ON lead_submissions FOR UPDATE
  USING (agent_id = auth.uid());
