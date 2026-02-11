-- Migration: Fix SECURITY DEFINER views and enable RLS on inbound_messages
-- SAFE VERSION: Uses ALTER VIEW to change security property without recreating views
--
-- This migration addresses Supabase security linter errors:
-- 1. security_definer_view on public_open_house_event
-- 2. security_definer_view on subscription_plan_limits
-- 3. security_definer_view on account_usage_status
-- 4. security_definer_view on public_pm_showing
-- 5. rls_disabled_in_public on inbound_messages

-- ============================================================================
-- PART 1: Fix SECURITY DEFINER Views using ALTER VIEW
-- ============================================================================
-- PostgreSQL 15+ (which Supabase uses) supports changing security_invoker via ALTER VIEW
-- This preserves the existing view definition while fixing the security issue

ALTER VIEW public.public_open_house_event SET (security_invoker = true);
ALTER VIEW public.subscription_plan_limits SET (security_invoker = true);
ALTER VIEW public.account_usage_status SET (security_invoker = true);
ALTER VIEW public.public_pm_showing SET (security_invoker = true);

-- ============================================================================
-- PART 2: Enable RLS on inbound_messages table
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE public.inbound_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view their own inbound messages" ON public.inbound_messages;
DROP POLICY IF EXISTS "Service role can manage all messages" ON public.inbound_messages;
DROP POLICY IF EXISTS "Users can manage their own messages" ON public.inbound_messages;

-- Create RLS policies
-- Policy: Authenticated users can view messages related to their events
CREATE POLICY "Users can view their own inbound messages"
ON public.inbound_messages
FOR SELECT
TO authenticated
USING (
    -- Check if user owns the message directly (if agent_id column exists)
    (agent_id IS NOT NULL AND agent_id = auth.uid())
    OR
    -- Or check if user owns the related event
    EXISTS (
        SELECT 1 FROM public.open_house_events e
        WHERE e.id = inbound_messages.event_id
        AND e.agent_id = auth.uid()
    )
);

-- Policy: Authenticated users can insert/update/delete their own messages
CREATE POLICY "Users can manage their own messages"
ON public.inbound_messages
FOR ALL
TO authenticated
USING (
    (agent_id IS NOT NULL AND agent_id = auth.uid())
    OR
    EXISTS (
        SELECT 1 FROM public.open_house_events e
        WHERE e.id = inbound_messages.event_id
        AND e.agent_id = auth.uid()
    )
)
WITH CHECK (
    (agent_id IS NOT NULL AND agent_id = auth.uid())
    OR
    EXISTS (
        SELECT 1 FROM public.open_house_events e
        WHERE e.id = inbound_messages.event_id
        AND e.agent_id = auth.uid()
    )
);
