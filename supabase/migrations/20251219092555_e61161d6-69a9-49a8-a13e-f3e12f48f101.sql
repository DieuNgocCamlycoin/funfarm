-- Reset profile happycamlycoin1111@gmail.com để test lại
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
WHERE id = '2f6b8724-1909-4f02-b110-73155392e33a';

DELETE FROM user_reward_tracking WHERE user_id = '2f6b8724-1909-4f02-b110-73155392e33a';