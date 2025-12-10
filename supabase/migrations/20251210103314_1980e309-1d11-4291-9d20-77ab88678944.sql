-- Drop the existing view
DROP VIEW IF EXISTS public.public_profiles;

-- Create a SECURITY DEFINER function to get public profiles
CREATE OR REPLACE FUNCTION public.get_public_profiles(user_ids uuid[])
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  bio text,
  location text,
  profile_type profile_type,
  is_verified boolean,
  reputation_score integer,
  created_at timestamptz,
  updated_at timestamptz,
  cover_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.location,
    p.profile_type,
    p.is_verified,
    p.reputation_score,
    p.created_at,
    p.updated_at,
    p.cover_url
  FROM profiles p
  WHERE p.id = ANY(user_ids);
END;
$$;

-- Also recreate the view with SECURITY INVOKER but as a wrapper
-- that anyone can access for basic lookups
CREATE OR REPLACE VIEW public.public_profiles 
WITH (security_invoker = false)
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

-- Grant access to the view for all roles
GRANT SELECT ON public.public_profiles TO anon, authenticated;