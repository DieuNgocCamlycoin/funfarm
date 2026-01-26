-- Thêm role admin cho ANGEL DIỆU NGỌC để hiển thị Admin Dashboard
INSERT INTO public.user_roles (user_id, role)
VALUES ('5a0d6e96-07fc-45c8-85bb-665462439283', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;