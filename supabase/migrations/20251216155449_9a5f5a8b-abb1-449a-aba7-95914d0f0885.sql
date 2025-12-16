-- Add approved_reward column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_reward bigint NOT NULL DEFAULT 0;

-- Create reward_approvals table to track approval history
CREATE TABLE IF NOT EXISTS public.reward_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  admin_id uuid,
  admin_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.reward_approvals ENABLE ROW LEVEL SECURITY;

-- RLS policies for reward_approvals
CREATE POLICY "Admins can manage reward approvals"
  ON public.reward_approvals FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own reward approvals"
  ON public.reward_approvals FOR SELECT
  USING (auth.uid() = user_id);

-- Create function to approve rewards
CREATE OR REPLACE FUNCTION public.approve_user_reward(
  p_user_id uuid,
  p_admin_id uuid,
  p_note text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_amount bigint;
BEGIN
  -- Get pending reward
  SELECT pending_reward INTO v_pending_amount 
  FROM public.profiles WHERE id = p_user_id;
  
  IF v_pending_amount IS NULL OR v_pending_amount <= 0 THEN
    RAISE EXCEPTION 'No pending reward to approve';
  END IF;
  
  -- Move from pending to approved
  UPDATE public.profiles
  SET 
    pending_reward = 0,
    approved_reward = approved_reward + v_pending_amount
  WHERE id = p_user_id;
  
  -- Record approval
  INSERT INTO public.reward_approvals (user_id, amount, status, admin_id, admin_note, reviewed_at)
  VALUES (p_user_id, v_pending_amount, 'approved', p_admin_id, p_note, now());
  
  RETURN v_pending_amount;
END;
$$;

-- Create function to reject rewards
CREATE OR REPLACE FUNCTION public.reject_user_reward(
  p_user_id uuid,
  p_admin_id uuid,
  p_note text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_amount bigint;
BEGIN
  -- Get pending reward
  SELECT pending_reward INTO v_pending_amount 
  FROM public.profiles WHERE id = p_user_id;
  
  IF v_pending_amount IS NULL OR v_pending_amount <= 0 THEN
    RAISE EXCEPTION 'No pending reward to reject';
  END IF;
  
  -- Reset pending reward to 0 (reject)
  UPDATE public.profiles
  SET pending_reward = 0
  WHERE id = p_user_id;
  
  -- Record rejection
  INSERT INTO public.reward_approvals (user_id, amount, status, admin_id, admin_note, reviewed_at)
  VALUES (p_user_id, v_pending_amount, 'rejected', p_admin_id, p_note, now());
  
  RETURN v_pending_amount;
END;
$$;