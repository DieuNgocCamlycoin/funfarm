-- =============================================
-- TÍNH LẠI PENDING_REWARD THEO CÔNG THỨC LUẬT ÁNH SÁNG v2.1
-- Xóa tất cả thưởng trùng lặp từ xác minh nhiều lần
-- =============================================

DO $$
DECLARE
  user_rec RECORD;
  calculated_reward BIGINT;
  like_reward BIGINT;
  like_3_count INTEGER;
  like_after_3_count INTEGER;
  comment_reward BIGINT;
  share_reward BIGINT;
  friendship_reward BIGINT;
  post_reward BIGINT;
  welcome_reward BIGINT;
  wallet_reward BIGINT;
BEGIN
  FOR user_rec IN 
    SELECT 
      p.id,
      p.display_name,
      p.pending_reward as old_pending,
      p.welcome_bonus_claimed,
      p.wallet_bonus_claimed
    FROM profiles p
    WHERE p.banned = false
  LOOP
    -- 1. Thưởng đăng ký (chỉ 50.000 nếu đã claim)
    IF user_rec.welcome_bonus_claimed THEN
      welcome_reward := 50000;
    ELSE
      welcome_reward := 0;
    END IF;
    
    -- 2. Thưởng kết nối ví (chỉ 50.000 nếu đã claim)
    IF user_rec.wallet_bonus_claimed THEN
      wallet_reward := 50000;
    ELSE
      wallet_reward := 0;
    END IF;
    
    -- 3. Thưởng đăng bài chất lượng (>100 ký tự + có ảnh/video = 20.000/bài)
    SELECT COALESCE(COUNT(*), 0) * 20000 INTO post_reward
    FROM posts 
    WHERE author_id = user_rec.id 
    AND LENGTH(content) > 100 
    AND (images IS NOT NULL AND array_length(images, 1) > 0 OR video_url IS NOT NULL);
    
    -- 4. Thưởng nhận like (10.000 cho 3 like đầu, 1.000 từ like 4 mỗi bài)
    -- Đếm tổng like received tracking
    SELECT 
      COALESCE(SUM(CASE WHEN rn <= 3 THEN 10000 ELSE 1000 END), 0) INTO like_reward
    FROM (
      SELECT 
        user_id,
        post_id,
        ROW_NUMBER() OVER (PARTITION BY post_id ORDER BY rewarded_at) as rn
      FROM user_reward_tracking 
      WHERE user_id = user_rec.id AND action_type LIKE 'like_received_%'
    ) sub;
    
    -- 5. Thưởng nhận comment (5.000/lần, 1 lần/user/bài)
    SELECT COALESCE(COUNT(*), 0) * 5000 INTO comment_reward
    FROM user_reward_tracking 
    WHERE user_id = user_rec.id AND action_type LIKE 'comment_received_%';
    
    -- 6. Thưởng nhận share (10.000/lần, 1 lần/user/bài)
    SELECT COALESCE(COUNT(*), 0) * 10000 INTO share_reward
    FROM user_reward_tracking 
    WHERE user_id = user_rec.id AND action_type LIKE 'share_received_%';
    
    -- 7. Thưởng kết bạn (50.000/cặp)
    SELECT COALESCE(COUNT(*), 0) * 50000 INTO friendship_reward
    FROM user_reward_tracking 
    WHERE user_id = user_rec.id AND action_type = 'friendship_bonus';
    
    -- Tổng thưởng hợp lệ
    calculated_reward := welcome_reward + wallet_reward + post_reward + like_reward + comment_reward + share_reward + friendship_reward;
    
    -- Cập nhật pending_reward
    UPDATE profiles SET pending_reward = calculated_reward WHERE id = user_rec.id;
    
    IF user_rec.old_pending != calculated_reward THEN
      RAISE NOTICE 'User %: % -> % (giảm %)', 
        user_rec.display_name, 
        user_rec.old_pending, 
        calculated_reward, 
        user_rec.old_pending - calculated_reward;
    END IF;
  END LOOP;
END $$;