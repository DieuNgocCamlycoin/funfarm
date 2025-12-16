
-- Chuẩn hóa wallet address về lowercase để check nhất quán
UPDATE public.blacklisted_wallets
SET wallet_address = LOWER(wallet_address)
WHERE wallet_address != LOWER(wallet_address);

-- Update các profile wallet cũng về lowercase
UPDATE public.profiles
SET wallet_address = LOWER(wallet_address)
WHERE wallet_address IS NOT NULL AND wallet_address != LOWER(wallet_address);
