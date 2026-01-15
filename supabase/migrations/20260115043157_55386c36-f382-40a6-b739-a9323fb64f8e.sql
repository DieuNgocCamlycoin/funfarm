-- ============================================
-- FUN FARM REWARD SYSTEM v3.0
-- ============================================

-- 1. Tạo bảng reward_logs để theo dõi chi tiết thưởng
CREATE TABLE IF NOT EXISTS public.reward_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL, -- 'welcome', 'wallet', 'post', 'like', 'comment', 'share', 'friendship', 'livestream'
    reference_id UUID, -- ID của bài viết/comment/livestream liên quan
    reference_user_id UUID, -- User liên quan (người like, comment, share)
    amount BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'revoked'
    reward_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_reward_type CHECK (reward_type IN ('welcome', 'wallet', 'post', 'like', 'comment', 'share', 'friendship', 'livestream'))
);

-- Enable RLS
ALTER TABLE public.reward_logs ENABLE ROW LEVEL SECURITY;

-- Policies for reward_logs
CREATE POLICY "Users can view their own reward logs"
ON public.reward_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reward logs"
ON public.reward_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert reward logs"
ON public.reward_logs FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update reward logs"
ON public.reward_logs FOR UPDATE
USING (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_reward_logs_user_id ON public.reward_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_logs_reference_id ON public.reward_logs(reference_id);
CREATE INDEX IF NOT EXISTS idx_reward_logs_reward_date ON public.reward_logs(reward_date);
CREATE INDEX IF NOT EXISTS idx_reward_logs_status ON public.reward_logs(status);

-- 2. Tạo bảng livestreams
CREATE TABLE IF NOT EXISTS public.livestreams (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN ended_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
            ELSE NULL
        END
    ) STORED,
    is_rewarded BOOLEAN NOT NULL DEFAULT false,
    reward_amount BIGINT DEFAULT 0,
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    shares_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for livestreams
ALTER TABLE public.livestreams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view livestreams"
ON public.livestreams FOR SELECT
USING (true);

CREATE POLICY "Users can create their own livestreams"
ON public.livestreams FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own livestreams"
ON public.livestreams FOR UPDATE
USING (auth.uid() = user_id);

-- Index for livestreams
CREATE INDEX IF NOT EXISTS idx_livestreams_user_id ON public.livestreams(user_id);
CREATE INDEX IF NOT EXISTS idx_livestreams_started_at ON public.livestreams(started_at);

-- 3. Tạo bảng livestream_likes
CREATE TABLE IF NOT EXISTS public.livestream_likes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    livestream_id UUID NOT NULL REFERENCES public.livestreams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(livestream_id, user_id)
);

ALTER TABLE public.livestream_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view livestream likes"
ON public.livestream_likes FOR SELECT USING (true);

CREATE POLICY "Users can like livestreams"
ON public.livestream_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike livestreams"
ON public.livestream_likes FOR DELETE USING (auth.uid() = user_id);

-- 4. Tạo bảng livestream_comments
CREATE TABLE IF NOT EXISTS public.livestream_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    livestream_id UUID NOT NULL REFERENCES public.livestreams(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.livestream_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view livestream comments"
ON public.livestream_comments FOR SELECT USING (true);

CREATE POLICY "Users can comment on livestreams"
ON public.livestream_comments FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments"
ON public.livestream_comments FOR DELETE USING (auth.uid() = author_id);

-- 5. Tạo bảng livestream_shares
CREATE TABLE IF NOT EXISTS public.livestream_shares (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    livestream_id UUID NOT NULL REFERENCES public.livestreams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(livestream_id, user_id)
);

ALTER TABLE public.livestream_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view livestream shares"
ON public.livestream_shares FOR SELECT USING (true);

CREATE POLICY "Users can share livestreams"
ON public.livestream_shares FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- 6. Hàm check_daily_reward_cap - LOẠI TRỪ welcome + wallet
CREATE OR REPLACE FUNCTION public.check_daily_reward_cap(p_user_id UUID, p_requested_amount BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_today_total BIGINT;
    v_daily_cap BIGINT := 500000;
    v_remaining BIGINT;
BEGIN
    -- Tính tổng thưởng hôm nay, LOẠI TRỪ welcome và wallet
    SELECT COALESCE(SUM(amount), 0) INTO v_today_total
    FROM public.reward_logs
    WHERE user_id = p_user_id
    AND reward_date = CURRENT_DATE
    AND status = 'active'
    AND reward_type NOT IN ('welcome', 'wallet');
    
    -- Tính số còn lại có thể nhận
    v_remaining := GREATEST(0, v_daily_cap - v_today_total);
    
    -- Trả về min(requested, remaining)
    RETURN LEAST(p_requested_amount, v_remaining);
END;
$$;

-- 7. Hàm log_reward - Ghi nhận thưởng vào reward_logs
CREATE OR REPLACE FUNCTION public.log_reward(
    p_user_id UUID,
    p_reward_type TEXT,
    p_amount BIGINT,
    p_reference_id UUID DEFAULT NULL,
    p_reference_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_actual_amount BIGINT;
BEGIN
    -- Nếu là welcome hoặc wallet, không áp dụng daily cap
    IF p_reward_type IN ('welcome', 'wallet') THEN
        v_actual_amount := p_amount;
    ELSE
        -- Kiểm tra daily cap
        v_actual_amount := public.check_daily_reward_cap(p_user_id, p_amount);
    END IF;
    
    -- Nếu không còn quota, return false
    IF v_actual_amount <= 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Ghi log
    INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id, reference_user_id)
    VALUES (p_user_id, p_reward_type, v_actual_amount, p_reference_id, p_reference_user_id);
    
    -- Cập nhật pending_reward
    UPDATE public.profiles
    SET pending_reward = pending_reward + v_actual_amount
    WHERE id = p_user_id;
    
    RETURN TRUE;
END;
$$;

-- ============================================
-- REVOCATION TRIGGERS
-- ============================================

-- 8. Trigger trừ thưởng khi xóa bài viết
CREATE OR REPLACE FUNCTION public.revoke_post_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_total_revoked BIGINT := 0;
BEGIN
    -- Tính tổng thưởng cần trừ từ bài viết này
    SELECT COALESCE(SUM(amount), 0) INTO v_total_revoked
    FROM public.reward_logs
    WHERE reference_id = OLD.id
    AND status = 'active';
    
    -- Đánh dấu các reward_logs là revoked
    UPDATE public.reward_logs
    SET status = 'revoked', revoked_at = now()
    WHERE reference_id = OLD.id
    AND status = 'active';
    
    -- Trừ pending_reward của tác giả (không cho âm)
    IF v_total_revoked > 0 THEN
        UPDATE public.profiles
        SET pending_reward = GREATEST(0, pending_reward - v_total_revoked)
        WHERE id = OLD.author_id;
    END IF;
    
    RETURN OLD;
END;
$$;

-- Drop existing trigger if exists and create new
DROP TRIGGER IF EXISTS on_post_delete_revoke_reward ON public.posts;
CREATE TRIGGER on_post_delete_revoke_reward
BEFORE DELETE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.revoke_post_reward();

-- 9. Trigger trừ thưởng khi xóa comment
CREATE OR REPLACE FUNCTION public.revoke_comment_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_post_author UUID;
    v_reward_amount BIGINT := 0;
BEGIN
    -- Lấy tác giả bài gốc
    SELECT author_id INTO v_post_author FROM public.posts WHERE id = OLD.post_id;
    
    -- Tìm reward đã ghi cho comment này
    SELECT COALESCE(SUM(amount), 0) INTO v_reward_amount
    FROM public.reward_logs
    WHERE reference_id = OLD.id
    AND reward_type = 'comment'
    AND status = 'active';
    
    -- Đánh dấu revoked
    UPDATE public.reward_logs
    SET status = 'revoked', revoked_at = now()
    WHERE reference_id = OLD.id
    AND reward_type = 'comment'
    AND status = 'active';
    
    -- Trừ pending_reward của tác giả bài gốc
    IF v_reward_amount > 0 AND v_post_author IS NOT NULL THEN
        UPDATE public.profiles
        SET pending_reward = GREATEST(0, pending_reward - v_reward_amount)
        WHERE id = v_post_author;
    END IF;
    
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_delete_revoke_reward ON public.comments;
CREATE TRIGGER on_comment_delete_revoke_reward
BEFORE DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.revoke_comment_reward();

-- 10. Trigger trừ thưởng khi xóa livestream
CREATE OR REPLACE FUNCTION public.revoke_livestream_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_total_revoked BIGINT := 0;
BEGIN
    -- Tính tổng thưởng từ livestream này
    SELECT COALESCE(SUM(amount), 0) INTO v_total_revoked
    FROM public.reward_logs
    WHERE reference_id = OLD.id
    AND status = 'active';
    
    -- Đánh dấu revoked
    UPDATE public.reward_logs
    SET status = 'revoked', revoked_at = now()
    WHERE reference_id = OLD.id
    AND status = 'active';
    
    -- Trừ pending_reward của host
    IF v_total_revoked > 0 THEN
        UPDATE public.profiles
        SET pending_reward = GREATEST(0, pending_reward - v_total_revoked)
        WHERE id = OLD.user_id;
    END IF;
    
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_livestream_delete_revoke_reward ON public.livestreams;
CREATE TRIGGER on_livestream_delete_revoke_reward
BEFORE DELETE ON public.livestreams
FOR EACH ROW
EXECUTE FUNCTION public.revoke_livestream_reward();

-- 11. Trigger trừ thưởng khi hủy kết bạn
CREATE OR REPLACE FUNCTION public.revoke_friendship_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_reward_amount BIGINT := 10000; -- 10k mỗi người
BEGIN
    -- Chỉ trừ khi unfriend (delete) hoặc status thay đổi từ accepted
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.status = 'accepted' AND NEW.status != 'accepted') THEN
        -- Trừ thưởng người mời (follower)
        UPDATE public.reward_logs
        SET status = 'revoked', revoked_at = now()
        WHERE user_id = OLD.follower_id
        AND reference_id = OLD.following_id::UUID
        AND reward_type = 'friendship'
        AND status = 'active';
        
        UPDATE public.profiles
        SET pending_reward = GREATEST(0, pending_reward - v_reward_amount)
        WHERE id = OLD.follower_id;
        
        -- Trừ thưởng người chấp nhận (following)
        UPDATE public.reward_logs
        SET status = 'revoked', revoked_at = now()
        WHERE user_id = OLD.following_id
        AND reference_id = OLD.follower_id::UUID
        AND reward_type = 'friendship'
        AND status = 'active';
        
        UPDATE public.profiles
        SET pending_reward = GREATEST(0, pending_reward - v_reward_amount)
        WHERE id = OLD.following_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS on_friendship_delete_revoke_reward ON public.followers;
CREATE TRIGGER on_friendship_delete_revoke_reward
BEFORE DELETE ON public.followers
FOR EACH ROW
EXECUTE FUNCTION public.revoke_friendship_reward();

DROP TRIGGER IF EXISTS on_friendship_update_revoke_reward ON public.followers;
CREATE TRIGGER on_friendship_update_revoke_reward
BEFORE UPDATE ON public.followers
FOR EACH ROW
EXECUTE FUNCTION public.revoke_friendship_reward();

-- ============================================
-- UPDATED REWARD TRIGGERS (v3.0)
-- ============================================

-- 12. Cập nhật trigger thưởng đăng bài (10k thay vì 20k)
CREATE OR REPLACE FUNCTION public.reward_post_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    content_length INTEGER;
    has_media BOOLEAN;
    v_reward BIGINT;
    v_actual_reward BIGINT;
BEGIN
    -- Bỏ qua bài share
    IF NEW.post_type = 'share' THEN
        RETURN NEW;
    END IF;
    
    -- Kiểm tra user bị ban
    IF public.is_reward_banned(NEW.author_id) THEN
        RETURN NEW;
    END IF;
    
    -- Kiểm tra giới hạn ngày (10 bài/ngày)
    IF NOT public.check_daily_limit(NEW.author_id, 'post') THEN
        PERFORM public.send_daily_limit_notification(NEW.author_id, 'post');
        RETURN NEW;
    END IF;
    
    -- Kiểm tra chất lượng bài viết theo Luật Ánh Sáng v3.0
    content_length := COALESCE(LENGTH(NEW.content), 0);
    has_media := (NEW.images IS NOT NULL AND array_length(NEW.images, 1) > 0) OR NEW.video_url IS NOT NULL;
    
    -- CHỈ THƯỞNG NẾU: >100 ký tự VÀ có ảnh/video = 10,000 CLC
    IF content_length > 100 AND has_media THEN
        v_reward := 10000;
        
        -- Kiểm tra daily cap
        v_actual_reward := public.check_daily_reward_cap(NEW.author_id, v_reward);
        
        IF v_actual_reward > 0 THEN
            -- Log reward
            INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id)
            VALUES (NEW.author_id, 'post', v_actual_reward, NEW.id);
            
            -- Update pending_reward
            UPDATE public.profiles
            SET pending_reward = pending_reward + v_actual_reward
            WHERE id = NEW.author_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 13. Cập nhật trigger thưởng like (1k flat, không tiered)
CREATE OR REPLACE FUNCTION public.reward_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    like_count INTEGER;
    post_author UUID;
    post_type_value TEXT;
    already_rewarded BOOLEAN;
    v_reward BIGINT := 1000; -- Flat 1k/like
    v_actual_reward BIGINT;
BEGIN
    -- Get post info
    SELECT author_id, post_type INTO post_author, post_type_value 
    FROM public.posts WHERE id = NEW.post_id;
    
    -- Update likes_count on the post
    SELECT COUNT(*) INTO like_count FROM public.post_likes WHERE post_id = NEW.post_id;
    UPDATE public.posts SET likes_count = like_count WHERE id = NEW.post_id;
    
    -- Không tự like bài của mình
    IF NEW.user_id = post_author THEN
        RETURN NEW;
    END IF;
    
    -- Kiểm tra author bị ban
    IF public.is_reward_banned(post_author) THEN
        RETURN NEW;
    END IF;
    
    -- Kiểm tra like từ user này đã được thưởng chưa
    SELECT EXISTS (
        SELECT 1 FROM public.reward_logs 
        WHERE user_id = post_author 
        AND reference_id = NEW.post_id 
        AND reference_user_id = NEW.user_id
        AND reward_type = 'like'
        AND status = 'active'
    ) INTO already_rewarded;
    
    IF NOT already_rewarded THEN
        -- Kiểm tra daily cap
        v_actual_reward := public.check_daily_reward_cap(post_author, v_reward);
        
        IF v_actual_reward > 0 THEN
            -- Log reward
            INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id, reference_user_id)
            VALUES (post_author, 'like', v_actual_reward, NEW.post_id, NEW.user_id);
            
            -- Update pending_reward
            UPDATE public.profiles
            SET pending_reward = pending_reward + v_actual_reward
            WHERE id = post_author;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 14. Cập nhật trigger thưởng comment (2k thay vì 5k)
CREATE OR REPLACE FUNCTION public.reward_comment_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    post_author UUID;
    already_rewarded BOOLEAN;
    comment_length INTEGER;
    v_reward BIGINT := 2000; -- 2k/comment CL
    v_actual_reward BIGINT;
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
    
    -- LUẬT ÁNH SÁNG v3.0: Comment phải >20 ký tự mới được thưởng
    comment_length := COALESCE(LENGTH(NEW.content), 0);
    IF comment_length <= 20 THEN
        RETURN NEW;
    END IF;
    
    -- Kiểm tra đã thưởng cho author từ user này chưa
    SELECT EXISTS (
        SELECT 1 FROM public.reward_logs 
        WHERE user_id = post_author 
        AND reference_id = NEW.id
        AND reward_type = 'comment'
        AND status = 'active'
    ) INTO already_rewarded;
    
    IF NOT already_rewarded THEN
        -- Kiểm tra daily cap
        v_actual_reward := public.check_daily_reward_cap(post_author, v_reward);
        
        IF v_actual_reward > 0 THEN
            -- Log reward - reference_id = comment.id để có thể revoke khi xóa comment
            INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id, reference_user_id)
            VALUES (post_author, 'comment', v_actual_reward, NEW.id, NEW.author_id);
            
            -- Update pending_reward cho author bài viết
            UPDATE public.profiles
            SET pending_reward = pending_reward + v_actual_reward
            WHERE id = post_author;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 15. Cập nhật trigger thưởng share (10k, limit 5/ngày)
CREATE OR REPLACE FUNCTION public.reward_post_share()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    share_count INTEGER;
    post_author UUID;
    already_rewarded BOOLEAN;
    v_reward BIGINT := 10000;
    v_actual_reward BIGINT;
    v_shares_today INTEGER;
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
    
    -- Kiểm tra limit 5 shares/ngày cho author
    SELECT COUNT(*) INTO v_shares_today
    FROM public.reward_logs
    WHERE user_id = post_author
    AND reward_type = 'share'
    AND reward_date = CURRENT_DATE
    AND status = 'active';
    
    IF v_shares_today >= 5 THEN
        RETURN NEW;
    END IF;
    
    -- Kiểm tra author bị ban
    IF public.is_reward_banned(post_author) THEN
        RETURN NEW;
    END IF;
    
    -- Kiểm tra share từ user này đã thưởng chưa
    SELECT EXISTS (
        SELECT 1 FROM public.reward_logs 
        WHERE user_id = post_author 
        AND reference_id = NEW.post_id 
        AND reference_user_id = NEW.user_id
        AND reward_type = 'share'
        AND status = 'active'
    ) INTO already_rewarded;
    
    IF NOT already_rewarded THEN
        -- Kiểm tra daily cap
        v_actual_reward := public.check_daily_reward_cap(post_author, v_reward);
        
        IF v_actual_reward > 0 THEN
            -- Log reward
            INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id, reference_user_id)
            VALUES (post_author, 'share', v_actual_reward, NEW.post_id, NEW.user_id);
            
            -- Update pending_reward
            UPDATE public.profiles
            SET pending_reward = pending_reward + v_actual_reward
            WHERE id = post_author;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 16. Cập nhật trigger thưởng kết bạn (10k thay vì 50k)
CREATE OR REPLACE FUNCTION public.reward_friendship_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    already_rewarded_requester BOOLEAN;
    already_rewarded_accepter BOOLEAN;
    v_reward BIGINT := 10000; -- 10k/người
    v_actual_reward BIGINT;
BEGIN
    -- Chỉ thưởng khi status chuyển từ pending → accepted
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
        
        -- ========== THƯỞNG CHO NGƯỜI MỜI KẾT BẠN (follower) ==========
        SELECT EXISTS (
            SELECT 1 FROM public.reward_logs 
            WHERE user_id = NEW.follower_id 
            AND reference_id = NEW.following_id
            AND reward_type = 'friendship'
            AND status = 'active'
        ) INTO already_rewarded_requester;
        
        IF NOT already_rewarded_requester AND NOT public.is_reward_banned(NEW.follower_id) THEN
            v_actual_reward := public.check_daily_reward_cap(NEW.follower_id, v_reward);
            
            IF v_actual_reward > 0 THEN
                INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id)
                VALUES (NEW.follower_id, 'friendship', v_actual_reward, NEW.following_id);
                
                UPDATE public.profiles 
                SET pending_reward = pending_reward + v_actual_reward 
                WHERE id = NEW.follower_id;
            END IF;
        END IF;
        
        -- ========== THƯỞNG CHO NGƯỜI CHẤP NHẬN (following) ==========
        SELECT EXISTS (
            SELECT 1 FROM public.reward_logs 
            WHERE user_id = NEW.following_id 
            AND reference_id = NEW.follower_id
            AND reward_type = 'friendship'
            AND status = 'active'
        ) INTO already_rewarded_accepter;
        
        IF NOT already_rewarded_accepter AND NOT public.is_reward_banned(NEW.following_id) THEN
            v_actual_reward := public.check_daily_reward_cap(NEW.following_id, v_reward);
            
            IF v_actual_reward > 0 THEN
                INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id)
                VALUES (NEW.following_id, 'friendship', v_actual_reward, NEW.follower_id);
                
                UPDATE public.profiles 
                SET pending_reward = pending_reward + v_actual_reward 
                WHERE id = NEW.following_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================
-- LIVESTREAM REWARD TRIGGERS
-- ============================================

-- 17. Trigger thưởng khi kết thúc livestream (20k, >=15 phút, max 5/ngày)
CREATE OR REPLACE FUNCTION public.reward_livestream_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_duration INTEGER;
    v_livestreams_today INTEGER;
    v_reward BIGINT := 20000;
    v_actual_reward BIGINT;
BEGIN
    -- Chỉ thưởng khi ended_at được set và chưa được thưởng
    IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL AND NEW.is_rewarded = false THEN
        -- Tính duration
        v_duration := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60;
        
        -- Phải >= 15 phút
        IF v_duration < 15 THEN
            RETURN NEW;
        END IF;
        
        -- Kiểm tra user bị ban
        IF public.is_reward_banned(NEW.user_id) THEN
            RETURN NEW;
        END IF;
        
        -- Kiểm tra limit 5 livestreams/ngày
        SELECT COUNT(*) INTO v_livestreams_today
        FROM public.reward_logs
        WHERE user_id = NEW.user_id
        AND reward_type = 'livestream'
        AND reward_date = CURRENT_DATE
        AND status = 'active';
        
        IF v_livestreams_today >= 5 THEN
            RETURN NEW;
        END IF;
        
        -- Kiểm tra daily cap
        v_actual_reward := public.check_daily_reward_cap(NEW.user_id, v_reward);
        
        IF v_actual_reward > 0 THEN
            -- Log reward
            INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id)
            VALUES (NEW.user_id, 'livestream', v_actual_reward, NEW.id);
            
            -- Update pending_reward
            UPDATE public.profiles
            SET pending_reward = pending_reward + v_actual_reward
            WHERE id = NEW.user_id;
            
            -- Mark as rewarded
            NEW.is_rewarded := true;
            NEW.reward_amount := v_actual_reward;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_livestream_end_reward ON public.livestreams;
CREATE TRIGGER on_livestream_end_reward
BEFORE UPDATE ON public.livestreams
FOR EACH ROW
EXECUTE FUNCTION public.reward_livestream_completion();

-- 18. Trigger thưởng like trên livestream (1k/like cho host)
CREATE OR REPLACE FUNCTION public.reward_livestream_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_host_id UUID;
    v_reward BIGINT := 1000;
    v_actual_reward BIGINT;
    already_rewarded BOOLEAN;
BEGIN
    -- Get host
    SELECT user_id INTO v_host_id FROM public.livestreams WHERE id = NEW.livestream_id;
    
    -- Update likes_count
    UPDATE public.livestreams 
    SET likes_count = (SELECT COUNT(*) FROM public.livestream_likes WHERE livestream_id = NEW.livestream_id)
    WHERE id = NEW.livestream_id;
    
    -- Không tự like
    IF NEW.user_id = v_host_id THEN
        RETURN NEW;
    END IF;
    
    -- Kiểm tra host bị ban
    IF public.is_reward_banned(v_host_id) THEN
        RETURN NEW;
    END IF;
    
    -- Kiểm tra đã thưởng chưa
    SELECT EXISTS (
        SELECT 1 FROM public.reward_logs 
        WHERE user_id = v_host_id 
        AND reference_id = NEW.livestream_id 
        AND reference_user_id = NEW.user_id
        AND reward_type = 'like'
        AND status = 'active'
    ) INTO already_rewarded;
    
    IF NOT already_rewarded THEN
        v_actual_reward := public.check_daily_reward_cap(v_host_id, v_reward);
        
        IF v_actual_reward > 0 THEN
            INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id, reference_user_id)
            VALUES (v_host_id, 'like', v_actual_reward, NEW.livestream_id, NEW.user_id);
            
            UPDATE public.profiles
            SET pending_reward = pending_reward + v_actual_reward
            WHERE id = v_host_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_livestream_like_reward ON public.livestream_likes;
CREATE TRIGGER on_livestream_like_reward
AFTER INSERT ON public.livestream_likes
FOR EACH ROW
EXECUTE FUNCTION public.reward_livestream_like();

-- 19. Trigger thưởng comment trên livestream (2k/comment CL cho host)
CREATE OR REPLACE FUNCTION public.reward_livestream_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_host_id UUID;
    v_reward BIGINT := 2000;
    v_actual_reward BIGINT;
    comment_length INTEGER;
BEGIN
    -- Get host
    SELECT user_id INTO v_host_id FROM public.livestreams WHERE id = NEW.livestream_id;
    
    -- Update comments_count
    UPDATE public.livestreams 
    SET comments_count = (SELECT COUNT(*) FROM public.livestream_comments WHERE livestream_id = NEW.livestream_id)
    WHERE id = NEW.livestream_id;
    
    -- Không tự comment
    IF NEW.author_id = v_host_id THEN
        RETURN NEW;
    END IF;
    
    -- Kiểm tra host bị ban
    IF public.is_reward_banned(v_host_id) THEN
        RETURN NEW;
    END IF;
    
    -- Chỉ thưởng comment >20 ký tự
    comment_length := COALESCE(LENGTH(NEW.content), 0);
    IF comment_length <= 20 THEN
        RETURN NEW;
    END IF;
    
    -- Kiểm tra daily cap
    v_actual_reward := public.check_daily_reward_cap(v_host_id, v_reward);
    
    IF v_actual_reward > 0 THEN
        INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id, reference_user_id)
        VALUES (v_host_id, 'comment', v_actual_reward, NEW.id, NEW.author_id);
        
        UPDATE public.profiles
        SET pending_reward = pending_reward + v_actual_reward
        WHERE id = v_host_id;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_livestream_comment_reward ON public.livestream_comments;
CREATE TRIGGER on_livestream_comment_reward
AFTER INSERT ON public.livestream_comments
FOR EACH ROW
EXECUTE FUNCTION public.reward_livestream_comment();

-- 20. Trigger thưởng share livestream (10k/share cho host, max 5/ngày)
CREATE OR REPLACE FUNCTION public.reward_livestream_share()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_host_id UUID;
    v_reward BIGINT := 10000;
    v_actual_reward BIGINT;
    v_shares_today INTEGER;
    already_rewarded BOOLEAN;
BEGIN
    -- Get host
    SELECT user_id INTO v_host_id FROM public.livestreams WHERE id = NEW.livestream_id;
    
    -- Update shares_count
    UPDATE public.livestreams 
    SET shares_count = (SELECT COUNT(*) FROM public.livestream_shares WHERE livestream_id = NEW.livestream_id)
    WHERE id = NEW.livestream_id;
    
    -- Không tự share
    IF NEW.user_id = v_host_id THEN
        RETURN NEW;
    END IF;
    
    -- Kiểm tra host bị ban
    IF public.is_reward_banned(v_host_id) THEN
        RETURN NEW;
    END IF;
    
    -- Kiểm tra limit 5 shares/ngày
    SELECT COUNT(*) INTO v_shares_today
    FROM public.reward_logs
    WHERE user_id = v_host_id
    AND reward_type = 'share'
    AND reward_date = CURRENT_DATE
    AND status = 'active';
    
    IF v_shares_today >= 5 THEN
        RETURN NEW;
    END IF;
    
    -- Kiểm tra đã thưởng chưa
    SELECT EXISTS (
        SELECT 1 FROM public.reward_logs 
        WHERE user_id = v_host_id 
        AND reference_id = NEW.livestream_id 
        AND reference_user_id = NEW.user_id
        AND reward_type = 'share'
        AND status = 'active'
    ) INTO already_rewarded;
    
    IF NOT already_rewarded THEN
        v_actual_reward := public.check_daily_reward_cap(v_host_id, v_reward);
        
        IF v_actual_reward > 0 THEN
            INSERT INTO public.reward_logs (user_id, reward_type, amount, reference_id, reference_user_id)
            VALUES (v_host_id, 'share', v_actual_reward, NEW.livestream_id, NEW.user_id);
            
            UPDATE public.profiles
            SET pending_reward = pending_reward + v_actual_reward
            WHERE id = v_host_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_livestream_share_reward ON public.livestream_shares;
CREATE TRIGGER on_livestream_share_reward
AFTER INSERT ON public.livestream_shares
FOR EACH ROW
EXECUTE FUNCTION public.reward_livestream_share();