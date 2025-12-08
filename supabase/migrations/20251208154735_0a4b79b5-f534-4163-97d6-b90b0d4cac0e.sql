-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view public profile fields" ON public.profiles;

-- Create policy: Only the profile owner can see their full profile data (including financial fields)
CREATE POLICY "Users can view their own full profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- For viewing other users' profiles (social features), the app should query the public_profiles view instead
-- The public_profiles view only exposes non-sensitive fields