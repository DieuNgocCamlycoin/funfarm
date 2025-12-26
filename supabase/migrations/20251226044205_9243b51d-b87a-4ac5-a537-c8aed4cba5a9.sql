-- Cập nhật function thưởng kết bạn: CẢ 2 NGƯỜI ĐỀU ĐƯỢC 50,000 CLC
CREATE OR REPLACE FUNCTION public.reward_friendship_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  already_rewarded_requester BOOLEAN;
  already_rewarded_accepter BOOLEAN;
  friendship_key TEXT;
BEGIN
  -- Chỉ thưởng khi status chuyển từ pending → accepted
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    
    -- Tạo key duy nhất cho cặp bạn bè (sắp xếp theo thứ tự để tránh duplicate)
    IF NEW.follower_id < NEW.following_id THEN
      friendship_key := NEW.follower_id::text || '_' || NEW.following_id::text;
    ELSE
      friendship_key := NEW.following_id::text || '_' || NEW.follower_id::text;
    END IF;
    
    -- ========== THƯỞNG CHO NGƯỜI MỜI KẾT BẠN (follower) ==========
    SELECT EXISTS (
      SELECT 1 FROM public.user_reward_tracking 
      WHERE user_id = NEW.follower_id 
      AND action_type = 'friendship_accepted'
      AND post_id = NEW.following_id
    ) INTO already_rewarded_requester;
    
    IF NOT already_rewarded_requester THEN
      -- Ghi nhận đã thưởng
      INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
      VALUES (NEW.follower_id, NEW.following_id, 'friendship_accepted')
      ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
      
      -- Thưởng 50.000 CLC cho người mời
      IF NOT public.is_reward_banned(NEW.follower_id) THEN
        UPDATE public.profiles 
        SET pending_reward = pending_reward + 50000 
        WHERE id = NEW.follower_id;
      END IF;
    END IF;
    
    -- ========== THƯỞNG CHO NGƯỜI CHẤP NHẬN (following) ==========
    SELECT EXISTS (
      SELECT 1 FROM public.user_reward_tracking 
      WHERE user_id = NEW.following_id 
      AND action_type = 'friendship_accepted'
      AND post_id = NEW.follower_id
    ) INTO already_rewarded_accepter;
    
    IF NOT already_rewarded_accepter THEN
      -- Ghi nhận đã thưởng
      INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
      VALUES (NEW.following_id, NEW.follower_id, 'friendship_accepted')
      ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
      
      -- Thưởng 50.000 CLC cho người chấp nhận
      IF NOT public.is_reward_banned(NEW.following_id) THEN
        UPDATE public.profiles 
        SET pending_reward = pending_reward + 50000 
        WHERE id = NEW.following_id;
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$function$;