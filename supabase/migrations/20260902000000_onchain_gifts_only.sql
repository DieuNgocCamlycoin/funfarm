-- Only blockchain-verified transfers may be recorded or displayed as gifts.
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS chain_id INTEGER,
  ADD COLUMN IF NOT EXISTS token_address TEXT,
  ADD COLUMN IF NOT EXISTS from_wallet TEXT,
  ADD COLUMN IF NOT EXISTS to_wallet TEXT,
  ADD COLUMN IF NOT EXISTS amount_decimal NUMERIC(36, 18),
  ADD COLUMN IF NOT EXISTS amount_atomic NUMERIC(78, 0),
  ADD COLUMN IF NOT EXISTS block_number BIGINT,
  ADD COLUMN IF NOT EXISTS confirmations INTEGER,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_source TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_verified_hash
  ON public.wallet_transactions (lower(tx_hash))
  WHERE tx_hash IS NOT NULL;

DROP POLICY IF EXISTS "Users can create transactions as sender" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Transactions are viewable by everyone" ON public.wallet_transactions;

-- Even participants only see records independently verified from BSC.
CREATE POLICY "Verified onchain transactions are public"
ON public.wallet_transactions
FOR SELECT
USING (
  status = 'verified'
  AND tx_hash IS NOT NULL
  AND chain_id = 56
  AND verified_at IS NOT NULL
);

-- A sender may attach an already-verified transfer to their own gift post, but
-- cannot mutate any financial fields on the transaction.
CREATE OR REPLACE FUNCTION public.link_verified_gift_post(
  p_transaction_id UUID,
  p_post_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.wallet_transactions wt
    JOIN public.posts p ON p.id = p_post_id
    WHERE wt.id = p_transaction_id
      AND wt.sender_id = auth.uid()
      AND wt.receiver_id = p.gift_receiver_id
      AND wt.status = 'verified'
      AND wt.verified_at IS NOT NULL
      AND wt.post_id IS NULL
      AND p.author_id = auth.uid()
      AND p.post_type = 'gift'
  ) THEN
    RAISE EXCEPTION 'Invalid verified gift or post';
  END IF;

  UPDATE public.wallet_transactions
  SET post_id = p_post_id
  WHERE id = p_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.link_verified_gift_post(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_verified_gift_post(UUID, UUID) TO authenticated;

