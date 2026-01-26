-- =============================================
-- COMPOSITE INDEXES CHO REWARD_LOGS TABLE
-- Tối ưu performance cho 1,000+ users
-- =============================================

-- Index 1: Tối ưu check_daily_reward_cap()
-- Query pattern: WHERE user_id = ? AND created_at >= ? AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_reward_logs_user_created_active 
ON public.reward_logs (user_id, created_at DESC) 
WHERE status = 'active';

-- Index 2: Tối ưu count_likes_today_vn() và count_comments_today_vn()
-- Query pattern: WHERE user_id = ? AND reward_type = ? AND created_at >= ? AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_reward_logs_user_type_created 
ON public.reward_logs (user_id, reward_type, created_at DESC) 
WHERE status = 'active';

-- Thêm comment mô tả mục đích
COMMENT ON INDEX idx_reward_logs_user_created_active IS 
  'Composite index cho check_daily_reward_cap() - V3.1 Performance Optimization';

COMMENT ON INDEX idx_reward_logs_user_type_created IS 
  'Composite index cho count_likes/comments_today_vn() - V3.1 Performance Optimization';