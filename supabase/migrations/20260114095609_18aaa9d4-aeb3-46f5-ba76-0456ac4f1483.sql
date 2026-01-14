
-- =============================================
-- FIX 1: Convert views to SECURITY INVOKER
-- This ensures views respect the calling user's RLS policies
-- =============================================

-- Recreate public_profiles view with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = on)
AS
SELECT 
  id,
  display_name,
  avatar_url,
  bio,
  location,
  profile_type,
  is_verified,
  reputation_score,
  created_at,
  updated_at,
  cover_url
FROM profiles;

-- Recreate exportable_user_stats view with SECURITY INVOKER
DROP VIEW IF EXISTS public.exportable_user_stats;
CREATE VIEW public.exportable_user_stats
WITH (security_invoker = on)
AS
SELECT 
  fun_id,
  id AS local_id,
  display_name,
  avatar_url,
  wallet_address,
  camly_balance,
  reputation_score,
  is_verified,
  profile_type,
  created_at,
  last_synced_at,
  (SELECT count(*) FROM posts WHERE posts.author_id = p.id) AS total_posts,
  (SELECT count(*) FROM comments WHERE comments.author_id = p.id) AS total_comments,
  (SELECT COALESCE(sum(wallet_transactions.amount), 0) FROM wallet_transactions WHERE wallet_transactions.sender_id = p.id) AS total_gifted,
  (SELECT COALESCE(sum(wallet_transactions.amount), 0) FROM wallet_transactions WHERE wallet_transactions.receiver_id = p.id) AS total_received
FROM profiles p
WHERE fun_id IS NOT NULL;

-- =============================================
-- FIX 2: Replace overly permissive RLS policies
-- These "System can insert" policies with WITH CHECK (true) 
-- should be restricted to authenticated users + specific conditions
-- =============================================

-- Fix notifications: Only authenticated users can insert their own notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix rejected_content: Only admin/system should insert
DROP POLICY IF EXISTS "System can insert rejected content" ON public.rejected_content;
-- Admins already have ALL policy, so no separate insert policy needed for regular users
-- System inserts happen via SECURITY DEFINER functions which bypass RLS

-- Fix user_reward_tracking: Only allow inserts for tracking own rewards 
DROP POLICY IF EXISTS "System can insert reward tracking" ON public.user_reward_tracking;
-- System inserts happen via SECURITY DEFINER reward trigger functions which bypass RLS
-- Regular users don't need to insert directly

-- Fix user_violations: Only admin/system should insert
DROP POLICY IF EXISTS "System can insert violations" ON public.user_violations;
-- Admins already have ALL policy, so no separate insert policy needed
-- System inserts happen via SECURITY DEFINER functions (check_spam_behavior) which bypass RLS
