-- Ban abusive accounts for 14 days
-- chubehay (1113+ shares on single posts)
INSERT INTO public.reward_bans (user_id, reason, expires_at)
VALUES (
  'b7f37e33-a968-4dfc-99d4-c141996e1e71',
  'Share spam detected (1000+ duplicate shares). FUN FARM là nơi lan tỏa tình yêu chân thành. Tạm dừng thưởng 14 ngày.',
  now() + interval '14 days'
);

-- casemiro (627+ shares on single posts)
INSERT INTO public.reward_bans (user_id, reason, expires_at)
VALUES (
  'e71e2765-e7df-4a4e-ad0a-cfd6e43eef26',
  'Share spam detected (600+ duplicate shares). FUN FARM là nơi lan tỏa tình yêu chân thành. Tạm dừng thưởng 14 ngày.',
  now() + interval '14 days'
);

-- User with 248 shares
INSERT INTO public.reward_bans (user_id, reason, expires_at)
VALUES (
  '1a50cb2b-6488-4293-b7cd-003de2bcfa91',
  'Share spam detected (248+ duplicate shares). FUN FARM là nơi lan tỏa tình yêu chân thành. Tạm dừng thưởng 14 ngày.',
  now() + interval '14 days'
);

-- daso168loy (135 shares)
INSERT INTO public.reward_bans (user_id, reason, expires_at)
VALUES (
  'fed2fce1-138f-45db-9f86-3575b4bc910e',
  'Share spam detected (135+ duplicate shares). FUN FARM là nơi lan tỏa tình yêu chân thành. Tạm dừng thưởng 14 ngày.',
  now() + interval '14 days'
);