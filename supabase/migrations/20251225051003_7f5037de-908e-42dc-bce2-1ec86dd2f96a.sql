-- =============================================
-- CAMLY REWARD SYSTEM v2.0 - LUẬT ÁNH SÁNG
-- Công thức mới: minh bạch, chống lạm dụng
-- =============================================

-- 1. CẬP NHẬT THƯỞNG ĐĂNG BÀI (20.000 CLC)
-- Điều kiện: >100 ký tự + có ảnh/video
CREATE OR REPLACE FUNCTION public.reward_post_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  content_length INTEGER;
  has_media BOOLEAN;
BEGIN
  -- Kiểm tra user bị ban
  IF public.is_reward_banned(NEW.author_id) THEN
    RETURN NEW;
  END IF;
  
  -- Kiểm tra giới hạn ngày (10 bài/ngày)
  IF NOT public.check_daily_limit(NEW.author_id, 'post') THEN
    PERFORM public.send_daily_limit_notification(NEW.author_id, 'post');
    RETURN NEW;
  END IF;
  
  -- Kiểm tra chất lượng bài viết theo Luật Ánh Sáng
  content_length := COALESCE(LENGTH(NEW.content), 0);
  has_media := (NEW.images IS NOT NULL AND array_length(NEW.images, 1) > 0) OR NEW.video_url IS NOT NULL;
  
  -- CHỈ THƯỞNG NẾU: >100 ký tự VÀ có ảnh/video
  IF content_length > 100 AND has_media THEN
    PERFORM public.add_camly_reward(NEW.author_id, 20000);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. CẬP NHẬT THƯỞNG LIKE (Người đăng bài nhận)
-- 3 like đầu = 10.000/like, từ like 4 = 1.000/like
-- Người like KHÔNG được thưởng (chống cày)
CREATE OR REPLACE FUNCTION public.reward_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  like_count INTEGER;
  post_author UUID;
  already_rewarded_author BOOLEAN;
  author_reward BIGINT;
BEGIN
  -- Get post author
  SELECT author_id INTO post_author FROM public.posts WHERE id = NEW.post_id;
  
  -- Update likes_count on the post first
  SELECT COUNT(*) INTO like_count FROM public.post_likes WHERE post_id = NEW.post_id;
  UPDATE public.posts SET likes_count = like_count WHERE id = NEW.post_id;
  
  -- Không tự like bài của mình
  IF NEW.user_id = post_author THEN
    RETURN NEW;
  END IF;
  
  -- ========== CHỈ THƯỞNG CHO NGƯỜI ĐĂNG BÀI ==========
  IF NOT public.is_reward_banned(post_author) THEN
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
  END IF;
  
  -- NGƯỜI ĐI LIKE KHÔNG ĐƯỢC THƯỞNG (chống cày like)
  
  RETURN NEW;
END;
$function$;

-- 3. CẬP NHẬT THƯỞNG BÌNH LUẬN (5.000 CLC)
-- Chỉ 1 lần/user/bài, >20 ký tự
CREATE OR REPLACE FUNCTION public.reward_comment_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  already_rewarded BOOLEAN;
  comment_length INTEGER;
BEGIN
  -- Kiểm tra user bị ban
  IF public.is_reward_banned(NEW.author_id) THEN
    RETURN NEW;
  END IF;
  
  -- Kiểm tra giới hạn ngày (50 comment/ngày)
  IF NOT public.check_daily_limit(NEW.author_id, 'comment') THEN
    PERFORM public.send_daily_limit_notification(NEW.author_id, 'comment');
    RETURN NEW;
  END IF;
  
  -- LUẬT ÁNH SÁNG: >20 ký tự
  comment_length := COALESCE(LENGTH(NEW.content), 0);
  IF comment_length < 20 THEN
    RETURN NEW;
  END IF;
  
  -- Kiểm tra đã thưởng cho bài này chưa (CHỈ 1 LẦN/USER/BÀI)
  SELECT EXISTS (
    SELECT 1 FROM public.user_reward_tracking 
    WHERE user_id = NEW.author_id AND post_id = NEW.post_id AND action_type = 'comment'
  ) INTO already_rewarded;
  
  IF NOT already_rewarded THEN
    INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
    VALUES (NEW.author_id, NEW.post_id, 'comment')
    ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
    
    -- Thưởng 5.000 CLC
    PERFORM public.add_camly_reward(NEW.author_id, 5000);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4. CẬP NHẬT THƯỞNG CHIA SẺ (10.000 CLC)
-- Chỉ thưởng người share, 1 lần/user/bài
CREATE OR REPLACE FUNCTION public.reward_post_share()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  share_count INTEGER;
  post_author UUID;
  already_rewarded_sharer BOOLEAN;
BEGIN
  -- Get post author
  SELECT author_id INTO post_author FROM public.posts WHERE id = NEW.post_id;
  
  -- Update shares_count
  SELECT COUNT(*) INTO share_count FROM public.post_shares WHERE post_id = NEW.post_id;
  UPDATE public.posts SET shares_count = share_count WHERE id = NEW.post_id;
  
  -- Không tự share bài của mình
  IF NEW.user_id = post_author THEN
    RETURN NEW;
  END IF;
  
  -- Kiểm tra giới hạn ngày
  IF NOT public.check_daily_limit(NEW.user_id, 'share') THEN
    PERFORM public.send_daily_limit_notification(NEW.user_id, 'share');
    RETURN NEW;
  END IF;
  
  -- ========== CHỈ THƯỞNG CHO NGƯỜI ĐI SHARE (1 lần/user/bài) ==========
  IF NOT public.is_reward_banned(NEW.user_id) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_reward_tracking 
      WHERE user_id = NEW.user_id AND post_id = NEW.post_id AND action_type = 'share'
    ) INTO already_rewarded_sharer;
    
    IF NOT already_rewarded_sharer THEN
      INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
      VALUES (NEW.user_id, NEW.post_id, 'share')
      ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
      
      -- Thưởng 10.000 CLC
      PERFORM public.add_camly_reward(NEW.user_id, 10000);
    END IF;
  END IF;
  
  -- NGƯỜI ĐĂNG BÀI KHÔNG ĐƯỢC THƯỞNG KHI CÓ SHARE
  
  RETURN NEW;
END;
$function$;

-- 5. CẬP NHẬT THƯỞNG KẾT BẠN (50.000 CLC/người = 100.000/cặp)
CREATE OR REPLACE FUNCTION public.reward_friendship_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  already_rewarded_1 BOOLEAN;
  already_rewarded_2 BOOLEAN;
BEGIN
  -- Chỉ thưởng khi status chuyển sang 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    
    -- Kiểm tra user 1 (follower) đã được thưởng cho friendship này chưa
    SELECT EXISTS (
      SELECT 1 FROM public.user_reward_tracking 
      WHERE user_id = NEW.follower_id 
      AND action_type = 'friendship_bonus'
      AND post_id = NEW.following_id
    ) INTO already_rewarded_1;
    
    -- Kiểm tra user 2 (following) đã được thưởng cho friendship này chưa
    SELECT EXISTS (
      SELECT 1 FROM public.user_reward_tracking 
      WHERE user_id = NEW.following_id 
      AND action_type = 'friendship_bonus'
      AND post_id = NEW.follower_id
    ) INTO already_rewarded_2;
    
    -- LUẬT ÁNH SÁNG: Thưởng 50.000 CLC/người (tăng từ 10.000)
    IF NOT already_rewarded_1 THEN
      INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
      VALUES (NEW.follower_id, NEW.following_id, 'friendship_bonus')
      ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
      
      IF NOT public.is_reward_banned(NEW.follower_id) THEN
        PERFORM public.add_camly_reward(NEW.follower_id, 50000);
      END IF;
    END IF;
    
    IF NOT already_rewarded_2 THEN
      INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
      VALUES (NEW.following_id, NEW.follower_id, 'friendship_bonus')
      ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
      
      IF NOT public.is_reward_banned(NEW.following_id) THEN
        PERFORM public.add_camly_reward(NEW.following_id, 50000);
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 6. CẬP NHẬT HÀM TÍNH TOÁN REWARD (cho display)
CREATE OR REPLACE FUNCTION public.calculate_user_rewards(p_user_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_reward bigint := 0;
BEGIN
  -- Lấy pending_reward hiện tại từ profile
  SELECT COALESCE(pending_reward, 0) + COALESCE(approved_reward, 0)
  INTO total_reward
  FROM public.profiles
  WHERE id = p_user_id;
  
  RETURN COALESCE(total_reward, 0);
END;
$function$;