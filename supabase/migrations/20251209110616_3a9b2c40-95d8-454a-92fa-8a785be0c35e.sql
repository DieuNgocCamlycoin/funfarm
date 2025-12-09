-- Drop the existing view
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate the view with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE VIEW public.public_profiles 
WITH (security_invoker = false)
AS
SELECT 
  id,
  display_name,
  avatar_url,
  bio,
  location,
  phone,
  profile_type,
  is_verified,
  reputation_score,
  cover_url,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;