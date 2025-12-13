-- Update reward_post_share trigger to only reward first share per user per post
CREATE OR REPLACE FUNCTION public.reward_post_share()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  share_count INTEGER;
  previous_shares INTEGER;
BEGIN
  -- Check if user has already shared this post before (excluding current insert)
  SELECT COUNT(*) INTO previous_shares 
  FROM public.post_shares 
  WHERE post_id = NEW.post_id AND user_id = NEW.user_id AND id != NEW.id;
  
  -- Only reward if this is the first share by this user on this post
  IF previous_shares = 0 THEN
    PERFORM public.add_camly_reward(NEW.user_id, 20000);
  END IF;
  
  -- Always update shares_count on the post (for display)
  SELECT COUNT(*) INTO share_count FROM public.post_shares WHERE post_id = NEW.post_id;
  UPDATE public.posts SET shares_count = share_count WHERE id = NEW.post_id;
  
  RETURN NEW;
END;
$$;

-- Update reward_comment_creation trigger to only reward first comment per user per post
CREATE OR REPLACE FUNCTION public.reward_comment_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_comments INTEGER;
BEGIN
  -- Check if user has already commented on this post before (excluding current insert)
  SELECT COUNT(*) INTO previous_comments 
  FROM public.comments 
  WHERE post_id = NEW.post_id AND author_id = NEW.author_id AND id != NEW.id;
  
  -- Only reward if this is the first comment by this user on this post
  IF previous_comments = 0 THEN
    PERFORM public.add_camly_reward(NEW.author_id, 5000);
  END IF;
  
  RETURN NEW;
END;
$$;