-- 1. Bảng theo dõi vi phạm
CREATE TABLE public.user_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  violation_type TEXT NOT NULL, -- 'spam_share', 'spam_like', 'spam_comment', 'spam_post', 'bad_content'
  violation_count INTEGER NOT NULL DEFAULT 1,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Bảng ví bị blacklist
CREATE TABLE public.blacklisted_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  user_id UUID,
  reason TEXT NOT NULL,
  blacklisted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_permanent BOOLEAN NOT NULL DEFAULT false
);

-- 3. Thêm cột violation_level và last_violation vào profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS violation_level INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_violation_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_good_heart BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS good_heart_since TIMESTAMP WITH TIME ZONE;

-- 4. Bảng pending bonus requests (cho xét duyệt +50%)
CREATE TABLE public.bonus_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  bonus_amount BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklisted_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_violations
CREATE POLICY "Users can view their own violations" ON public.user_violations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert violations" ON public.user_violations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage violations" ON public.user_violations
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for blacklisted_wallets
CREATE POLICY "Anyone can check blacklist" ON public.blacklisted_wallets
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage blacklist" ON public.blacklisted_wallets
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for bonus_requests
CREATE POLICY "Users can view their own requests" ON public.bonus_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create requests" ON public.bonus_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage requests" ON public.bonus_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 5. Function kiểm tra và xử lý vi phạm spam
CREATE OR REPLACE FUNCTION public.check_spam_behavior(p_user_id UUID, p_action_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_count INTEGER;
  current_violations INTEGER;
  ban_days INTEGER;
BEGIN
  -- Đếm số lần action trong 24h
  IF p_action_type = 'share' THEN
    SELECT COUNT(*) INTO action_count FROM post_shares 
    WHERE user_id = p_user_id AND created_at > now() - interval '24 hours';
  ELSIF p_action_type = 'like' THEN
    SELECT COUNT(*) INTO action_count FROM post_likes 
    WHERE user_id = p_user_id AND created_at > now() - interval '24 hours';
  ELSIF p_action_type = 'comment' THEN
    SELECT COUNT(*) INTO action_count FROM comments 
    WHERE author_id = p_user_id AND created_at > now() - interval '24 hours';
  ELSIF p_action_type = 'post' THEN
    SELECT COUNT(*) INTO action_count FROM posts 
    WHERE author_id = p_user_id AND created_at > now() - interval '24 hours';
  END IF;

  -- Nếu vượt quá 50 lần/ngày → vi phạm
  IF action_count > 50 THEN
    -- Lấy số lần vi phạm hiện tại
    SELECT violation_level INTO current_violations FROM profiles WHERE id = p_user_id;
    
    -- Ghi nhận vi phạm
    INSERT INTO user_violations (user_id, violation_type, details)
    VALUES (p_user_id, 'spam_' || p_action_type, jsonb_build_object('count_24h', action_count));
    
    -- Tăng violation level
    current_violations := COALESCE(current_violations, 0) + 1;
    
    -- Xác định thời gian ban
    IF current_violations = 1 THEN
      ban_days := 7;
    ELSIF current_violations = 2 THEN
      ban_days := 30;
    ELSE
      ban_days := 36500; -- Vĩnh viễn (100 năm)
    END IF;
    
    -- Cập nhật profile
    UPDATE profiles 
    SET violation_level = current_violations,
        last_violation_at = now(),
        is_good_heart = false,
        good_heart_since = NULL
    WHERE id = p_user_id;
    
    -- Tạo ban
    INSERT INTO reward_bans (user_id, reason, expires_at)
    VALUES (
      p_user_id, 
      'Spam ' || p_action_type || ' (lần ' || current_violations || ')',
      now() + (ban_days || ' days')::interval
    )
    ON CONFLICT DO NOTHING;
    
    RETURN TRUE; -- Là spam
  END IF;
  
  RETURN FALSE; -- Không spam
END;
$$;

-- 6. Function cập nhật huy hiệu "Trái tim lương thiện"
CREATE OR REPLACE FUNCTION public.update_good_heart_badge()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Đánh dấu users không vi phạm trong 30 ngày
  UPDATE profiles
  SET is_good_heart = true,
      good_heart_since = COALESCE(good_heart_since, now())
  WHERE violation_level = 0
    AND (last_violation_at IS NULL OR last_violation_at < now() - interval '30 days')
    AND is_good_heart = false;
    
  -- Bỏ huy hiệu nếu vi phạm mới
  UPDATE profiles
  SET is_good_heart = false,
      good_heart_since = NULL
  WHERE last_violation_at > now() - interval '30 days'
    AND is_good_heart = true;
END;
$$;

-- 7. Function kiểm tra wallet blacklist
CREATE OR REPLACE FUNCTION public.is_wallet_blacklisted(p_wallet TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blacklisted_wallets WHERE wallet_address = p_wallet
  );
END;
$$;