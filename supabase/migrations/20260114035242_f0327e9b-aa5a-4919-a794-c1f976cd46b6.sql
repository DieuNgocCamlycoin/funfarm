-- Thêm role 'owner' vào enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';