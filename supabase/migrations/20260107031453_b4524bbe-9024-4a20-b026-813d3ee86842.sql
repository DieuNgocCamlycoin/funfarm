-- Add SSO-related columns to profiles table for "Vạn Vật Quy Nhất" integration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS fun_id uuid UNIQUE,
ADD COLUMN IF NOT EXISTS synced_from_profile boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Create index for faster fun_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_fun_id ON public.profiles(fun_id) WHERE fun_id IS NOT NULL;

-- Create view for exporting user stats to Master Supabase
CREATE OR REPLACE VIEW public.exportable_user_stats AS
SELECT 
  p.fun_id,
  p.id as local_id,
  p.display_name,
  p.avatar_url,
  p.wallet_address,
  p.camly_balance,
  p.reputation_score,
  p.is_verified,
  p.profile_type,
  p.created_at,
  p.last_synced_at,
  (SELECT COUNT(*) FROM posts WHERE author_id = p.id) as total_posts,
  (SELECT COUNT(*) FROM comments WHERE author_id = p.id) as total_comments,
  (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions WHERE sender_id = p.id) as total_gifted,
  (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions WHERE receiver_id = p.id) as total_received
FROM profiles p
WHERE p.fun_id IS NOT NULL;

-- Grant select on the view
GRANT SELECT ON public.exportable_user_stats TO authenticated;