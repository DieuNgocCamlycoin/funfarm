-- Thêm các cột cho hệ thống xác minh tài khoản
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS avatar_verified boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS wallet_bonus_claimed boolean NOT NULL DEFAULT false;

-- Thêm comment giải thích
COMMENT ON COLUMN public.profiles.email_verified IS 'Email đã xác minh qua OTP';
COMMENT ON COLUMN public.profiles.avatar_verified IS 'Avatar đã được AI kiểm tra là ảnh thật';
COMMENT ON COLUMN public.profiles.verification_status IS 'pending | verified | rejected';
COMMENT ON COLUMN public.profiles.verified_at IS 'Thời điểm xác minh thành công';
COMMENT ON COLUMN public.profiles.wallet_bonus_claimed IS 'Đã nhận thưởng kết nối ví chưa';

-- Cập nhật is_verified dựa trên email_verified và avatar_verified
CREATE OR REPLACE FUNCTION public.update_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Nếu cả email và avatar đều verified → is_verified = true
  IF NEW.email_verified = true AND NEW.avatar_verified = true THEN
    NEW.is_verified := true;
    NEW.verification_status := 'verified';
    NEW.verified_at := COALESCE(NEW.verified_at, now());
  ELSE
    NEW.is_verified := false;
    IF NEW.verification_status != 'rejected' THEN
      NEW.verification_status := 'pending';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger để tự động cập nhật verification status
DROP TRIGGER IF EXISTS trigger_update_verification ON public.profiles;
CREATE TRIGGER trigger_update_verification
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_verification_status();

-- Function thưởng khi kết nối ví lần đầu (50.000 CLC)
CREATE OR REPLACE FUNCTION public.reward_wallet_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Chỉ thưởng khi:
  -- 1. wallet_connected chuyển từ false → true
  -- 2. Chưa nhận thưởng wallet trước đó
  -- 3. wallet_address không trống và không duplicate
  IF NEW.wallet_connected = true 
     AND (OLD.wallet_connected = false OR OLD.wallet_connected IS NULL)
     AND NEW.wallet_bonus_claimed = false 
     AND NEW.wallet_address IS NOT NULL 
     AND NEW.wallet_address != '' THEN
    
    -- Kiểm tra wallet không bị duplicate (đã dùng bởi user khác)
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE wallet_address = NEW.wallet_address 
      AND id != NEW.id 
      AND wallet_bonus_claimed = true
    ) THEN
      -- Thưởng 50.000 CLC vào pending_reward
      NEW.pending_reward := COALESCE(NEW.pending_reward, 0) + 50000;
      NEW.wallet_bonus_claimed := true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger thưởng kết nối ví
DROP TRIGGER IF EXISTS trigger_reward_wallet ON public.profiles;
CREATE TRIGGER trigger_reward_wallet
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_wallet_connection();