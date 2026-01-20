-- =====================================================
-- MIGRATION: Reward Functions v3.0
-- Cập nhật tất cả reward functions với:
-- 1. Timezone Vietnam Day (UTC+7)
-- 2. Quality post check (>100 chars + media)
-- 3. Interaction limit chung 50 (likes + comments)
-- =====================================================

-- =====================================================
-- HELPER FUNCTION 1: Chuyển UTC → Vietnam Date
-- =====================================================
CREATE OR REPLACE FUNCTION public.to_vietnam_date(utc_timestamp TIMESTAMPTZ)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Cộng 7 giờ để chuyển UTC → Vietnam (UTC+7)
  RETURN (utc_timestamp + INTERVAL '7 hours')::DATE;
END;
$$;

-- =====================================================
-- HELPER FUNCTION 2: Kiểm tra bài viết chất lượng
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_quality_post(p_post_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_content_length INTEGER;
  v_has_media BOOLEAN;
  v_post_type TEXT;
  v_images TEXT[];
  v_video_url TEXT;
BEGIN
  SELECT 
    COALESCE(LENGTH(content), 0),
    images,
    video_url,
    post_type
  INTO v_content_length, v_images, v_video_url, v_post_type
  FROM public.posts WHERE id = p_post_id;
  
  -- Nếu không tìm thấy bài viết
  IF v_post_type IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Share posts không đủ điều kiện quality post
  IF v_post_type = 'share' THEN
    RETURN FALSE;
  END IF;
  
  -- Kiểm tra có media không (images có phần tử không rỗng HOẶC video_url không rỗng)
  v_has_media := FALSE;
  IF v_images IS NOT NULL AND array_length(v_images, 1) > 0 THEN
    -- Kiểm tra có ít nhất 1 image không rỗng
    FOR i IN 1..array_length(v_images, 1) LOOP
      IF v_images[i] IS NOT NULL AND LENGTH(TRIM(v_images[i])) > 0 THEN
        v_has_media := TRUE;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  IF NOT v_has_media AND v_video_url IS NOT NULL AND LENGTH(TRIM(v_video_url)) > 0 THEN
    v_has_media := TRUE;
  END IF;
  
  -- Quality post: content > 100 chars VÀ có media VÀ là 'post' hoặc 'product'
  RETURN v_content_length > 100 AND v_has_media AND v_post_type IN ('post', 'product');
END;
$$;

-- =====================================================
-- HELPER FUNCTION 3: Đếm interactions trong ngày Vietnam
-- =====================================================
CREATE OR REPLACE FUNCTION public.count_interactions_today_vn(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_today_vn DATE;
  v_count INTEGER;
BEGIN
  v_today_vn := public.to_vietnam_date(now());
  
  -- Đếm số lượng reward logs cho likes và comments trong ngày Vietnam
  SELECT COUNT(*) INTO v_count
  FROM public.reward_logs
  WHERE user_id = p_user_id
    AND reward_type IN ('like', 'comment')
    AND public.to_vietnam_date(created_at) = v_today_vn
    AND status = 'active';
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- =====================================================
-- HELPER FUNCTION 4: Cập nhật check_daily_reward_cap dùng Vietnam Day
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_daily_reward_cap(p_user_id UUID, p_requested_amount BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today_vn DATE;
  v_today_total BIGINT;
  v_daily_cap BIGINT := 500000;
  v_remaining BIGINT;
BEGIN
  -- Dùng Vietnam Day thay vì UTC
  v_today_vn := public.to_vietnam_date(now());
  
  -- Tính tổng thưởng hôm nay (Vietnam), LOẠI TRỪ welcome và wallet bonuses
  SELECT COALESCE(SUM(amount), 0) INTO v_today_total
  FROM public.reward_logs
  WHERE user_id = p_user_id
    AND public.to_vietnam_date(created_at) = v_today_vn
    AND status = 'active'
    AND reward_type NOT IN ('welcome', 'wallet');
  
  v_remaining := GREATEST(0, v_daily_cap - v_today_total);
  RETURN LEAST(p_requested_amount, v_remaining);
END;
$$;

-- =====================================================
-- TRIGGER FUNCTION: reward_post_like v3.0
-- =====================================================
CREATE OR REPLACE FUNCTION public.reward_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_author UUID;
  v_interaction_count INTEGER;
  v_max_interactions INTEGER := 50;
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
  
  -- ✅ V3.0: Chỉ thưởng nếu bài viết là quality post
  IF NOT public.is_quality_post(NEW.post_id) THEN RETURN NEW; END IF;
  
  -- ✅ V3.0: Kiểm tra interaction limit chung (likes + comments) = 50/ngày Vietnam
  v_interaction_count := public.count_interactions_today_vn(v_post_author);
  IF v_interaction_count >= v_max_interactions THEN RETURN NEW; END IF;
  
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
-- TRIGGER FUNCTION: reward_comment_creation v3.0
-- =====================================================
CREATE OR REPLACE FUNCTION public.reward_comment_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_author UUID;
  v_interaction_count INTEGER;
  v_max_interactions INTEGER := 50;
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
  
  -- ✅ V3.0: Chỉ thưởng nếu bài viết là quality post
  IF NOT public.is_quality_post(NEW.post_id) THEN RETURN NEW; END IF;
  
  -- ✅ V3.0: Comment phải > 20 ký tự (quality comment)
  v_comment_length := COALESCE(LENGTH(NEW.content), 0);
  IF v_comment_length <= 20 THEN RETURN NEW; END IF;
  
  -- ✅ V3.0: Kiểm tra interaction limit CHUNG với likes = 50/ngày Vietnam
  v_interaction_count := public.count_interactions_today_vn(v_post_author);
  IF v_interaction_count >= v_max_interactions THEN RETURN NEW; END IF;
  
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

-- =====================================================
-- TRIGGER FUNCTION: reward_post_share v3.0
-- =====================================================
CREATE OR REPLACE FUNCTION public.reward_post_share()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_author UUID;
  v_reward BIGINT := 10000;
  v_actual_reward BIGINT;
  v_shares_today INTEGER;
  v_max_shares INTEGER := 5;
  v_today_vn DATE;
  v_already_rewarded BOOLEAN;
BEGIN
  -- Lấy author của bài viết gốc
  SELECT author_id INTO v_post_author FROM public.posts WHERE id = NEW.post_id;
  
  -- Update shares_count
  UPDATE public.posts 
  SET shares_count = (SELECT COUNT(*) FROM public.post_shares WHERE post_id = NEW.post_id)
  WHERE id = NEW.post_id;
  
  -- Không tự share bài của mình
  IF NEW.user_id = v_post_author THEN RETURN NEW; END IF;
  
  -- Kiểm tra author bị ban reward
  IF public.is_reward_banned(v_post_author) THEN RETURN NEW; END IF;
  
  -- ✅ V3.0: Chỉ thưởng nếu bài viết là quality post
  IF NOT public.is_quality_post(NEW.post_id) THEN RETURN NEW; END IF;
  
  -- ✅ V3.0: Limit 5 shares/ngày Vietnam
  v_today_vn := public.to_vietnam_date(now());
  SELECT COUNT(*) INTO v_shares_today
  FROM public.reward_logs
  WHERE user_id = v_post_author
    AND reward_type = 'share'
    AND public.to_vietnam_date(created_at) = v_today_vn
    AND status = 'active';
  
  IF v_shares_today >= v_max_shares THEN RETURN NEW; END IF;
  
  -- Kiểm tra đã thưởng cho share này chưa
  SELECT EXISTS (
    SELECT 1 FROM public.reward_logs 
    WHERE user_id = v_post_author 
      AND reference_id = NEW.post_id 
      AND reference_user_id = NEW.user_id
      AND reward_type = 'share'
      AND status = 'active'
  ) INTO v_already_rewarded;
  
  IF NOT v_already_rewarded THEN
    -- Áp dụng daily cap
    v_actual_reward := public.check_daily_reward_cap(v_post_author, v_reward);
    
    IF v_actual_reward > 0 THEN
      -- Ghi log reward
      INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id, reference_user_id)
      VALUES (v_post_author, 'share', v_actual_reward, NEW.post_id, NEW.user_id);
      
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
-- TRIGGER FUNCTION: reward_friendship_bonus v3.0
-- =====================================================
CREATE OR REPLACE FUNCTION public.reward_friendship_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reward BIGINT := 10000;
  v_actual_reward BIGINT;
  v_friendships_today INTEGER;
  v_max_friendships INTEGER := 10;
  v_today_vn DATE;
  v_already_rewarded BOOLEAN;
BEGIN
  -- Chỉ thưởng khi status chuyển sang 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    v_today_vn := public.to_vietnam_date(now());
    
    -- ========== THƯỞNG CHO NGƯỜI MỜI (follower) ==========
    IF NOT public.is_reward_banned(NEW.follower_id) THEN
      -- Kiểm tra limit 10 friendships/ngày Vietnam
      SELECT COUNT(*) INTO v_friendships_today
      FROM public.reward_logs
      WHERE user_id = NEW.follower_id
        AND reward_type = 'friendship'
        AND public.to_vietnam_date(created_at) = v_today_vn
        AND status = 'active';
      
      IF v_friendships_today < v_max_friendships THEN
        -- Kiểm tra đã thưởng cho cặp này chưa
        SELECT EXISTS (
          SELECT 1 FROM public.reward_logs 
          WHERE user_id = NEW.follower_id 
            AND reference_id = NEW.following_id::TEXT
            AND reward_type = 'friendship'
            AND status = 'active'
        ) INTO v_already_rewarded;
        
        IF NOT v_already_rewarded THEN
          v_actual_reward := public.check_daily_reward_cap(NEW.follower_id, v_reward);
          IF v_actual_reward > 0 THEN
            INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id)
            VALUES (NEW.follower_id, 'friendship', v_actual_reward, NEW.following_id::TEXT);
            
            UPDATE public.profiles 
            SET pending_reward = pending_reward + v_actual_reward 
            WHERE id = NEW.follower_id;
          END IF;
        END IF;
      END IF;
    END IF;
    
    -- ========== THƯỞNG CHO NGƯỜI CHẤP NHẬN (following) ==========
    IF NOT public.is_reward_banned(NEW.following_id) THEN
      -- Kiểm tra limit 10 friendships/ngày Vietnam
      SELECT COUNT(*) INTO v_friendships_today
      FROM public.reward_logs
      WHERE user_id = NEW.following_id
        AND reward_type = 'friendship'
        AND public.to_vietnam_date(created_at) = v_today_vn
        AND status = 'active';
      
      IF v_friendships_today < v_max_friendships THEN
        -- Kiểm tra đã thưởng cho cặp này chưa
        SELECT EXISTS (
          SELECT 1 FROM public.reward_logs 
          WHERE user_id = NEW.following_id 
            AND reference_id = NEW.follower_id::TEXT
            AND reward_type = 'friendship'
            AND status = 'active'
        ) INTO v_already_rewarded;
        
        IF NOT v_already_rewarded THEN
          v_actual_reward := public.check_daily_reward_cap(NEW.following_id, v_reward);
          IF v_actual_reward > 0 THEN
            INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id)
            VALUES (NEW.following_id, 'friendship', v_actual_reward, NEW.follower_id::TEXT);
            
            UPDATE public.profiles 
            SET pending_reward = pending_reward + v_actual_reward 
            WHERE id = NEW.following_id;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGER FUNCTION: reward_post_creation v3.0
-- =====================================================
CREATE OR REPLACE FUNCTION public.reward_post_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reward BIGINT := 10000;
  v_actual_reward BIGINT;
  v_posts_today INTEGER;
  v_max_posts INTEGER := 10;
  v_today_vn DATE;
BEGIN
  -- Không thưởng cho share posts
  IF NEW.post_type = 'share' THEN RETURN NEW; END IF;
  
  -- Kiểm tra author bị ban reward
  IF public.is_reward_banned(NEW.author_id) THEN RETURN NEW; END IF;
  
  -- Kiểm tra bài viết có đủ điều kiện quality post không
  IF NOT public.is_quality_post(NEW.id) THEN RETURN NEW; END IF;
  
  -- ✅ V3.0: Limit 10 quality posts/ngày Vietnam
  v_today_vn := public.to_vietnam_date(now());
  SELECT COUNT(*) INTO v_posts_today
  FROM public.reward_logs
  WHERE user_id = NEW.author_id
    AND reward_type = 'post'
    AND public.to_vietnam_date(created_at) = v_today_vn
    AND status = 'active';
  
  IF v_posts_today >= v_max_posts THEN RETURN NEW; END IF;
  
  -- Áp dụng daily cap
  v_actual_reward := public.check_daily_reward_cap(NEW.author_id, v_reward);
  
  IF v_actual_reward > 0 THEN
    -- Ghi log reward
    INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id)
    VALUES (NEW.author_id, 'post', v_actual_reward, NEW.id);
    
    -- Cập nhật pending_reward
    UPDATE public.profiles
    SET pending_reward = pending_reward + v_actual_reward
    WHERE id = NEW.author_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGER FUNCTION: reward_livestream_completion v3.0
-- =====================================================
CREATE OR REPLACE FUNCTION public.reward_livestream_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reward BIGINT := 20000;
  v_actual_reward BIGINT;
  v_livestreams_today INTEGER;
  v_max_livestreams INTEGER := 3;
  v_today_vn DATE;
BEGIN
  -- Chỉ thưởng khi livestream kết thúc và đủ 15 phút
  IF NEW.ended_at IS NOT NULL 
     AND NEW.duration_minutes >= 15 
     AND NEW.is_rewarded = FALSE THEN
    
    -- Kiểm tra user bị ban reward
    IF public.is_reward_banned(NEW.user_id) THEN RETURN NEW; END IF;
    
    -- ✅ V3.0: Limit 3 livestreams/ngày Vietnam
    v_today_vn := public.to_vietnam_date(now());
    SELECT COUNT(*) INTO v_livestreams_today
    FROM public.reward_logs
    WHERE user_id = NEW.user_id
      AND reward_type = 'livestream'
      AND public.to_vietnam_date(created_at) = v_today_vn
      AND status = 'active';
    
    IF v_livestreams_today >= v_max_livestreams THEN RETURN NEW; END IF;
    
    -- Áp dụng daily cap
    v_actual_reward := public.check_daily_reward_cap(NEW.user_id, v_reward);
    
    IF v_actual_reward > 0 THEN
      -- Ghi log reward
      INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id)
      VALUES (NEW.user_id, 'livestream', v_actual_reward, NEW.id);
      
      -- Cập nhật pending_reward và đánh dấu đã thưởng
      UPDATE public.profiles
      SET pending_reward = pending_reward + v_actual_reward
      WHERE id = NEW.user_id;
      
      UPDATE public.livestreams
      SET is_rewarded = TRUE, reward_amount = v_actual_reward
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGER FUNCTION: reward_livestream_like v3.0
-- =====================================================
CREATE OR REPLACE FUNCTION public.reward_livestream_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_livestream_host UUID;
  v_interaction_count INTEGER;
  v_max_interactions INTEGER := 50;
  v_reward BIGINT := 1000;
  v_actual_reward BIGINT;
  v_already_rewarded BOOLEAN;
BEGIN
  -- Lấy host của livestream
  SELECT user_id INTO v_livestream_host FROM public.livestreams WHERE id = NEW.livestream_id;
  
  -- Update likes_count
  UPDATE public.livestreams 
  SET likes_count = (SELECT COUNT(*) FROM public.livestream_likes WHERE livestream_id = NEW.livestream_id)
  WHERE id = NEW.livestream_id;
  
  -- Không tự like livestream của mình
  IF NEW.user_id = v_livestream_host THEN RETURN NEW; END IF;
  
  -- Kiểm tra host bị ban reward
  IF public.is_reward_banned(v_livestream_host) THEN RETURN NEW; END IF;
  
  -- ✅ V3.0: Kiểm tra interaction limit chung = 50/ngày Vietnam
  v_interaction_count := public.count_interactions_today_vn(v_livestream_host);
  IF v_interaction_count >= v_max_interactions THEN RETURN NEW; END IF;
  
  -- Kiểm tra đã thưởng cho like này chưa
  SELECT EXISTS (
    SELECT 1 FROM public.reward_logs 
    WHERE user_id = v_livestream_host 
      AND reference_id = NEW.livestream_id 
      AND reference_user_id = NEW.user_id
      AND reward_type = 'like'
      AND status = 'active'
  ) INTO v_already_rewarded;
  
  IF NOT v_already_rewarded THEN
    v_actual_reward := public.check_daily_reward_cap(v_livestream_host, v_reward);
    
    IF v_actual_reward > 0 THEN
      INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id, reference_user_id)
      VALUES (v_livestream_host, 'like', v_actual_reward, NEW.livestream_id, NEW.user_id);
      
      UPDATE public.profiles
      SET pending_reward = pending_reward + v_actual_reward
      WHERE id = v_livestream_host;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGER FUNCTION: reward_livestream_comment v3.0
-- =====================================================
CREATE OR REPLACE FUNCTION public.reward_livestream_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_livestream_host UUID;
  v_interaction_count INTEGER;
  v_max_interactions INTEGER := 50;
  v_reward BIGINT := 2000;
  v_actual_reward BIGINT;
  v_comment_length INTEGER;
  v_already_rewarded BOOLEAN;
BEGIN
  -- Lấy host của livestream
  SELECT user_id INTO v_livestream_host FROM public.livestreams WHERE id = NEW.livestream_id;
  
  -- Update comments_count
  UPDATE public.livestreams 
  SET comments_count = (SELECT COUNT(*) FROM public.livestream_comments WHERE livestream_id = NEW.livestream_id)
  WHERE id = NEW.livestream_id;
  
  -- Không tự comment livestream của mình
  IF NEW.author_id = v_livestream_host THEN RETURN NEW; END IF;
  
  -- Kiểm tra host bị ban reward
  IF public.is_reward_banned(v_livestream_host) THEN RETURN NEW; END IF;
  
  -- ✅ V3.0: Comment phải > 20 ký tự
  v_comment_length := COALESCE(LENGTH(NEW.content), 0);
  IF v_comment_length <= 20 THEN RETURN NEW; END IF;
  
  -- ✅ V3.0: Kiểm tra interaction limit CHUNG = 50/ngày Vietnam
  v_interaction_count := public.count_interactions_today_vn(v_livestream_host);
  IF v_interaction_count >= v_max_interactions THEN RETURN NEW; END IF;
  
  -- Kiểm tra đã thưởng cho comment này chưa
  SELECT EXISTS (
    SELECT 1 FROM public.reward_logs 
    WHERE user_id = v_livestream_host 
      AND reference_id = NEW.id
      AND reward_type = 'comment'
      AND status = 'active'
  ) INTO v_already_rewarded;
  
  IF NOT v_already_rewarded THEN
    v_actual_reward := public.check_daily_reward_cap(v_livestream_host, v_reward);
    
    IF v_actual_reward > 0 THEN
      INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id, reference_user_id)
      VALUES (v_livestream_host, 'comment', v_actual_reward, NEW.id, NEW.author_id);
      
      UPDATE public.profiles
      SET pending_reward = pending_reward + v_actual_reward
      WHERE id = v_livestream_host;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGER FUNCTION: reward_livestream_share v3.0
-- =====================================================
CREATE OR REPLACE FUNCTION public.reward_livestream_share()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_livestream_host UUID;
  v_reward BIGINT := 10000;
  v_actual_reward BIGINT;
  v_shares_today INTEGER;
  v_max_shares INTEGER := 5;
  v_today_vn DATE;
  v_already_rewarded BOOLEAN;
BEGIN
  -- Lấy host của livestream
  SELECT user_id INTO v_livestream_host FROM public.livestreams WHERE id = NEW.livestream_id;
  
  -- Update shares_count
  UPDATE public.livestreams 
  SET shares_count = (SELECT COUNT(*) FROM public.livestream_shares WHERE livestream_id = NEW.livestream_id)
  WHERE id = NEW.livestream_id;
  
  -- Không tự share livestream của mình
  IF NEW.user_id = v_livestream_host THEN RETURN NEW; END IF;
  
  -- Kiểm tra host bị ban reward
  IF public.is_reward_banned(v_livestream_host) THEN RETURN NEW; END IF;
  
  -- ✅ V3.0: Limit 5 shares/ngày Vietnam
  v_today_vn := public.to_vietnam_date(now());
  SELECT COUNT(*) INTO v_shares_today
  FROM public.reward_logs
  WHERE user_id = v_livestream_host
    AND reward_type = 'share'
    AND public.to_vietnam_date(created_at) = v_today_vn
    AND status = 'active';
  
  IF v_shares_today >= v_max_shares THEN RETURN NEW; END IF;
  
  -- Kiểm tra đã thưởng cho share này chưa
  SELECT EXISTS (
    SELECT 1 FROM public.reward_logs 
    WHERE user_id = v_livestream_host 
      AND reference_id = NEW.livestream_id 
      AND reference_user_id = NEW.user_id
      AND reward_type = 'share'
      AND status = 'active'
  ) INTO v_already_rewarded;
  
  IF NOT v_already_rewarded THEN
    v_actual_reward := public.check_daily_reward_cap(v_livestream_host, v_reward);
    
    IF v_actual_reward > 0 THEN
      INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id, reference_user_id)
      VALUES (v_livestream_host, 'share', v_actual_reward, NEW.livestream_id, NEW.user_id);
      
      UPDATE public.profiles
      SET pending_reward = pending_reward + v_actual_reward
      WHERE id = v_livestream_host;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;