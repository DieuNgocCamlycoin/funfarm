-- Add a policy to allow reading public profile fields for everyone
-- This enables the public_profiles view to work with SECURITY INVOKER
CREATE POLICY "Public profile fields are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);