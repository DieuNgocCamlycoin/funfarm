-- Update approve_user_reward to send notification
CREATE OR REPLACE FUNCTION public.approve_user_reward(p_user_id uuid, p_admin_id uuid, p_note text DEFAULT NULL::text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Send notification to user
  INSERT INTO public.notifications (user_id, type, from_user_id, content)
  VALUES (
    p_user_id,
    'reward_approved',
    p_admin_id,
    'Phước lành đã duyệt! ' || v_pending_amount::text || ' CAMLY đang chờ bạn rút về ví nhé ❤️'
  );
  
  RETURN v_pending_amount;
END;
$$;

-- Update reject_user_reward to send notification
CREATE OR REPLACE FUNCTION public.reject_user_reward(p_user_id uuid, p_admin_id uuid, p_note text DEFAULT NULL::text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Send notification to user
  INSERT INTO public.notifications (user_id, type, from_user_id, content)
  VALUES (
    p_user_id,
    'reward_rejected',
    p_admin_id,
    'Hành động chưa đạt chất lượng từ tâm, lần sau cố lên nhé! 💪'
  );
  
  RETURN v_pending_amount;
END;
$$;