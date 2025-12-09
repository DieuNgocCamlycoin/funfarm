-- Create post_likes table to track individual likes
CREATE TABLE public.post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create post_shares table to track shares
CREATE TABLE public.post_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referrals table for invite system
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL UNIQUE,
  referral_code TEXT NOT NULL,
  bonus_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add referral_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Enable RLS
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- post_likes policies
CREATE POLICY "Anyone can view likes" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users can add likes" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their likes" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- post_shares policies
CREATE POLICY "Anyone can view shares" ON public.post_shares FOR SELECT USING (true);
CREATE POLICY "Users can add shares" ON public.post_shares FOR INSERT WITH CHECK (auth.uid() = user_id);

-- referrals policies
CREATE POLICY "Users can view their referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Users can create referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referred_id);

-- Function to add CAMLY reward
CREATE OR REPLACE FUNCTION public.add_camly_reward(user_id UUID, amount BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET pending_reward = pending_reward + amount
  WHERE id = user_id;
END;
$$;

-- Function to handle post creation reward (+10,000 CAMLY)
CREATE OR REPLACE FUNCTION public.reward_post_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.add_camly_reward(NEW.author_id, 10000);
  RETURN NEW;
END;
$$;

-- Function to handle like reward (first 3 = +30k total, after = +1k each)
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
  -- Get the post author
  SELECT author_id INTO post_author FROM public.posts WHERE id = NEW.post_id;
  
  -- Get current like count for this post
  SELECT COUNT(*) INTO like_count FROM public.post_likes WHERE post_id = NEW.post_id;
  
  -- Reward the post author based on like count
  IF like_count <= 3 THEN
    -- First 3 likes: +10,000 each (total 30,000 for first 3)
    PERFORM public.add_camly_reward(post_author, 10000);
  ELSE
    -- From 4th like onwards: +1,000 each
    PERFORM public.add_camly_reward(post_author, 1000);
  END IF;
  
  -- Update likes_count on the post
  UPDATE public.posts SET likes_count = like_count WHERE id = NEW.post_id;
  
  RETURN NEW;
END;
$$;

-- Function to handle comment reward (+5,000 CAMLY for commenter)
CREATE OR REPLACE FUNCTION public.reward_comment_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.add_camly_reward(NEW.author_id, 5000);
  RETURN NEW;
END;
$$;

-- Function to handle share reward (+20,000 CAMLY for sharer)
CREATE OR REPLACE FUNCTION public.reward_post_share()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  share_count INTEGER;
BEGIN
  PERFORM public.add_camly_reward(NEW.user_id, 20000);
  
  -- Update shares_count on the post
  SELECT COUNT(*) INTO share_count FROM public.post_shares WHERE post_id = NEW.post_id;
  UPDATE public.posts SET shares_count = share_count WHERE id = NEW.post_id;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_post_created
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_post_creation();

CREATE TRIGGER on_post_liked
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_post_like();

CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_comment_creation();

CREATE TRIGGER on_post_shared
  AFTER INSERT ON public.post_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_post_share();