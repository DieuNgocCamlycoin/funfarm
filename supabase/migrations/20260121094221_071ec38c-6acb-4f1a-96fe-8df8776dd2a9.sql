-- =====================================================
-- MIGRATION: Reward Functions V3.1
-- Cập nhật: Likes và Comments có limit RIÊNG BIỆT 50 mỗi loại
-- Đồng bộ với rewardCalculationService.ts (SSOT)
-- =====================================================

-- =====================================================
-- HELPER FUNCTION: Đếm LIKES trong ngày Vietnam (V3.1)
-- =====================================================
CREATE OR REPLACE FUNCTION public.count_likes_today_vn(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_today_vn DATE;
  v_count INTEGER;
BEGIN
  v_today_vn := public.to_vietnam_date(now()::text)::DATE;
  
  SELECT COUNT(*) INTO v_count
  FROM public.reward_logs
  WHERE user_id = p_user_id
    AND reward_type = 'like'
    AND public.to_vietnam_date(created_at::text)::DATE = v_today_vn
    AND status = 'active';
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- =====================================================
-- HELPER FUNCTION: Đếm COMMENTS trong ngày Vietnam (V3.1)
-- =====================================================
CREATE OR REPLACE FUNCTION public.count_comments_today_vn(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_today_vn DATE;
  v_count INTEGER;
BEGIN
  v_today_vn := public.to_vietnam_date(now()::text)::DATE;
  
  SELECT COUNT(*) INTO v_count
  FROM public.reward_logs
  WHERE user_id = p_user_id
    AND reward_type = 'comment'
    AND public.to_vietnam_date(created_at::text)::DATE = v_today_vn
    AND status = 'active';
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- =====================================================
-- TRIGGER FUNCTION: reward_post_like V3.1
-- Thay đổi: Dùng count_likes_today_vn (limit riêng 50)
-- =====================================================
CREATE OR REPLACE FUNCTION public.reward_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_author UUID;
  v_like_count INTEGER;
  v_max_likes INTEGER := 50;
  v_reward BIGINT := 1000;
  v_actual_reward BIGINT;
  v_already_rewarded BOOLEAN;
BEGIN
  -- Lấy author của bài viết
  SELECT author_id INTO v_post_author FROM public.posts WHERE id = NEW.post_id;
  
  -- Update likes_count
  UPDATE public.posts 
  SET likes_count = (SELECT COUNT(*) FROM public.post_likes WHERE post_id = NEW.post_id)
  WHERE id = NEW.post_id;
  
  -- Không tự like bài của mình
  IF NEW.user_id = v_post_author THEN RETURN NEW; END IF;
  
  -- Kiểm tra author bị ban reward
  IF public.is_reward_banned(v_post_author) THEN RETURN NEW; END IF;
  
  -- V3.1: Chỉ thưởng nếu bài viết là quality post
  IF NOT public.is_quality_post(NEW.post_id) THEN RETURN NEW; END IF;
  
  -- V3.1: Kiểm tra LIKE limit RIÊNG = 50/ngày Vietnam
  v_like_count := public.count_likes_today_vn(v_post_author);
  IF v_like_count >= v_max_likes THEN RETURN NEW; END IF;
  
  -- Kiểm tra đã thưởng cho like này chưa
  SELECT EXISTS (
    SELECT 1 FROM public.reward_logs 
    WHERE user_id = v_post_author 
      AND reference_id = NEW.post_id 
      AND reference_user_id = NEW.user_id
      AND reward_type = 'like'
      AND status = 'active'
  ) INTO v_already_rewarded;
  
  IF NOT v_already_rewarded THEN
    -- Áp dụng daily cap
    v_actual_reward := public.check_daily_reward_cap(v_post_author, v_reward);
    
    IF v_actual_reward > 0 THEN
      -- Ghi log reward
      INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id, reference_user_id)
      VALUES (v_post_author, 'like', v_actual_reward, NEW.post_id, NEW.user_id);
      
      -- Cập nhật pending_reward
      UPDATE public.profiles
      SET pending_reward = pending_reward + v_actual_reward
      WHERE id = v_post_author;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGER FUNCTION: reward_comment_creation V3.1
-- Thay đổi: Dùng count_comments_today_vn (limit riêng 50)
-- =====================================================
CREATE OR REPLACE FUNCTION public.reward_comment_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_author UUID;
  v_comment_count INTEGER;
  v_max_comments INTEGER := 50;
  v_reward BIGINT := 2000;
  v_actual_reward BIGINT;
  v_comment_length INTEGER;
  v_already_rewarded BOOLEAN;
BEGIN
  -- Lấy author của bài viết
  SELECT author_id INTO v_post_author FROM public.posts WHERE id = NEW.post_id;
  
  -- Update comments_count
  UPDATE public.posts 
  SET comments_count = (SELECT COUNT(*) FROM public.comments WHERE post_id = NEW.post_id)
  WHERE id = NEW.post_id;
  
  -- Không tự comment bài của mình
  IF NEW.author_id = v_post_author THEN RETURN NEW; END IF;
  
  -- Kiểm tra author bị ban reward
  IF public.is_reward_banned(v_post_author) THEN RETURN NEW; END IF;
  
  -- V3.1: Chỉ thưởng nếu bài viết là quality post
  IF NOT public.is_quality_post(NEW.post_id) THEN RETURN NEW; END IF;
  
  -- V3.1: Comment phải > 20 ký tự (quality comment)
  v_comment_length := COALESCE(LENGTH(NEW.content), 0);
  IF v_comment_length <= 20 THEN RETURN NEW; END IF;
  
  -- V3.1: Kiểm tra COMMENT limit RIÊNG = 50/ngày Vietnam
  v_comment_count := public.count_comments_today_vn(v_post_author);
  IF v_comment_count >= v_max_comments THEN RETURN NEW; END IF;
  
  -- Kiểm tra đã thưởng cho comment này chưa
  SELECT EXISTS (
    SELECT 1 FROM public.reward_logs 
    WHERE user_id = v_post_author 
      AND reference_id = NEW.id
      AND reward_type = 'comment'
      AND status = 'active'
  ) INTO v_already_rewarded;
  
  IF NOT v_already_rewarded THEN
    -- Áp dụng daily cap
    v_actual_reward := public.check_daily_reward_cap(v_post_author, v_reward);
    
    IF v_actual_reward > 0 THEN
      -- Ghi log reward
      INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id, reference_user_id)
      VALUES (v_post_author, 'comment', v_actual_reward, NEW.id, NEW.author_id);
      
      -- Cập nhật pending_reward
      UPDATE public.profiles
      SET pending_reward = pending_reward + v_actual_reward
      WHERE id = v_post_author;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;