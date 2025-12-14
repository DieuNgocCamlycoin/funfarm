-- Function to reward friendship bonus (only once per user pair)
CREATE OR REPLACE FUNCTION public.reward_friendship_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  already_rewarded_1 BOOLEAN;
  already_rewarded_2 BOOLEAN;
BEGIN
  -- Only trigger when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    
    -- Check if user 1 (follower) was already rewarded for any friendship
    SELECT EXISTS (
      SELECT 1 FROM public.user_reward_tracking 
      WHERE user_id = NEW.follower_id 
      AND action_type LIKE 'friendship_bonus_%'
      AND post_id = NEW.following_id
    ) INTO already_rewarded_1;
    
    -- Check if user 2 (following) was already rewarded for any friendship  
    SELECT EXISTS (
      SELECT 1 FROM public.user_reward_tracking 
      WHERE user_id = NEW.following_id 
      AND action_type LIKE 'friendship_bonus_%'
      AND post_id = NEW.follower_id
    ) INTO already_rewarded_2;
    
    -- Reward user 1 if not already rewarded
    IF NOT already_rewarded_1 THEN
      INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
      VALUES (NEW.follower_id, NEW.following_id, 'friendship_bonus_' || NEW.following_id::text)
      ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
      
      IF NOT public.is_reward_banned(NEW.follower_id) THEN
        PERFORM public.add_camly_reward(NEW.follower_id, 10000);
      END IF;
    END IF;
    
    -- Reward user 2 if not already rewarded
    IF NOT already_rewarded_2 THEN
      INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
      VALUES (NEW.following_id, NEW.follower_id, 'friendship_bonus_' || NEW.follower_id::text)
      ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
      
      IF NOT public.is_reward_banned(NEW.following_id) THEN
        PERFORM public.add_camly_reward(NEW.following_id, 10000);
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for friendship bonus
DROP TRIGGER IF EXISTS on_friendship_accepted ON public.followers;
CREATE TRIGGER on_friendship_accepted
  AFTER UPDATE ON public.followers
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_friendship_bonus();

-- Enable realtime for followers table
ALTER TABLE public.followers REPLICA IDENTITY FULL;

-- Add followers to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'followers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.followers;
  END IF;
END $$;