-- Cấm vĩnh viễn 4 tài khoản spam (100 năm)
-- TOP 1: Ăn Xanh Sống Lành
INSERT INTO public.reward_bans (user_id, reason, expires_at)
VALUES ('ba0762c1-7c26-40c8-9320-e16b803f505f', 'Cấm vĩnh viễn - Spam cày thưởng', now() + interval '36500 days')
ON CONFLICT DO NOTHING;

-- TOP 2: FUN FAMER (tài khoản không có display_name)
INSERT INTO public.reward_bans (user_id, reason, expires_at)
VALUES ('1a50cb2b-6488-4293-b7cd-003de2bcfa91', 'Cấm vĩnh viễn - Spam cày thưởng', now() + interval '36500 days')
ON CONFLICT DO NOTHING;

-- TOP 5: sumilk
INSERT INTO public.reward_bans (user_id, reason, expires_at)
VALUES ('736daf91-1e41-4f2d-bb9a-067285227205', 'Cấm vĩnh viễn - Spam cày thưởng', now() + interval '36500 days')
ON CONFLICT DO NOTHING;

-- TOP 6: chubehay
INSERT INTO public.reward_bans (user_id, reason, expires_at)
VALUES ('b7f37e33-a968-4dfc-99d4-c141996e1e71', 'Cấm vĩnh viễn - Spam cày thưởng', now() + interval '36500 days')
ON CONFLICT DO NOTHING;

-- Reset toàn bộ phần thưởng của các tài khoản này về 0
UPDATE public.profiles 
SET pending_reward = 0, camly_balance = 0, violation_level = 3, last_violation_at = now(), is_good_heart = false
WHERE id IN (
  'ba0762c1-7c26-40c8-9320-e16b803f505f',
  '1a50cb2b-6488-4293-b7cd-003de2bcfa91',
  '736daf91-1e41-4f2d-bb9a-067285227205',
  'b7f37e33-a968-4dfc-99d4-c141996e1e71'
);