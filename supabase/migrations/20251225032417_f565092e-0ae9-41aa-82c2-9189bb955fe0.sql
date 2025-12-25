-- Create table to store deleted users information
CREATE TABLE public.deleted_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  display_name text,
  wallet_address text,
  avatar_url text,
  profile_type text,
  pending_reward bigint DEFAULT 0,
  approved_reward bigint DEFAULT 0,
  camly_balance bigint DEFAULT 0,
  is_verified boolean DEFAULT false,
  banned boolean DEFAULT false,
  ban_reason text,
  created_at timestamp with time zone,
  deleted_at timestamp with time zone DEFAULT now(),
  deleted_by uuid,
  deletion_reason text DEFAULT 'Không xác minh danh tính'
);

-- Enable RLS
ALTER TABLE public.deleted_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view deleted users
CREATE POLICY "Admins can manage deleted users"
ON public.deleted_users
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create trigger function to capture user data before profile deletion
CREATE OR REPLACE FUNCTION public.capture_deleted_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Try to get email from auth.users (may not exist if already deleted)
  SELECT email INTO v_email FROM auth.users WHERE id = OLD.id;
  
  -- Insert into deleted_users
  INSERT INTO public.deleted_users (
    user_id,
    email,
    display_name,
    wallet_address,
    avatar_url,
    profile_type,
    pending_reward,
    approved_reward,
    camly_balance,
    is_verified,
    banned,
    ban_reason,
    created_at,
    deleted_at
  ) VALUES (
    OLD.id,
    v_email,
    OLD.display_name,
    OLD.wallet_address,
    OLD.avatar_url,
    OLD.profile_type::text,
    OLD.pending_reward,
    OLD.approved_reward,
    OLD.camly_balance,
    OLD.is_verified,
    OLD.banned,
    OLD.ban_reason,
    OLD.created_at,
    now()
  );
  
  RETURN OLD;
END;
$$;

-- Create trigger on profiles table
CREATE TRIGGER on_profile_deleted
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_deleted_user();

-- Create index for faster queries
CREATE INDEX idx_deleted_users_deleted_at ON public.deleted_users(deleted_at DESC);
CREATE INDEX idx_deleted_users_wallet ON public.deleted_users(wallet_address);