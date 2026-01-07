-- =====================================================
-- PHASE 1: MERGE SYSTEM FOR FUN FARM ↔ FUN PROFILE
-- =====================================================

-- 1.1 Thêm cột mapping vào bảng profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fun_profile_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_merged BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS merge_request_id UUID;

-- Thêm cột email nếu chưa có
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'profiles' 
                 AND column_name = 'email') THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Index cho query hiệu quả
CREATE INDEX IF NOT EXISTS idx_profiles_fun_profile_id ON public.profiles(fun_profile_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_merged ON public.profiles(is_merged);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 1.2 Tạo bảng merge_request_logs
CREATE TABLE IF NOT EXISTS public.merge_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  request_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected', 'conflict')),
  fun_profile_id UUID,
  profile_data JSONB,
  webhook_received_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS cho merge_request_logs
ALTER TABLE public.merge_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage merge logs" ON public.merge_request_logs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own merge logs" ON public.merge_request_logs
  FOR SELECT USING (auth.uid() = user_id);

-- 1.3 Tạo bảng merge_conflicts
CREATE TABLE IF NOT EXISTS public.merge_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  conflicting_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  conflicting_user_email TEXT,
  fun_profile_id UUID NOT NULL,
  fun_id TEXT,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN (
    'duplicate_fun_profile_id',
    'duplicate_fun_id', 
    'duplicate_email'
  )),
  conflict_details JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_action TEXT CHECK (resolution_action IN (
    'keep_existing', 'replace_existing', 'manual_merge', 'dismissed'
  )),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS cho merge_conflicts
ALTER TABLE public.merge_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage conflicts" ON public.merge_conflicts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own conflicts" ON public.merge_conflicts
  FOR SELECT USING (auth.uid() = user_id);

-- Index cho merge_conflicts
CREATE INDEX IF NOT EXISTS idx_merge_conflicts_resolved ON public.merge_conflicts(resolved);
CREATE INDEX IF NOT EXISTS idx_merge_conflicts_fun_profile_id ON public.merge_conflicts(fun_profile_id);

-- 1.4 Cập nhật trigger handle_new_user để lưu email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, wallet_address, email)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'wallet_address', ''),
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN new;
END;
$$;