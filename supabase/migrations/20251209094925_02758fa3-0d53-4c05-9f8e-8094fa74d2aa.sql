-- Recalculate pending_reward for all users based on their activity
-- Create a function to calculate total rewards for a user
CREATE OR REPLACE FUNCTION public.calculate_user_rewards(p_user_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_reward bigint := 0;
  like_reward bigint := 0;
  comment_reward bigint := 0;
  share_reward bigint := 0;
  total_reward bigint := 0;
  post_record RECORD;
  like_count integer;
BEGIN
  -- Calculate post creation rewards (10,000 per post)
  SELECT COALESCE(COUNT(*) * 10000, 0) INTO post_reward
  FROM public.posts
  WHERE author_id = p_user_id;

  -- Calculate like rewards for posts authored by this user
  FOR post_record IN 
    SELECT id FROM public.posts WHERE author_id = p_user_id
  LOOP
    SELECT COUNT(*) INTO like_count FROM public.post_likes WHERE post_id = post_record.id;
    
    IF like_count >= 3 THEN
      like_reward := like_reward + 30000;
      like_reward := like_reward + ((like_count - 3) * 1000);
    ELSE
      like_reward := like_reward + (like_count * 10000);
    END IF;
  END LOOP;

  -- Calculate comment rewards (5,000 per comment written)
  SELECT COALESCE(COUNT(*) * 5000, 0) INTO comment_reward
  FROM public.comments
  WHERE author_id = p_user_id;

  -- Calculate share rewards (20,000 per share)
  SELECT COALESCE(COUNT(*) * 20000, 0) INTO share_reward
  FROM public.post_shares ps
  WHERE ps.user_id = p_user_id;

  -- Total = base signup bonus (50,000) + activity rewards
  total_reward := 50000 + post_reward + like_reward + comment_reward + share_reward;

  RETURN total_reward;
END;
$$;

-- Update all users' pending_reward based on their activity
UPDATE public.profiles
SET pending_reward = public.calculate_user_rewards(id);