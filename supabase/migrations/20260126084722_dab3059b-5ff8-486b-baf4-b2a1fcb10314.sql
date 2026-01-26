-- Tạo bảng backup trước khi reset (Safety-First Protocol)
CREATE TABLE IF NOT EXISTS reward_backup_20260126 AS
SELECT 
  id,
  display_name,
  pending_reward,
  approved_reward,
  camly_balance,
  welcome_bonus_claimed,
  wallet_bonus_claimed,
  verification_bonus_claimed,
  NOW() as backup_at
FROM profiles
WHERE banned = false;

-- Tạo index để query nhanh hơn
CREATE INDEX IF NOT EXISTS idx_reward_backup_20260126_id ON reward_backup_20260126(id);