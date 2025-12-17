-- Sửa lại pending_reward cho users đã kết nối ví nhưng bị thưởng sai (150,000 → 100,000)
UPDATE profiles 
SET pending_reward = 100000
WHERE wallet_connected = true 
  AND wallet_bonus_claimed = true 
  AND pending_reward = 150000;

-- Thông báo kết quả
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Updated % users with incorrect reward', affected_count;
END $$;