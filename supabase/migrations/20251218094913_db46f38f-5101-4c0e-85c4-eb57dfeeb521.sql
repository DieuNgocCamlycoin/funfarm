-- Add banned columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS banned_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS ban_reason text;

-- Update RLS policy to block banned users from updating their profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id AND banned = false);

-- Create function to check if user is banned
CREATE OR REPLACE FUNCTION public.is_user_banned(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT banned FROM public.profiles WHERE id = p_user_id),
    false
  );
$$;

-- Function to permanently ban a user (for admin use)
CREATE OR REPLACE FUNCTION public.ban_user_permanently(
  p_admin_id uuid,
  p_user_id uuid,
  p_reason text DEFAULT 'Lạm dụng hệ thống'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet text;
BEGIN
  -- Check if admin
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can ban users';
  END IF;
  
  -- Get user wallet
  SELECT wallet_address INTO v_wallet FROM public.profiles WHERE id = p_user_id;
  
  -- Update profile to banned
  UPDATE public.profiles
  SET 
    banned = true,
    banned_at = now(),
    ban_reason = p_reason,
    violation_level = 3,
    is_good_heart = false,
    good_heart_since = NULL,
    pending_reward = 0,
    approved_reward = 0
  WHERE id = p_user_id;
  
  -- Add to blacklisted wallets if wallet exists
  IF v_wallet IS NOT NULL AND v_wallet != '' THEN
    INSERT INTO public.blacklisted_wallets (wallet_address, reason, is_permanent, user_id)
    VALUES (v_wallet, p_reason, true, p_user_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Create permanent reward ban (100 years)
  INSERT INTO public.reward_bans (user_id, reason, expires_at)
  VALUES (p_user_id, p_reason, now() + interval '100 years')
  ON CONFLICT DO NOTHING;
  
  -- Send notification
  INSERT INTO public.notifications (user_id, type, content)
  VALUES (p_user_id, 'account_banned', 'Tài khoản của bạn đã bị khóa vĩnh viễn vì: ' || p_reason);
  
  RETURN true;
END;
$$;