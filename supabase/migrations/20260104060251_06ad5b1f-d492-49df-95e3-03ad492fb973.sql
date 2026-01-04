-- Cập nhật blockchain_cache với số liệu chính xác từ BSC
UPDATE blockchain_cache 
SET 
  total_claimed = 28986000,
  total_wallets = 23,
  total_transactions = 74,
  last_updated_at = now()
WHERE id = 'camly_claims';