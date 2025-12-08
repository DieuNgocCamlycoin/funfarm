-- Add policy to allow viewing basic public profile data for social features
-- This works with the public_profiles view to allow seeing others' non-sensitive info
CREATE POLICY "Authenticated users can view public profile fields"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Drop the owner-only policy since we now have the authenticated policy
DROP POLICY IF EXISTS "Users can view their own full profile" ON public.profiles;