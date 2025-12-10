-- Remove the overly permissive policy that exposes all profile data
DROP POLICY IF EXISTS "Service role can view all profiles" ON public.profiles;

-- The existing "Users can view their own full profile" policy remains
-- which correctly restricts access to auth.uid() = id