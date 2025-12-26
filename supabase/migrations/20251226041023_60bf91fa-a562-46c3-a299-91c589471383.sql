-- =============================================
-- LÀM SẠCH DỮ LIỆU THƯỞNG THEO LUẬT ÁNH SÁNG v2.1
-- Xóa các action tracking cũ không hợp lệ
-- Tính lại pending_reward cho tất cả users
-- =============================================

-- 1. Tính tổng thưởng SAI từ các hành động cũ cho mỗi user
-- like_given: 10.000 CLC/lần (người like được thưởng - SAI)
-- comment: 5.000 CLC/lần (người comment được thưởng - SAI)  
-- share: 10.000 CLC/lần (người share được thưởng - SAI)

DO $$
DECLARE
  user_record RECORD;
  invalid_like_given_count INTEGER;
  invalid_comment_count INTEGER;
  invalid_share_count INTEGER;
  total_invalid_reward BIGINT;
  current_pending BIGINT;
  new_pending BIGINT;
BEGIN
  -- Loop through all users có tracking records cũ
  FOR user_record IN 
    SELECT DISTINCT user_id FROM user_reward_tracking 
    WHERE action_type IN ('like_given', 'comment', 'share')
  LOOP
    -- Đếm số records không hợp lệ
    SELECT COUNT(*) INTO invalid_like_given_count 
    FROM user_reward_tracking 
    WHERE user_id = user_record.user_id AND action_type = 'like_given';
    
    SELECT COUNT(*) INTO invalid_comment_count 
    FROM user_reward_tracking 
    WHERE user_id = user_record.user_id AND action_type = 'comment';
    
    SELECT COUNT(*) INTO invalid_share_count 
    FROM user_reward_tracking 
    WHERE user_id = user_record.user_id AND action_type = 'share';
    
    -- Tính tổng thưởng không hợp lệ
    total_invalid_reward := (invalid_like_given_count * 10000) + 
                            (invalid_comment_count * 5000) + 
                            (invalid_share_count * 10000);
    
    -- Lấy pending hiện tại
    SELECT pending_reward INTO current_pending FROM profiles WHERE id = user_record.user_id;
    
    -- Tính pending mới (không âm)
    new_pending := GREATEST(0, COALESCE(current_pending, 0) - total_invalid_reward);
    
    -- Cập nhật pending_reward
    UPDATE profiles SET pending_reward = new_pending WHERE id = user_record.user_id;
    
    RAISE NOTICE 'User %: Trừ % CLC (like_given: %, comment: %, share: %)', 
      user_record.user_id, total_invalid_reward, 
      invalid_like_given_count, invalid_comment_count, invalid_share_count;
  END LOOP;
END $$;

-- 2. Xóa các records tracking cũ không hợp lệ
DELETE FROM user_reward_tracking WHERE action_type = 'like_given';
DELETE FROM user_reward_tracking WHERE action_type = 'comment';
DELETE FROM user_reward_tracking WHERE action_type = 'share';

-- 3. Xóa share_received cũ (không có user_id suffix) - format mới là share_received_<user_id>
DELETE FROM user_reward_tracking WHERE action_type = 'share_received';

-- 4. Log kết quả
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count FROM user_reward_tracking;
  RAISE NOTICE 'Hoàn tất! Còn lại % records tracking hợp lệ', remaining_count;
END $$;