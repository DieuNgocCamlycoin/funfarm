-- 1. Cập nhật role của DIỆU NGỌC thành OWNER
UPDATE public.user_roles 
SET role = 'owner' 
WHERE user_id = '5a0d6e96-07fc-45c8-85bb-665462439283' 
AND role = 'admin';

-- 2. Tạo function add_admin_role (chỉ OWNER mới gọi được)
CREATE OR REPLACE FUNCTION public.add_admin_role(
  p_owner_id uuid,
  p_target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Chỉ OWNER mới có quyền thêm admin
  IF NOT public.has_role(p_owner_id, 'owner') THEN
    RAISE EXCEPTION 'Chỉ Owner mới có quyền thêm Admin';
  END IF;
  
  -- Kiểm tra user tồn tại
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_user_id) THEN
    RAISE EXCEPTION 'User không tồn tại';
  END IF;
  
  -- Kiểm tra user đã là admin/owner chưa
  IF public.has_role(p_target_user_id, 'admin') OR public.has_role(p_target_user_id, 'owner') THEN
    RAISE EXCEPTION 'User đã có quyền admin hoặc owner';
  END IF;
  
  -- Thêm role admin cho user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN true;
END;
$$;

-- 3. Tạo function remove_admin_role (chỉ OWNER mới gọi được)
CREATE OR REPLACE FUNCTION public.remove_admin_role(
  p_owner_id uuid,
  p_target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Chỉ OWNER mới có quyền xóa admin
  IF NOT public.has_role(p_owner_id, 'owner') THEN
    RAISE EXCEPTION 'Chỉ Owner mới có quyền xóa Admin';
  END IF;
  
  -- Không cho phép xóa owner
  IF public.has_role(p_target_user_id, 'owner') THEN
    RAISE EXCEPTION 'Không thể xóa quyền của Owner';
  END IF;
  
  -- Xóa role admin
  DELETE FROM public.user_roles 
  WHERE user_id = p_target_user_id AND role = 'admin';
  
  RETURN true;
END;
$$;