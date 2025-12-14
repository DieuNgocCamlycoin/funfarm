
-- 1. Tạo bảng theo dõi reward để ngăn spam
CREATE TABLE IF NOT EXISTS public.user_reward_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'like', 'comment', 'share'
  rewarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id, action_type)
);

-- Enable RLS
ALTER TABLE public.user_reward_tracking ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own reward tracking"
  ON public.user_reward_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert reward tracking"
  ON public.user_reward_tracking FOR INSERT
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_user_reward_tracking_lookup 
  ON public.user_reward_tracking(user_id, post_id, action_type);

-- 2. Cập nhật function reward_post_share để chỉ thưởng 1 lần
CREATE OR REPLACE FUNCTION public.reward_post_share()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  share_count INTEGER;
  already_rewarded BOOLEAN;
BEGIN
  -- Check if user is banned from rewards
  IF public.is_reward_banned(NEW.user_id) THEN
    SELECT COUNT(*) INTO share_count FROM public.post_shares WHERE post_id = NEW.post_id;
    UPDATE public.posts SET shares_count = share_count WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;

  -- Check if already rewarded for this post share
  SELECT EXISTS (
    SELECT 1 FROM public.user_reward_tracking 
    WHERE user_id = NEW.user_id AND post_id = NEW.post_id AND action_type = 'share'
  ) INTO already_rewarded;
  
  -- Only reward if not already rewarded
  IF NOT already_rewarded THEN
    -- Record the reward
    INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
    VALUES (NEW.user_id, NEW.post_id, 'share')
    ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
    
    -- Give reward
    PERFORM public.add_camly_reward(NEW.user_id, 20000);
  END IF;
  
  -- Always update shares_count on the post
  SELECT COUNT(*) INTO share_count FROM public.post_shares WHERE post_id = NEW.post_id;
  UPDATE public.posts SET shares_count = share_count WHERE id = NEW.post_id;
  
  RETURN NEW;
END;
$$;

-- 3. Cập nhật function reward_post_like để chỉ thưởng 1 lần cho mỗi lượt like mới
CREATE OR REPLACE FUNCTION public.reward_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  like_count INTEGER;
  post_author UUID;
  already_rewarded BOOLEAN;
BEGIN
  -- Get post author
  SELECT author_id INTO post_author FROM public.posts WHERE id = NEW.post_id;
  
  -- Check if post author is banned from rewards
  IF public.is_reward_banned(post_author) THEN
    SELECT COUNT(*) INTO like_count FROM public.post_likes WHERE post_id = NEW.post_id;
    UPDATE public.posts SET likes_count = like_count WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;
  
  -- Check if this like action was already rewarded to post author
  SELECT EXISTS (
    SELECT 1 FROM public.user_reward_tracking 
    WHERE user_id = post_author AND post_id = NEW.post_id AND action_type = 'like_received_' || NEW.user_id::text
  ) INTO already_rewarded;
  
  IF NOT already_rewarded THEN
    -- Record the reward
    INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
    VALUES (post_author, NEW.post_id, 'like_received_' || NEW.user_id::text)
    ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
    
    -- Get current like count for this post
    SELECT COUNT(*) INTO like_count FROM public.post_likes WHERE post_id = NEW.post_id;
    
    -- Reward the post author based on like count
    IF like_count <= 3 THEN
      PERFORM public.add_camly_reward(post_author, 10000);
    ELSE
      PERFORM public.add_camly_reward(post_author, 1000);
    END IF;
  END IF;
  
  -- Update likes_count on the post
  SELECT COUNT(*) INTO like_count FROM public.post_likes WHERE post_id = NEW.post_id;
  UPDATE public.posts SET likes_count = like_count WHERE id = NEW.post_id;
  
  RETURN NEW;
END;
$$;

-- 4. Cập nhật function reward_comment_creation để chỉ thưởng 1 lần
CREATE OR REPLACE FUNCTION public.reward_comment_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  already_rewarded BOOLEAN;
BEGIN
  -- Check if user is banned from rewards
  IF public.is_reward_banned(NEW.author_id) THEN
    RETURN NEW;
  END IF;

  -- Check if already rewarded for commenting on this post
  SELECT EXISTS (
    SELECT 1 FROM public.user_reward_tracking 
    WHERE user_id = NEW.author_id AND post_id = NEW.post_id AND action_type = 'comment'
  ) INTO already_rewarded;
  
  -- Only reward if not already rewarded
  IF NOT already_rewarded THEN
    -- Record the reward
    INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
    VALUES (NEW.author_id, NEW.post_id, 'comment')
    ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
    
    -- Give reward
    PERFORM public.add_camly_reward(NEW.author_id, 5000);
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Reset pending_reward cho các tài khoản lạm dụng (giữ lại 50,000 bonus ban đầu)
UPDATE public.profiles 
SET pending_reward = 50000
WHERE id IN (
  'b7f37e33-a968-4dfc-99d4-c141996e1e71', -- chubehay (47.6M -> 50K)
  'e71e2765-e7df-4a4e-ad0a-cfd6e43eef26', -- casemiro (28.7M -> 50K)
  '12323972-68f5-42f0-a15c-655b17d46dae', -- ChiNghi Mãi Tuấn (1.2M -> 50K)
  'fed2fce1-138f-45db-9f86-3575b4bc910e', -- daso168loy (2.7M -> 50K)
  '1a50cb2b-6488-4293-b7cd-003de2bcfa91', -- shipper spam 248 shares
  '05657793-d3a8-4e0e-ae5f-6a10e3a760f3'  -- unknown 146 shares
);
