-- Create a secure view for public profile access that hides financial data
CREATE OR REPLACE VIEW public.public_profiles AS
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
  cover_url,
  phone
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create new policy: Users can only see their own full profile (including financial data)
CREATE POLICY "Users can view their own full profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Create policy for service role to access all profiles (for edge functions)
CREATE POLICY "Service role can view all profiles"
ON public.profiles
FOR SELECT
TO service_role
USING (true);