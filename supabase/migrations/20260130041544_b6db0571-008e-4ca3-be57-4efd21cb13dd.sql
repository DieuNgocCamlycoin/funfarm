-- =====================================================
-- REWARD REVOCATION TRIGGERS V3.1
-- Phần 2: Update ban_user_permanently (DROP rồi CREATE lại)
-- =====================================================

-- Drop function cũ trước
DROP FUNCTION IF EXISTS public.ban_user_permanently(uuid, uuid, text);

-- Tạo lại function với logic mới
CREATE OR REPLACE FUNCTION public.ban_user_permanently(
  p_user_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Vi phạm nghiêm trọng quy định cộng đồng'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_exists boolean;
  v_affected_user record;
  v_total_revoked bigint := 0;
  v_wallet text;
BEGIN
  -- Kiểm tra user có tồn tại không
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User không tồn tại';
  END IF;

  -- Kiểm tra admin có quyền không
  IF NOT has_role(p_admin_id, 'admin') AND NOT has_role(p_admin_id, 'owner') THEN
    RAISE EXCEPTION 'Không có quyền thực hiện hành động này';
  END IF;

  -- Get user wallet
  SELECT wallet_address INTO v_wallet FROM profiles WHERE id = p_user_id;

  -- =====================================================
  -- PHẦN MỚI: Trừ thưởng của các user khác từ tương tác của user bị ban
  -- =====================================================
  
  -- Tính tổng thưởng cần trừ cho từng user
  FOR v_affected_user IN
    SELECT 
      user_id,
      SUM(amount) as total_amount
    FROM reward_logs
    WHERE reference_user_id = p_user_id
      AND status = 'active'
      AND user_id != p_user_id  -- Không tính thưởng của chính user bị ban
    GROUP BY user_id
  LOOP
    -- Đánh dấu tất cả reward_logs liên quan là revoked
    UPDATE reward_logs
    SET status = 'revoked',
        revoked_at = now()
    WHERE reference_user_id = p_user_id
      AND user_id = v_affected_user.user_id
      AND status = 'active';

    -- Trừ pending_reward của user bị ảnh hưởng
    UPDATE profiles
    SET pending_reward = GREATEST(0, pending_reward - v_affected_user.total_amount),
        updated_at = now()
    WHERE id = v_affected_user.user_id;

    v_total_revoked := v_total_revoked + v_affected_user.total_amount;
  END LOOP;

  -- =====================================================
  -- PHẦN CŨ: Ban user và reset thưởng của họ
  -- =====================================================
  
  -- Đánh dấu tất cả reward_logs của user bị ban là revoked
  UPDATE reward_logs
  SET status = 'revoked',
      revoked_at = now()
  WHERE user_id = p_user_id
    AND status = 'active';

  -- Cập nhật profile: ban user và reset thưởng
  UPDATE profiles
  SET 
    banned = true,
    banned_at = now(),
    ban_reason = p_reason,
    violation_level = 3,
    is_good_heart = false,
    good_heart_since = NULL,
    pending_reward = 0,
    approved_reward = 0,
    updated_at = now()
  WHERE id = p_user_id;

  -- Add to blacklisted wallets if wallet exists
  IF v_wallet IS NOT NULL AND v_wallet != '' THEN
    INSERT INTO blacklisted_wallets (wallet_address, reason, is_permanent, user_id)
    VALUES (v_wallet, p_reason, true, p_user_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Create permanent reward ban (100 years)
  INSERT INTO reward_bans (user_id, reason, expires_at)
  VALUES (p_user_id, p_reason, now() + interval '100 years')
  ON CONFLICT DO NOTHING;
  
  -- Send notification
  INSERT INTO notifications (user_id, type, content)
  VALUES (p_user_id, 'account_banned', 'Tài khoản của bạn đã bị khóa vĩnh viễn vì: ' || p_reason);

  RETURN true;
END;
$$;