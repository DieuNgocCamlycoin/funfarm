-- Bỏ ràng buộc UNIQUE trên wallet_address để cho phép nhiều tài khoản dùng chung một ví
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_wallet_address_key;