-- Drop the existing SECURITY DEFINER view and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = on) AS
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
FROM public.profiles;