
-- Thêm 4 ví vào danh sách đen vĩnh viễn
INSERT INTO public.blacklisted_wallets (wallet_address, user_id, reason, is_permanent)
VALUES 
  ('0x5f950894c63aa40b00c6b4af7898885e13a41b0f', 'ba0762c1-7c26-40c8-9320-e16b803f505f', 'Spam cày thưởng - Ăn Xanh Sống Lành', true),
  ('0xd4f18f9c71635e6b1436cea2e59b934a5764cde4', '1a50cb2b-6488-4293-b7cd-003de2bcfa91', 'Spam cày thưởng - FUN FAMER', true),
  ('0x782996be086c003427e9ccd86e163786db01aaa3', '736daf91-1e41-4f2d-bb9a-067285227205', 'Spam cày thưởng - sumilk', true),
  ('0x8189fd77016e68b40a62aa7aa173828034d0d44e', 'b7f37e33-a968-4dfc-99d4-c141996e1e71', 'Spam cày thưởng - chubehay', true)
ON CONFLICT DO NOTHING;
