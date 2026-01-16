-- Thêm admin role cho Angel Khả Nhi
INSERT INTO public.user_roles (user_id, role)
VALUES ('35fd40e2-6ec6-4d2d-8714-9d6506cac8a5', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Thêm role 'user' để đảm bảo tính nhất quán
INSERT INTO public.user_roles (user_id, role)
VALUES ('35fd40e2-6ec6-4d2d-8714-9d6506cac8a5', 'user')
ON CONFLICT (user_id, role) DO NOTHING;