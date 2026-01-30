-- Migration: Fix SECURITY DEFINER views and enable RLS on inbound_messages
--
-- This migration addresses Supabase security linter errors:
-- 1. Views with SECURITY DEFINER that should use SECURITY INVOKER
-- 2. Table inbound_messages missing RLS

-- ============================================================================
-- PART 1: Fix SECURITY DEFINER Views
-- ============================================================================
-- Views with SECURITY DEFINER bypass RLS policies of the querying user,
-- using the view creator's permissions instead. This is a security risk.
-- We recreate these views with SECURITY INVOKER (the default, safer option).

-- 1.1 Fix public_open_house_event view
-- This view joins open_house_events with agents for public/published events
DROP VIEW IF EXISTS public.public_open_house_event;
CREATE VIEW public.public_open_house_event
WITH (security_invoker = true)
AS
SELECT
    e.id,
    e.address,
    e.start_at,
    e.end_at,
    e.details_page_enabled,
    e.flyer_pdf_url,
    e.pdf_download_enabled,
    a.display_name,
    a.license_number,
    a.phone_e164,
    a.locations_served,
    a.photo_url
FROM public.open_house_events e
JOIN public.agents a ON e.agent_id = a.id
WHERE e.status = 'published';

-- Grant select on the view to anon and authenticated roles for public access
GRANT SELECT ON public.public_open_house_event TO anon;
GRANT SELECT ON public.public_open_house_event TO authenticated;

-- 1.2 Fix subscription_plan_limits view
-- Recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.subscription_plan_limits;
CREATE VIEW public.subscription_plan_limits
WITH (security_invoker = true)
AS
SELECT
    sp.id AS plan_id,
    sp.name AS plan_name,
    sp.max_open_houses,
    sp.max_leads_per_month,
    sp.features
FROM public.subscription_plans sp;

-- Grant appropriate access
GRANT SELECT ON public.subscription_plan_limits TO anon;
GRANT SELECT ON public.subscription_plan_limits TO authenticated;

-- 1.3 Fix account_usage_status view
-- This view shows usage metrics for the authenticated user's account
DROP VIEW IF EXISTS public.account_usage_status;
CREATE VIEW public.account_usage_status
WITH (security_invoker = true)
AS
SELECT
    a.id AS agent_id,
    a.subscription_plan_id,
    (SELECT COUNT(*) FROM public.open_house_events e WHERE e.agent_id = a.id) AS open_house_count,
    (SELECT COUNT(*) FROM public.lead_submissions l
     JOIN public.open_house_events e ON l.event_id = e.id
     WHERE e.agent_id = a.id
     AND l.created_at >= date_trunc('month', CURRENT_DATE)) AS leads_this_month
FROM public.agents a;

-- Only authenticated users should see their own usage
GRANT SELECT ON public.account_usage_status TO authenticated;

-- 1.4 Fix public_pm_showing view
-- PM (Property Manager) showing view for public access
DROP VIEW IF EXISTS public.public_pm_showing;
CREATE VIEW public.public_pm_showing
WITH (security_invoker = true)
AS
SELECT
    s.id,
    s.property_address,
    s.showing_date,
    s.showing_time,
    s.status,
    a.display_name AS agent_name,
    a.phone_e164 AS agent_phone
FROM public.pm_showings s
JOIN public.agents a ON s.agent_id = a.id
WHERE s.status = 'published';

-- Grant select for public access
GRANT SELECT ON public.public_pm_showing TO anon;
GRANT SELECT ON public.public_pm_showing TO authenticated;

-- ============================================================================
-- PART 2: Enable RLS on inbound_messages table
-- ============================================================================
-- Tables exposed to PostgREST must have RLS enabled to prevent unauthorized access

ALTER TABLE public.inbound_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inbound_messages
-- Policy: Users can only see messages related to their own events
CREATE POLICY "Users can view their own inbound messages"
ON public.inbound_messages
FOR SELECT
TO authenticated
USING (
    agent_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.open_house_events e
        WHERE e.id = inbound_messages.event_id
        AND e.agent_id = auth.uid()
    )
);

-- Policy: Service role can insert messages (for webhooks/integrations)
CREATE POLICY "Service role can insert messages"
ON public.inbound_messages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Users can update their own messages
CREATE POLICY "Users can update their own messages"
ON public.inbound_messages
FOR UPDATE
TO authenticated
USING (
    agent_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.open_house_events e
        WHERE e.id = inbound_messages.event_id
        AND e.agent_id = auth.uid()
    )
);
