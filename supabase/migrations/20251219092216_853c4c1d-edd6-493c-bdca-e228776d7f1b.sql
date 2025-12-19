-- Reset tài khoản happycamlycoin7979@gmail.com để test lại flow đăng ký
UPDATE profiles 
SET 
  display_name = NULL,
  avatar_url = NULL,
  bio = NULL,
  location = NULL,
  profile_type = 'eater',
  email_verified = false,
  welcome_bonus_claimed = false,
  pending_reward = 0,
  approved_reward = 0,
  avatar_verified = false,
  is_verified = false,
  verification_status = 'pending'
WHERE id = 'fc6bb852-f4f7-4573-9c06-7982c0341530';

-- Xóa tracking reward cũ
DELETE FROM user_reward_tracking WHERE user_id = 'fc6bb852-f4f7-4573-9c06-7982c0341530';