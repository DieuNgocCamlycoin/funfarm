-- =============================================
-- CHƯƠNG TRÌNH THƯỞNG MỚI FUN FARM
-- Chân thành từ tâm, chống lạm dụng tuyệt đối
-- =============================================

-- 1. Function kiểm tra giới hạn hàng ngày
CREATE OR REPLACE FUNCTION public.check_daily_limit(p_user_id uuid, p_action_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  action_count INTEGER;
  max_limit INTEGER;
BEGIN
  -- Xác định giới hạn theo loại hành động
  IF p_action_type = 'post' THEN
    max_limit := 10;
  ELSE
    max_limit := 50; -- like, comment, share
  END IF;
  
  -- Đếm số hành động trong ngày
  IF p_action_type = 'post' THEN
    SELECT COUNT(*) INTO action_count FROM posts 
    WHERE author_id = p_user_id AND created_at > now() - interval '24 hours';
  ELSIF p_action_type = 'like' THEN
    SELECT COUNT(*) INTO action_count FROM post_likes 
    WHERE user_id = p_user_id AND created_at > now() - interval '24 hours';
  ELSIF p_action_type = 'comment' THEN
    SELECT COUNT(*) INTO action_count FROM comments 
    WHERE author_id = p_user_id AND created_at > now() - interval '24 hours';
  ELSIF p_action_type = 'share' THEN
    SELECT COUNT(*) INTO action_count FROM post_shares 
    WHERE user_id = p_user_id AND created_at > now() - interval '24 hours';
  END IF;
  
  RETURN action_count < max_limit;
END;
$$;

-- 2. Function gửi thông báo giới hạn
CREATE OR REPLACE FUNCTION public.send_daily_limit_notification(p_user_id uuid, p_action_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, content)
  VALUES (
    p_user_id,
    'daily_limit',
    'Hôm nay bạn đã lan tỏa đủ tình yêu rồi, mai tiếp tục nhé ❤️'
  );
END;
$$;

-- 3. Cập nhật trigger thưởng đăng bài (20.000 CLC, kiểm tra chất lượng)
CREATE OR REPLACE FUNCTION public.reward_post_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  content_length INTEGER;
  has_media BOOLEAN;
  has_location BOOLEAN;
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
  
  -- Kiểm tra chất lượng bài viết
  content_length := COALESCE(LENGTH(NEW.content), 0);
  has_media := (NEW.images IS NOT NULL AND array_length(NEW.images, 1) > 0) OR NEW.video_url IS NOT NULL;
  has_location := NEW.location_address IS NOT NULL OR NEW.location IS NOT NULL;
  
  -- Chỉ thưởng nếu bài viết chất lượng (>50 ký tự HOẶC có media)
  IF content_length > 50 OR has_media THEN
    PERFORM public.add_camly_reward(NEW.author_id, 20000);
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Cập nhật trigger thưởng bình luận (5.000 CLC, >20 ký tự, 1 lần/bài)
CREATE OR REPLACE FUNCTION public.reward_comment_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  
  -- Kiểm tra độ dài bình luận (>20 ký tự)
  comment_length := COALESCE(LENGTH(NEW.content), 0);
  IF comment_length < 20 THEN
    RETURN NEW;
  END IF;
  
  -- Kiểm tra đã thưởng cho bài này chưa
  SELECT EXISTS (
    SELECT 1 FROM public.user_reward_tracking 
    WHERE user_id = NEW.author_id AND post_id = NEW.post_id AND action_type = 'comment'
  ) INTO already_rewarded;
  
  -- Chỉ thưởng 1 lần/bài
  IF NOT already_rewarded THEN
    INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
    VALUES (NEW.author_id, NEW.post_id, 'comment')
    ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
    
    PERFORM public.add_camly_reward(NEW.author_id, 5000);
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Cập nhật trigger thưởng like (thưởng cả người đăng và người like)
CREATE OR REPLACE FUNCTION public.reward_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  like_count INTEGER;
  post_author UUID;
  already_rewarded_author BOOLEAN;
  already_rewarded_liker BOOLEAN;
  author_reward BIGINT;
BEGIN
  -- Get post author
  SELECT author_id INTO post_author FROM public.posts WHERE id = NEW.post_id;
  
  -- Kiểm tra giới hạn ngày cho người like
  IF NOT public.check_daily_limit(NEW.user_id, 'like') THEN
    PERFORM public.send_daily_limit_notification(NEW.user_id, 'like');
    SELECT COUNT(*) INTO like_count FROM public.post_likes WHERE post_id = NEW.post_id;
    UPDATE public.posts SET likes_count = like_count WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;
  
  -- ========== THƯỞNG CHO NGƯỜI ĐĂNG BÀI ==========
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
      
      -- 3 like đầu: 10.000 CLC, từ like 4 trở đi: 1.000 CLC
      IF like_count <= 3 THEN
        author_reward := 10000;
      ELSE
        author_reward := 1000;
      END IF;
      
      PERFORM public.add_camly_reward(post_author, author_reward);
    END IF;
  END IF;
  
  -- ========== THƯỞNG CHO NGƯỜI ĐI LIKE ==========
  IF NEW.user_id != post_author AND NOT public.is_reward_banned(NEW.user_id) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_reward_tracking 
      WHERE user_id = NEW.user_id AND post_id = NEW.post_id AND action_type = 'like_given'
    ) INTO already_rewarded_liker;
    
    IF NOT already_rewarded_liker THEN
      INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
      VALUES (NEW.user_id, NEW.post_id, 'like_given')
      ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
      
      PERFORM public.add_camly_reward(NEW.user_id, 10000);
    END IF;
  END IF;
  
  -- Update likes_count on the post
  SELECT COUNT(*) INTO like_count FROM public.post_likes WHERE post_id = NEW.post_id;
  UPDATE public.posts SET likes_count = like_count WHERE id = NEW.post_id;
  
  RETURN NEW;
END;
$$;

-- 6. Cập nhật trigger thưởng share (thưởng cả người đăng và người share)
CREATE OR REPLACE FUNCTION public.reward_post_share()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  share_count INTEGER;
  post_author UUID;
  already_rewarded_author BOOLEAN;
  already_rewarded_sharer BOOLEAN;
BEGIN
  -- Get post author
  SELECT author_id INTO post_author FROM public.posts WHERE id = NEW.post_id;
  
  -- Kiểm tra giới hạn ngày cho người share
  IF NOT public.check_daily_limit(NEW.user_id, 'share') THEN
    PERFORM public.send_daily_limit_notification(NEW.user_id, 'share');
    SELECT COUNT(*) INTO share_count FROM public.post_shares WHERE post_id = NEW.post_id;
    UPDATE public.posts SET shares_count = share_count WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;
  
  -- ========== THƯỞNG CHO NGƯỜI ĐĂNG BÀI (1 lần duy nhất/bài) ==========
  IF NOT public.is_reward_banned(post_author) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_reward_tracking 
      WHERE user_id = post_author AND post_id = NEW.post_id AND action_type = 'share_received'
    ) INTO already_rewarded_author;
    
    IF NOT already_rewarded_author THEN
      INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
      VALUES (post_author, NEW.post_id, 'share_received')
      ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
      
      PERFORM public.add_camly_reward(post_author, 10000);
    END IF;
  END IF;
  
  -- ========== THƯỞNG CHO NGƯỜI ĐI SHARE ==========
  IF NEW.user_id != post_author AND NOT public.is_reward_banned(NEW.user_id) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_reward_tracking 
      WHERE user_id = NEW.user_id AND post_id = NEW.post_id AND action_type = 'share'
    ) INTO already_rewarded_sharer;
    
    IF NOT already_rewarded_sharer THEN
      INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
      VALUES (NEW.user_id, NEW.post_id, 'share')
      ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
      
      PERFORM public.add_camly_reward(NEW.user_id, 10000);
    END IF;
  END IF;
  
  -- Update shares_count
  SELECT COUNT(*) INTO share_count FROM public.post_shares WHERE post_id = NEW.post_id;
  UPDATE public.posts SET shares_count = share_count WHERE id = NEW.post_id;
  
  RETURN NEW;
END;
$$;

-- 7. Cập nhật trigger thưởng kết bạn (10.000 CLC cho cả 2 người, 1 lần/cặp)
CREATE OR REPLACE FUNCTION public.reward_friendship_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    
    -- Thưởng user 1 nếu chưa được thưởng
    IF NOT already_rewarded_1 THEN
      INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
      VALUES (NEW.follower_id, NEW.following_id, 'friendship_bonus')
      ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
      
      IF NOT public.is_reward_banned(NEW.follower_id) THEN
        PERFORM public.add_camly_reward(NEW.follower_id, 10000);
      END IF;
    END IF;
    
    -- Thưởng user 2 nếu chưa được thưởng
    IF NOT already_rewarded_2 THEN
      INSERT INTO public.user_reward_tracking (user_id, post_id, action_type)
      VALUES (NEW.following_id, NEW.follower_id, 'friendship_bonus')
      ON CONFLICT (user_id, post_id, action_type) DO NOTHING;
      
      IF NOT public.is_reward_banned(NEW.following_id) THEN
        PERFORM public.add_camly_reward(NEW.following_id, 10000);
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;