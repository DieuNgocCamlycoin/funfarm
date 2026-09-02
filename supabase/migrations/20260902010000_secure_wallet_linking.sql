CREATE TABLE IF NOT EXISTS public.wallet_link_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_wallet text NOT NULL,
  message text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_link_challenges ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_wallet_link_challenges_user_created
  ON public.wallet_link_challenges (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wallet_link_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.wallet_link_challenges(id),
  previous_wallet text,
  new_wallet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_link_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.complete_verified_wallet_link(
  p_challenge_id uuid,
  p_user_id uuid,
  p_wallet text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_wallet text;
  v_wallet text := lower(p_wallet);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(v_wallet));

  IF NOT EXISTS (
    SELECT 1 FROM public.wallet_link_challenges
    WHERE id = p_challenge_id
      AND user_id = p_user_id
      AND lower(requested_wallet) = v_wallet
      AND used_at IS NULL
      AND expires_at > now()
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'Wallet link challenge is invalid or expired';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(wallet_address) = v_wallet AND id <> p_user_id
  ) THEN
    RAISE EXCEPTION 'Wallet is already linked to another account';
  END IF;

  SELECT wallet_address INTO v_previous_wallet
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  UPDATE public.profiles
  SET wallet_address = v_wallet, wallet_connected = true, updated_at = now()
  WHERE id = p_user_id;

  UPDATE public.wallet_link_challenges
  SET used_at = now()
  WHERE id = p_challenge_id;

  INSERT INTO public.wallet_link_events (user_id, challenge_id, previous_wallet, new_wallet)
  VALUES (p_user_id, p_challenge_id, v_previous_wallet, v_wallet);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_verified_wallet_link(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_verified_wallet_link(uuid, uuid, text) TO service_role;

