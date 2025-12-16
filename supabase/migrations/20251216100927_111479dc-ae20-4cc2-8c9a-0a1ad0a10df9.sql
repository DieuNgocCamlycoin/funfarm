
-- Ban rewards for unverified accounts
INSERT INTO public.reward_bans (user_id, reason, expires_at)
VALUES 
  -- Ăn Xanh Sống Lành
  ('ba0762c1-7c26-40c8-9320-e16b803f505f', 'Chưa xác minh danh tính - tạm khóa thưởng', now() + interval '365 days'),
  -- chubehay (account 1)
  ('b74c17ea-307c-404a-9380-54d201a3691e', 'Chưa xác minh danh tính - tạm khóa thưởng', now() + interval '365 days'),
  -- chubehay (account 2)
  ('b7f37e33-a968-4dfc-99d4-c141996e1e71', 'Chưa xác minh danh tính - tạm khóa thưởng', now() + interval '365 days')
ON CONFLICT DO NOTHING;
