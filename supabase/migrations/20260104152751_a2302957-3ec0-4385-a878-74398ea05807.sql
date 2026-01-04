-- Bảng lưu giao dịch ví (tặng tiền trong app + on-chain)
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CLC', -- CLC, BTC, USDT, BNB
  message TEXT, -- Lời nhắn yêu thương
  tx_hash TEXT, -- Hash giao dịch on-chain (nếu có)
  status TEXT NOT NULL DEFAULT 'completed', -- pending, completed, failed
  post_id UUID, -- Bài viết chúc mừng được tạo (nếu có)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own transactions"
ON public.wallet_transactions
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create transactions as sender"
ON public.wallet_transactions
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Transactions are viewable by everyone"
ON public.wallet_transactions
FOR SELECT
USING (true);

-- Index cho tìm kiếm nhanh
CREATE INDEX idx_wallet_transactions_sender ON public.wallet_transactions(sender_id);
CREATE INDEX idx_wallet_transactions_receiver ON public.wallet_transactions(receiver_id);
CREATE INDEX idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);

-- Thêm cột lưu số dư các loại coin khác vào profiles (cho tương lai)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS btc_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS usdt_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS bnb_balance NUMERIC DEFAULT 0;