
-- Update reward_post_share: Chỉ thưởng cho tác giả bài gốc, không thưởng cho người share
CREATE OR REPLACE FUNCTION public.reward_post_share()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  share_count INTEGER;
  post_author UUID;
  post_type_value TEXT;
  already_rewarded_author BOOLEAN;
BEGIN
  -- Get post info
  SELECT author_id, post_type INTO post_author, post_type_value 
  FROM public.posts WHERE id = NEW.post_id;
  
  -- Update shares_count
  SELECT COUNT(*) INTO share_count FROM public.post_shares WHERE post_id = NEW.post_id;
  UPDATE public.posts SET shares_count = share_count WHERE id = NEW.post_id;
  
  -- KHÔNG THƯỞNG nếu share bài share (chỉ share bài gốc mới được thưởng)
  IF post_type_value = 'share' THEN
    RETURN NEW;
  END IF;
  
  -- Không tự share bài của mình
  IF NEW.user_id = post_author THEN
    RETURN NEW;
  END IF;
  
  -- ========== CHỈ THƯỞNG CHO NGƯỜI ĐĂNG BÀI GỐC ==========
  -- Người share KHÔNG được thưởng để tránh lạm dụng
  IF NOT public.is_reward_banned(post_author) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_reward_tracking 
      WHERE user_id = post_author 
      AND post_id = NEW.post_id 
      AND action_type = 'share_received_' || NEW.user_id::text
    ) INTO already_rewarded_author;
    
    IF NOT already_rewarded_author THEN
      INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
      VALUES (post_author, NEW.post_id, 'share_received_' || NEW.user_id::text)
      ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
      
      -- Thưởng 10.000 CLC CHỈ cho NGƯỜI ĐĂNG BÀI GỐC
      PERFORM public.add_camly_reward(post_author, 10000);
    END IF;
  END IF;
  
  -- KHÔNG thưởng cho người share để tránh lạm dụng
  
  RETURN NEW;
END;
$function$;
