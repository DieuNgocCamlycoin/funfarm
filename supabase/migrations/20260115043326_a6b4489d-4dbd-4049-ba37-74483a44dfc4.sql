-- Fix permissive RLS policies for reward_logs
-- These are system-managed tables, need service role to insert/update

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "System can insert reward logs" ON public.reward_logs;
DROP POLICY IF EXISTS "System can update reward logs" ON public.reward_logs;

-- Create proper policies - only allow through database triggers (which run as SECURITY DEFINER)
-- No direct INSERT/UPDATE from client allowed

-- Add admin ability to manage reward logs if needed
CREATE POLICY "Admins can insert reward logs"
ON public.reward_logs FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reward logs"
ON public.reward_logs FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));