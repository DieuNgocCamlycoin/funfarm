-- Insert deleted users data from recent auth logs (before trigger was created)
INSERT INTO public.deleted_users (user_id, email, deletion_reason, deleted_at) VALUES
  ('e71e2765-e7df-4a4e-ad0a-cfd6e43eef26', 'martajmhhd14@gmail.com', 'Không xác minh danh tính', '2025-12-25T03:21:57Z'),
  ('c54a4a1a-1364-4def-9790-84e3d31c8f5c', 'lyvu6767686875@gmail.com', 'Không xác minh danh tính', '2025-12-25T03:21:27Z'),
  ('3312ace2-bf0e-41fe-9bbd-d80b3678dda3', 'luudung1717@gmail.com', 'Không xác minh danh tính', '2025-12-25T03:21:01Z'),
  ('e84ffb04-dd9c-4b0a-8023-c08006f6ea5b', 'lequangvu2210.hue@gmail.com', 'Không xác minh danh tính', '2025-12-25T03:17:49Z'),
  ('476d3687-919f-443f-9c00-946529a8b8b3', 'leminhtri130995@gmail.com', 'Không xác minh danh tính', '2025-12-25T03:16:55Z'),
  ('5e345b1a-6cfa-4a32-bdab-e085a3ed41a6', 'leminhtri.camlycoin@gmail.com', 'Không xác minh danh tính', '2025-12-25T03:16:14Z'),
  ('faaf9f49-920e-4205-a730-d775f4622c54', 'kyda123@gmail.com', 'Không xác minh danh tính', '2025-12-25T03:15:00Z'),
  ('de424873-a530-4309-b171-ba00c82a757a', 'kimngan020214@gmail.com', 'Không xác minh danh tính', '2025-12-25T03:14:30Z')
ON CONFLICT DO NOTHING;