-- Tasks / To-Do System
-- Tasks linked to leads, contacts, transactions, and open houses

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES agents(id) ON DELETE SET NULL,

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'snoozed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),

  -- Dates
  due_date DATE,
  due_time TIME,
  completed_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,

  -- Linked entities (polymorphic references)
  linked_lead_id UUID,
  linked_contact_id TEXT,          -- GHL contact IDs are strings
  linked_open_house_id UUID,
  linked_transaction_id UUID,

  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,            -- RRULE string (e.g., FREQ=WEEKLY;BYDAY=MO)
  recurrence_parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  next_recurrence_date DATE,

  -- Metadata
  task_type TEXT DEFAULT 'general' CHECK (task_type IN ('general', 'follow_up', 'call', 'email', 'meeting', 'showing', 'document', 'closing')),
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_agent ON tasks(agent_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(agent_id, status);
CREATE INDEX idx_tasks_due ON tasks(agent_id, due_date) WHERE status IN ('pending', 'in_progress');
CREATE INDEX idx_tasks_lead ON tasks(linked_lead_id) WHERE linked_lead_id IS NOT NULL;
CREATE INDEX idx_tasks_contact ON tasks(linked_contact_id) WHERE linked_contact_id IS NOT NULL;
CREATE INDEX idx_tasks_open_house ON tasks(linked_open_house_id) WHERE linked_open_house_id IS NOT NULL;
CREATE INDEX idx_tasks_recurring ON tasks(agent_id, is_recurring) WHERE is_recurring = TRUE;
CREATE INDEX idx_tasks_snoozed ON tasks(agent_id, snoozed_until) WHERE status = 'snoozed';

-- RLS Policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = agent_id OR auth.uid() = assigned_to);

CREATE POLICY "Agents can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = agent_id OR auth.uid() = assigned_to);

CREATE POLICY "Agents can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = agent_id);

CREATE POLICY "Service role full access to tasks"
  ON tasks FOR ALL
  USING (current_setting('role') = 'service_role');

-- Notifications table for bell icon notification center
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error', 'lead', 'task', 'deal')),
  href TEXT,                       -- link to navigate to
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_agent ON notifications(agent_id);
CREATE INDEX idx_notifications_unread ON notifications(agent_id, is_read) WHERE is_read = FALSE;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "Agents can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = agent_id);

CREATE POLICY "Service role full access to notifications"
  ON notifications FOR ALL
  USING (current_setting('role') = 'service_role');

COMMENT ON TABLE tasks IS 'Task/to-do system linked to leads, contacts, transactions, and open houses';
COMMENT ON TABLE notifications IS 'In-app notification center for agents';
