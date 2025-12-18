-- Tạo bảng cache blockchain data
CREATE TABLE IF NOT EXISTS public.blockchain_cache (
  id TEXT PRIMARY KEY DEFAULT 'camly_claims',
  total_claimed DECIMAL DEFAULT 0,
  total_wallets INTEGER DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  wallets_with_names INTEGER DEFAULT 0,
  aggregated_data JSONB DEFAULT '{}',
  transfers_sample JSONB DEFAULT '[]',
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default record
INSERT INTO public.blockchain_cache (id, total_claimed, total_wallets, total_transactions, wallets_with_names, aggregated_data, transfers_sample)
VALUES ('camly_claims', 28986000, 23, 74, 23, '{}', '[]')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.blockchain_cache ENABLE ROW LEVEL SECURITY;

-- Policy cho phép read cho tất cả authenticated users
CREATE POLICY "Allow read blockchain cache" ON public.blockchain_cache
FOR SELECT USING (true);

-- Policy cho phép admin update
CREATE POLICY "Allow admin update blockchain cache" ON public.blockchain_cache
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);