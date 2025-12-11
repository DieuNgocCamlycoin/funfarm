-- Add validation to add_camly_reward function to prevent abuse
-- Even if exposed via RPC, this limits potential damage

CREATE OR REPLACE FUNCTION public.add_camly_reward(user_id uuid, amount bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate amount is positive and within reasonable bounds
  IF amount IS NULL OR amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be a positive number';
  END IF;
  
  IF amount > 100000 THEN
    RAISE EXCEPTION 'Amount exceeds maximum allowed reward per action';
  END IF;
  
  -- Validate user_id exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    RAISE EXCEPTION 'User profile does not exist';
  END IF;

  UPDATE public.profiles
  SET pending_reward = pending_reward + amount
  WHERE id = user_id;
END;
$$;