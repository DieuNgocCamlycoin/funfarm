
-- ============================================
-- CLEANUP DATA FROM DELETED USERS
-- ============================================

-- 1. Delete all post_likes from deleted users
DELETE FROM public.post_likes 
WHERE user_id IN (SELECT user_id FROM public.deleted_users);

-- 2. Delete all post_shares from deleted users
DELETE FROM public.post_shares 
WHERE user_id IN (SELECT user_id FROM public.deleted_users);

-- 3. Delete all comments from deleted users
DELETE FROM public.comments 
WHERE author_id IN (SELECT user_id FROM public.deleted_users);

-- 4. Delete all posts from deleted users
DELETE FROM public.posts 
WHERE author_id IN (SELECT user_id FROM public.deleted_users);

-- 5. Delete all notifications related to deleted users
DELETE FROM public.notifications 
WHERE user_id IN (SELECT user_id FROM public.deleted_users)
   OR from_user_id IN (SELECT user_id FROM public.deleted_users);

-- 6. Delete all followers/friendships involving deleted users
DELETE FROM public.followers 
WHERE follower_id IN (SELECT user_id FROM public.deleted_users)
   OR following_id IN (SELECT user_id FROM public.deleted_users);

-- 7. Delete all reward tracking from deleted users
DELETE FROM public.user_reward_tracking 
WHERE user_id IN (SELECT user_id FROM public.deleted_users);

-- 8. Delete all bonus requests from deleted users
DELETE FROM public.bonus_requests 
WHERE user_id IN (SELECT user_id FROM public.deleted_users);

-- 9. Delete all reward approvals from deleted users
DELETE FROM public.reward_approvals 
WHERE user_id IN (SELECT user_id FROM public.deleted_users);

-- 10. Delete all reward bans from deleted users
DELETE FROM public.reward_bans 
WHERE user_id IN (SELECT user_id FROM public.deleted_users);

-- 11. Delete all user violations from deleted users
DELETE FROM public.user_violations 
WHERE user_id IN (SELECT user_id FROM public.deleted_users);

-- 12. Delete all user roles from deleted users
DELETE FROM public.user_roles 
WHERE user_id IN (SELECT user_id FROM public.deleted_users);

-- 13. Delete all reports from/about deleted users
DELETE FROM public.reports 
WHERE reporter_id IN (SELECT user_id FROM public.deleted_users)
   OR reported_user_id IN (SELECT user_id FROM public.deleted_users);

-- 14. Update likes_count, comments_count, shares_count on all posts
-- (recalculate based on remaining valid data)
UPDATE public.posts p
SET likes_count = (SELECT COUNT(*) FROM public.post_likes WHERE post_id = p.id),
    comments_count = (SELECT COUNT(*) FROM public.comments WHERE post_id = p.id),
    shares_count = (SELECT COUNT(*) FROM public.post_shares WHERE post_id = p.id);

-- 15. Clean up reward tracking entries that reference deleted users
-- (e.g., 'like_received_<deleted_user_id>')
DELETE FROM public.user_reward_tracking 
WHERE action_type LIKE 'like_received_%' 
  AND SPLIT_PART(action_type, '_', 3)::uuid IN (SELECT user_id FROM public.deleted_users);

DELETE FROM public.user_reward_tracking 
WHERE action_type LIKE 'comment_received_%' 
  AND SPLIT_PART(action_type, '_', 3)::uuid IN (SELECT user_id FROM public.deleted_users);

DELETE FROM public.user_reward_tracking 
WHERE action_type LIKE 'share_received_%' 
  AND SPLIT_PART(action_type, '_', 3)::uuid IN (SELECT user_id FROM public.deleted_users);

-- 16. Clean up friendship reward tracking that references deleted users
DELETE FROM public.user_reward_tracking 
WHERE action_type = 'friendship_accepted'
  AND post_id IN (SELECT user_id FROM public.deleted_users);
