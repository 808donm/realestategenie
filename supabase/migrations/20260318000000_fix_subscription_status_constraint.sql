-- Fix agent_subscriptions_status_check constraint
-- The existing constraint only allows: 'active', 'cancelled', 'past_due', 'suspended'
-- But the application code uses additional statuses: 'canceled' (American spelling),
-- 'trial', 'pending', 'paused'
--
-- This migration:
-- 1. Normalizes 'cancelled' (British) to 'canceled' (American, matching Stripe)
-- 2. Expands the constraint to include all statuses used by the application

-- First, normalize any existing 'cancelled' rows to 'canceled'
UPDATE agent_subscriptions SET status = 'canceled' WHERE status = 'cancelled';

-- Drop the old constraint
ALTER TABLE agent_subscriptions DROP CONSTRAINT IF EXISTS agent_subscriptions_status_check;

-- Add the updated constraint with all valid statuses
ALTER TABLE agent_subscriptions ADD CONSTRAINT agent_subscriptions_status_check
  CHECK (status IN ('active', 'canceled', 'past_due', 'suspended', 'trial', 'pending', 'paused'));
