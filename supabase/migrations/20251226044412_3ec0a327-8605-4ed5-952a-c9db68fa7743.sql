-- TÍNH LẠI TOÀN BỘ THƯỞNG THEO CÔNG THỨC MỚI
-- Step 1: Reset pending_reward về 0 cho tất cả users
UPDATE profiles SET pending_reward = 0;

-- Step 2: Xóa tracking cũ và tạo lại
DELETE FROM user_reward_tracking;

-- Step 3: Tính lại từng loại thưởng

-- 3.1: Thưởng chào mừng (50,000 CLC) - chỉ khi đã claim
UPDATE profiles 
SET pending_reward = pending_reward + 50000
WHERE welcome_bonus_claimed = true;

-- 3.2: Thưởng kết nối ví (50,000 CLC) - chỉ khi đã claim
UPDATE profiles 
SET pending_reward = pending_reward + 50000
WHERE wallet_bonus_claimed = true;

-- 3.3: Thưởng đăng bài chất lượng (>100 ký tự + có ảnh/video) = 20,000 CLC/bài
WITH quality_posts AS (
  SELECT author_id, COUNT(*) as post_count
  FROM posts
  WHERE LENGTH(COALESCE(content, '')) > 100
    AND ((images IS NOT NULL AND array_length(images, 1) > 0) OR video_url IS NOT NULL)
    AND post_type = 'post'
  GROUP BY author_id
)
UPDATE profiles p
SET pending_reward = p.pending_reward + (qp.post_count * 20000)
FROM quality_posts qp
WHERE p.id = qp.author_id;

-- 3.4: Thưởng nhận like (10,000 cho 3 like đầu, 1,000 từ like 4 trở đi - TÍNH THEO BÀI)
WITH post_likes_calc AS (
  SELECT 
    posts.author_id,
    posts.id as post_id,
    COUNT(DISTINCT pl.user_id) as unique_likers
  FROM posts
  JOIN post_likes pl ON pl.post_id = posts.id AND pl.user_id != posts.author_id
  GROUP BY posts.author_id, posts.id
),
author_like_rewards AS (
  SELECT 
    author_id,
    SUM(
      CASE 
        WHEN unique_likers <= 3 THEN unique_likers * 10000
        ELSE (3 * 10000) + ((unique_likers - 3) * 1000)
      END
    ) as total_like_reward
  FROM post_likes_calc
  GROUP BY author_id
)
UPDATE profiles p
SET pending_reward = p.pending_reward + alr.total_like_reward
FROM author_like_rewards alr
WHERE p.id = alr.author_id;

-- 3.5: Thưởng nhận comment (5,000 CLC/comment chất lượng >20 ký tự, 1 lần/user/bài)
WITH quality_comments AS (
  SELECT 
    posts.author_id,
    COUNT(DISTINCT (c.author_id, c.post_id)) as unique_commenters
  FROM posts
  JOIN comments c ON c.post_id = posts.id 
    AND c.author_id != posts.author_id
    AND LENGTH(c.content) > 20
  GROUP BY posts.author_id
)
UPDATE profiles p
SET pending_reward = p.pending_reward + (qc.unique_commenters * 5000)
FROM quality_comments qc
WHERE p.id = qc.author_id;

-- 3.6: Thưởng nhận share (10,000 CLC/share, 1 lần/user/bài)
WITH shares_calc AS (
  SELECT 
    posts.author_id,
    COUNT(DISTINCT (ps.user_id, ps.post_id)) as unique_sharers
  FROM posts
  JOIN post_shares ps ON ps.post_id = posts.id AND ps.user_id != posts.author_id
  GROUP BY posts.author_id
)
UPDATE profiles p
SET pending_reward = p.pending_reward + (sc.unique_sharers * 10000)
FROM shares_calc sc
WHERE p.id = sc.author_id;

-- 3.7: Thưởng kết bạn (50,000 CLC/người khi kết bạn thành công)
WITH friendships AS (
  SELECT follower_id as user_id, COUNT(*) as friend_count
  FROM followers WHERE status = 'accepted'
  GROUP BY follower_id
  UNION ALL
  SELECT following_id as user_id, COUNT(*) as friend_count
  FROM followers WHERE status = 'accepted'
  GROUP BY following_id
),
total_friendships AS (
  SELECT user_id, SUM(friend_count) as total_friends
  FROM friendships
  GROUP BY user_id
)
UPDATE profiles p
SET pending_reward = p.pending_reward + (tf.total_friends * 50000)
FROM total_friendships tf
WHERE p.id = tf.user_id;