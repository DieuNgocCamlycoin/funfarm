-- Reset profile for testing new registration flow
UPDATE profiles 
SET 
  display_name = NULL,
  avatar_url = NULL,
  avatar_verified = false,
  email_verified = false,
  welcome_bonus_claimed = false,
  wallet_connected = false,
  wallet_bonus_claimed = false,
  wallet_address = '',
  pending_reward = 0,
  approved_reward = 0,
  bio = NULL,
  location = NULL,
  profile_type = 'eater',
  is_verified = false,
  verification_status = 'pending'
WHERE id = '2f6b8724-1909-4f02-b110-73155392e33a';

-- Delete any reward tracking for this user
DELETE FROM user_reward_tracking WHERE user_id = '2f6b8724-1909-4f02-b110-73155392e33a';