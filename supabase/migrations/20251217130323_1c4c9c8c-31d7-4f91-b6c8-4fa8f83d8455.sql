-- Tính lại pending_reward cho tất cả users dựa trên công thức đúng
-- KHÔNG TÍNH approved_reward vì đã được admin duyệt

-- Bước 1: Reset pending_reward về 0
UPDATE profiles SET pending_reward = 0;

-- Bước 2: Cộng bonus đăng ký (50,000 CLC cho tất cả users)
UPDATE profiles SET pending_reward = pending_reward + 50000;

-- Bước 3: Cộng bonus kết nối ví (50,000 CLC cho users đã kết nối ví)
UPDATE profiles SET pending_reward = pending_reward + 50000
WHERE wallet_connected = true AND wallet_address IS NOT NULL AND wallet_address != '';

-- Bước 4: Cộng thưởng đăng bài (20,000 CLC/bài chất lượng - có hình hoặc >50 ký tự)
UPDATE profiles p SET pending_reward = pending_reward + (
  SELECT COALESCE(COUNT(*) * 20000, 0)
  FROM posts 
  WHERE author_id = p.id 
  AND (
    (images IS NOT NULL AND array_length(images, 1) > 0) 
    OR video_url IS NOT NULL 
    OR LENGTH(content) > 50
  )
);

-- Bước 5: Cộng thưởng like (10,000 CLC cho mỗi bài được like lần đầu, tối đa 50 likes/ngày đã được giới hạn bởi trigger)
-- Đếm số bài đã like (unique post_id) từ user_reward_tracking
UPDATE profiles p SET pending_reward = pending_reward + (
  SELECT COALESCE(COUNT(DISTINCT post_id) * 10000, 0)
  FROM user_reward_tracking
  WHERE user_id = p.id AND action_type = 'like_given'
);

-- Bước 6: Cộng thưởng comment (5,000 CLC cho mỗi bài đã comment)
UPDATE profiles p SET pending_reward = pending_reward + (
  SELECT COALESCE(COUNT(DISTINCT post_id) * 5000, 0)
  FROM user_reward_tracking
  WHERE user_id = p.id AND action_type = 'comment'
);

-- Bước 7: Cộng thưởng share (10,000 CLC cho mỗi bài đã share, tối đa như đã tracking)
UPDATE profiles p SET pending_reward = pending_reward + (
  SELECT COALESCE(COUNT(DISTINCT post_id) * 10000, 0)
  FROM user_reward_tracking
  WHERE user_id = p.id AND action_type = 'share'
);

-- Bước 8: Cộng thưởng kết bạn (10,000 CLC cho mỗi friendship đã accept)
UPDATE profiles p SET pending_reward = pending_reward + (
  SELECT COALESCE(COUNT(*) * 10000, 0)
  FROM user_reward_tracking
  WHERE user_id = p.id AND action_type = 'friendship_bonus'
);

-- Bước 9: Cộng thưởng like nhận được (tính từ tracking - 10,000 cho 3 like đầu, 1,000 cho like tiếp theo)
-- Đơn giản hóa: đếm số action_type LIKE 'like_received_%' và tính
UPDATE profiles p SET pending_reward = pending_reward + (
  SELECT COALESCE(
    CASE 
      WHEN COUNT(*) <= 3 THEN COUNT(*) * 10000
      ELSE 30000 + (COUNT(*) - 3) * 1000
    END, 0
  )
  FROM user_reward_tracking
  WHERE user_id = p.id AND action_type LIKE 'like_received_%'
);

-- Bước 10: Cộng thưởng share nhận được (10,000 CLC cho bài được share lần đầu)
UPDATE profiles p SET pending_reward = pending_reward + (
  SELECT COALESCE(COUNT(*) * 10000, 0)
  FROM user_reward_tracking
  WHERE user_id = p.id AND action_type = 'share_received'
);

-- Trừ đi approved_reward vì phần đó đã được chuyển sang camly_balance hoặc đã duyệt
UPDATE profiles SET pending_reward = GREATEST(pending_reward - approved_reward, 0)
WHERE approved_reward > 0;