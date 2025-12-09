-- Recreate public_profiles view WITHOUT the phone field to prevent PII exposure
DROP VIEW IF EXISTS public_profiles;

CREATE VIEW public_profiles WITH (security_invoker = true) AS
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
  -- phone field intentionally excluded for privacy
FROM profiles;

-- Grant access to the view
GRANT SELECT ON public_profiles TO anon, authenticated;