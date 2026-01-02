
-- Update reward_post_like: Không thưởng cho tương tác trên bài share
CREATE OR REPLACE FUNCTION public.reward_post_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  like_count INTEGER;
  post_author UUID;
  post_type_value TEXT;
  already_rewarded_author BOOLEAN;
  author_reward BIGINT;
BEGIN
  -- Get post info
  SELECT author_id, post_type INTO post_author, post_type_value 
  FROM public.posts WHERE id = NEW.post_id;
  
  -- Update likes_count on the post first
  SELECT COUNT(*) INTO like_count FROM public.post_likes WHERE post_id = NEW.post_id;
  UPDATE public.posts SET likes_count = like_count WHERE id = NEW.post_id;
  
  -- KHÔNG THƯỞNG nếu đây là bài share (chỉ thưởng cho bài gốc)
  IF post_type_value = 'share' THEN
    RETURN NEW;
  END IF;
  
  -- Không tự like bài của mình
  IF NEW.user_id = post_author THEN
    RETURN NEW;
  END IF;
  
  -- Kiểm tra author bị ban
  IF public.is_reward_banned(post_author) THEN
    RETURN NEW;
  END IF;
  
  -- Kiểm tra like từ user này đã được thưởng cho author chưa
  SELECT EXISTS (
    SELECT 1 FROM public.user_reward_tracking 
    WHERE user_id = post_author AND post_id = NEW.post_id AND action_type = 'like_received_' || NEW.user_id::text
  ) INTO already_rewarded_author;
  
  IF NOT already_rewarded_author THEN
    INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
    VALUES (post_author, NEW.post_id, 'like_received_' || NEW.user_id::text)
    ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
    
    -- Đếm số like đã nhận thưởng cho bài này
    SELECT COUNT(*) INTO like_count FROM public.user_reward_tracking 
    WHERE user_id = post_author AND post_id = NEW.post_id AND action_type LIKE 'like_received_%';
    
    -- LUẬT ÁNH SÁNG: 3 like đầu = 10.000, từ like 4 = 1.000
    IF like_count <= 3 THEN
      author_reward := 10000;
    ELSE
      author_reward := 1000;
    END IF;
    
    PERFORM public.add_camly_reward(post_author, author_reward);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update reward_comment_creation: Không thưởng cho comment trên bài share
CREATE OR REPLACE FUNCTION public.reward_comment_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  post_author UUID;
  post_type_value TEXT;
  already_rewarded BOOLEAN;
  comment_length INTEGER;
BEGIN
  -- Lấy author và type của bài viết
  SELECT author_id, post_type INTO post_author, post_type_value 
  FROM public.posts WHERE id = NEW.post_id;
  
  -- KHÔNG THƯỞNG nếu đây là bài share (chỉ thưởng cho bài gốc)
  IF post_type_value = 'share' THEN
    RETURN NEW;
  END IF;
  
  -- Không thưởng nếu tự comment bài của mình
  IF NEW.author_id = post_author THEN
    RETURN NEW;
  END IF;
  
  -- Kiểm tra author bài viết bị ban
  IF public.is_reward_banned(post_author) THEN
    RETURN NEW;
  END IF;
  
  -- LUẬT ÁNH SÁNG: Comment phải >20 ký tự
  comment_length := COALESCE(LENGTH(NEW.content), 0);
  IF comment_length < 20 THEN
    RETURN NEW;
  END IF;
  
  -- Kiểm tra đã thưởng cho author từ user này chưa (CHỈ 1 LẦN/USER COMMENT/BÀI)
  SELECT EXISTS (
    SELECT 1 FROM public.user_reward_tracking 
    WHERE user_id = post_author 
    AND post_id = NEW.post_id 
    AND action_type = 'comment_received_' || NEW.author_id::text
  ) INTO already_rewarded;
  
  IF NOT already_rewarded THEN
    INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
    VALUES (post_author, NEW.post_id, 'comment_received_' || NEW.author_id::text)
    ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
    
    -- Thưởng 5.000 CLC cho NGƯỜI ĐĂNG BÀI GỐC
    PERFORM public.add_camly_reward(post_author, 5000);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update reward_post_share: Không thưởng khi share bài share (chỉ share bài gốc mới được thưởng)
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
  already_rewarded_sharer BOOLEAN;
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
  
  -- ========== THƯỞNG CHO NGƯỜI ĐĂNG BÀI GỐC ==========
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
      
      -- Thưởng 10.000 CLC cho NGƯỜI ĐĂNG BÀI GỐC
      PERFORM public.add_camly_reward(post_author, 10000);
    END IF;
  END IF;
  
  -- ========== THƯỞNG CHO NGƯỜI ĐI SHARE ==========
  IF NOT public.is_reward_banned(NEW.user_id) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_reward_tracking 
      WHERE user_id = NEW.user_id 
      AND post_id = NEW.post_id 
      AND action_type = 'share_done'
    ) INTO already_rewarded_sharer;
    
    IF NOT already_rewarded_sharer THEN
      INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
      VALUES (NEW.user_id, NEW.post_id, 'share_done')
      ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
      
      -- Thưởng 10.000 CLC cho NGƯỜI ĐI SHARE (theo Luật Ánh Sáng v2.1)
      PERFORM public.add_camly_reward(NEW.user_id, 10000);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
