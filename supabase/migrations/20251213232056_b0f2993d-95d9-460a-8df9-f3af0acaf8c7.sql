-- Create reward_bans table to track temporarily banned users
CREATE TABLE public.reward_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reward_bans ENABLE ROW LEVEL SECURITY;

-- Only admins can manage bans, users can view their own
CREATE POLICY "Users can view their own bans"
ON public.reward_bans
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage bans"
ON public.reward_bans
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to check if user is banned from rewards
CREATE OR REPLACE FUNCTION public.is_reward_banned(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.reward_bans
    WHERE user_id = p_user_id
    AND expires_at > now()
  );
END;
$$;

-- Update reward_post_share to check for bans
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
  -- Check if user is banned from rewards
  IF public.is_reward_banned(NEW.user_id) THEN
    -- Still update share count but no reward
    SELECT COUNT(*) INTO share_count FROM public.post_shares WHERE post_id = NEW.post_id;
    UPDATE public.posts SET shares_count = share_count WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;

  -- Check if user has already shared this post before
  SELECT COUNT(*) INTO previous_shares 
  FROM public.post_shares 
  WHERE post_id = NEW.post_id AND user_id = NEW.user_id AND id != NEW.id;
  
  -- Only reward if this is the first share by this user on this post
  IF previous_shares = 0 THEN
    PERFORM public.add_camly_reward(NEW.user_id, 20000);
  END IF;
  
  -- Always update shares_count on the post
  SELECT COUNT(*) INTO share_count FROM public.post_shares WHERE post_id = NEW.post_id;
  UPDATE public.posts SET shares_count = share_count WHERE id = NEW.post_id;
  
  RETURN NEW;
END;
$$;

-- Update reward_comment_creation to check for bans
CREATE OR REPLACE FUNCTION public.reward_comment_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_comments INTEGER;
BEGIN
  -- Check if user is banned from rewards
  IF public.is_reward_banned(NEW.author_id) THEN
    RETURN NEW;
  END IF;

  -- Check if user has already commented on this post before
  SELECT COUNT(*) INTO previous_comments 
  FROM public.comments 
  WHERE post_id = NEW.post_id AND author_id = NEW.author_id AND id != NEW.id;
  
  -- Only reward if this is the first comment
  IF previous_comments = 0 THEN
    PERFORM public.add_camly_reward(NEW.author_id, 5000);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update reward_post_like to check for bans
CREATE OR REPLACE FUNCTION public.reward_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  like_count INTEGER;
  post_author UUID;
BEGIN
  -- Check if post author is banned from rewards
  SELECT author_id INTO post_author FROM public.posts WHERE id = NEW.post_id;
  
  IF public.is_reward_banned(post_author) THEN
    -- Still update like count but no reward
    SELECT COUNT(*) INTO like_count FROM public.post_likes WHERE post_id = NEW.post_id;
    UPDATE public.posts SET likes_count = like_count WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;
  
  -- Get current like count for this post
  SELECT COUNT(*) INTO like_count FROM public.post_likes WHERE post_id = NEW.post_id;
  
  -- Reward the post author based on like count
  IF like_count <= 3 THEN
    PERFORM public.add_camly_reward(post_author, 10000);
  ELSE
    PERFORM public.add_camly_reward(post_author, 1000);
  END IF;
  
  -- Update likes_count on the post
  UPDATE public.posts SET likes_count = like_count WHERE id = NEW.post_id;
  
  RETURN NEW;
END;
$$;