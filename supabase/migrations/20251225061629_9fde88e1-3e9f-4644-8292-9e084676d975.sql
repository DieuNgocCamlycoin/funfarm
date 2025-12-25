-- =============================================
-- CẬP NHẬT CÔNG THỨC THƯỞNG LUẬT ÁNH SÁNG v2.1
-- Bình luận & Chia sẻ: CHỈ NGƯỜI ĐĂNG BÀI nhận thưởng
-- =============================================

-- 1. Cập nhật reward_comment_creation: Thưởng cho NGƯỜI ĐĂNG BÀI khi có comment chất lượng
CREATE OR REPLACE FUNCTION public.reward_comment_creation()
RETURNS TRIGGER AS $$
DECLARE
  post_author UUID;
  already_rewarded BOOLEAN;
  comment_length INTEGER;
BEGIN
  -- Lấy author của bài viết
  SELECT author_id INTO post_author FROM public.posts WHERE id = NEW.post_id;
  
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
    
    -- Thưởng 5.000 CLC cho NGƯỜI ĐĂNG BÀI
    PERFORM public.add_camly_reward(post_author, 5000);
  END IF;
  
  -- NGƯỜI ĐI COMMENT KHÔNG ĐƯỢC THƯỞNG
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Cập nhật reward_post_share: Thưởng cho NGƯỜI ĐĂNG BÀI khi có share
CREATE OR REPLACE FUNCTION public.reward_post_share()
RETURNS TRIGGER AS $$
DECLARE
  share_count INTEGER;
  post_author UUID;
  already_rewarded_author BOOLEAN;
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
  
  -- Kiểm tra author bị ban
  IF public.is_reward_banned(post_author) THEN
    RETURN NEW;
  END IF;
  
  -- Kiểm tra đã thưởng cho author từ user này chưa (CHỈ 1 LẦN/USER SHARE/BÀI)
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
    
    -- Thưởng 10.000 CLC cho NGƯỜI ĐĂNG BÀI
    PERFORM public.add_camly_reward(post_author, 10000);
  END IF;
  
  -- NGƯỜI ĐI SHARE KHÔNG ĐƯỢC THƯỞNG
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;