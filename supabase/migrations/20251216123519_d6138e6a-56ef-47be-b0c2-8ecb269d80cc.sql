
-- Trừ phần thưởng dư thừa (excess) từ các tài khoản đã nhận thưởng không hợp lệ
-- Tính toán dựa trên: pending_reward - (50000 signup + post rewards + tracking rewards + referral + admin bonus)

-- Angel Lắm: excess 1,513,000
UPDATE profiles SET pending_reward = pending_reward - 1513000 
WHERE id = '16917339-4189-4609-9e9f-3643355dbbff' AND pending_reward >= 1513000;

-- Thu Nguyễn: excess 1,309,000
UPDATE profiles SET pending_reward = pending_reward - 1309000 
WHERE id = '6ed85ef8-8068-46f4-b7b8-008df0982c26' AND pending_reward >= 1309000;

-- Angel Kim Ngân: excess 1,158,000
UPDATE profiles SET pending_reward = pending_reward - 1158000 
WHERE id = '6371cbde-2a59-4afa-9618-195adc67592e' AND pending_reward >= 1158000;

-- Chi vien nguyen: excess 1,072,000
UPDATE profiles SET pending_reward = pending_reward - 1072000 
WHERE id = '6054c743-fbfc-46d4-8aed-e0c622814bb4' AND pending_reward >= 1072000;

-- VU THI HUNG: excess 789,000
UPDATE profiles SET pending_reward = pending_reward - 789000 
WHERE id = '77e70f9f-89a7-4e0b-8b84-677df349ea8e' AND pending_reward >= 789000;

-- Vinh Nguyễn: excess 771,000
UPDATE profiles SET pending_reward = pending_reward - 771000 
WHERE id = 'a7242ecd-6d3b-4d98-a82e-96d8e260c206' AND pending_reward >= 771000;

-- xuyen: excess 183,000
UPDATE profiles SET pending_reward = pending_reward - 183000 
WHERE id = '55c882e7-c759-4ae3-aaae-376470cbe1e5' AND pending_reward >= 183000;

-- Liêu Thảo: excess 183,000
UPDATE profiles SET pending_reward = pending_reward - 183000 
WHERE id = '9626799f-57f0-46ae-b097-9b92d7feca35' AND pending_reward >= 183000;

-- ANGEL DIỆU NGỌC: excess 166,000
UPDATE profiles SET pending_reward = pending_reward - 166000 
WHERE id = '5b3d6d5d-2135-46f9-be27-1a824cf1d781' AND pending_reward >= 166000;

-- Angel Thiên Hạnh: excess 120,000
UPDATE profiles SET pending_reward = pending_reward - 120000 
WHERE id = '0cdf384c-21c5-43ec-9b73-9a6a43c29869' AND pending_reward >= 120000;

-- kyda: excess 80,000
UPDATE profiles SET pending_reward = pending_reward - 80000 
WHERE id = 'faaf9f49-920e-4205-a730-d775f4622c54' AND pending_reward >= 80000;

-- TRẦN VĂN LỰC: excess 76,000
UPDATE profiles SET pending_reward = pending_reward - 76000 
WHERE id = '071db3b3-2044-4f5f-bf66-811a7ff1862e' AND pending_reward >= 76000;

-- camlyfarm: excess 70,000
UPDATE profiles SET pending_reward = pending_reward - 70000 
WHERE id = '90c7f5a9-34c2-4a0e-8eeb-38d92bad9332' AND pending_reward >= 70000;

-- NGUYỄN THỊ THANH TIÊN: excess 54,000
UPDATE profiles SET pending_reward = pending_reward - 54000 
WHERE id = '8bd7cef9-d45c-4a94-a5ae-f5120d6f6589' AND pending_reward >= 54000;

-- Các tài khoản có excess 50,000 (có thể là welcome bonus bị tính thêm)
UPDATE profiles SET pending_reward = pending_reward - 50000 
WHERE id IN (
  '86aad898-52ca-4945-a647-aecdd88a8b53', -- xuyen123
  'b74c17ea-307c-404a-9380-54d201a3691e', -- chubehay
  '98fb4d9c-969e-4790-a854-1c4891703745', -- Thanh
  '4de81f57-6f70-4963-a403-15e323d031e7', -- (no name)
  '9a85f81c-03ce-47df-b718-a77c877dc194', -- (no name)
  'cf07b44c-67a1-41e6-82d7-18a8dae52211', -- (no name)
  '0553fdab-7b3f-454b-8f62-a8684d2c42f3', -- tran thi my hang
  'd7f49a20-c80d-4de1-8dd5-1ff190dac1c4', -- (no name)
  '548e632e-b4cf-473f-a0ed-3edd6e84d4bd', -- 123
  'e4956cfc-9186-4563-a661-b9c51a7074a2'  -- diu hien
) AND pending_reward >= 50000;

-- Angel Khả Nhi: excess 48,000
UPDATE profiles SET pending_reward = pending_reward - 48000 
WHERE id = '7b19530e-771f-4116-b96a-d9392afb0b31' AND pending_reward >= 48000;

-- Liên: excess 48,000
UPDATE profiles SET pending_reward = pending_reward - 48000 
WHERE id = '3123fcc6-d916-4fb8-9cf6-a92ddfcb5108' AND pending_reward >= 48000;

-- Tú Nguyễn: excess 41,000
UPDATE profiles SET pending_reward = pending_reward - 41000 
WHERE id = '879b131f-ce7c-4c7a-bef4-9bb06c5e9325' AND pending_reward >= 41000;

-- Minh Trí: excess 32,000
UPDATE profiles SET pending_reward = pending_reward - 32000 
WHERE id = '2aa86580-8bb9-49ac-aa75-967f49b5323c' AND pending_reward >= 32000;

-- Quang Vũ: excess 22,000
UPDATE profiles SET pending_reward = pending_reward - 22000 
WHERE id = 'c47b583a-edc8-4608-bb7a-871b4036017e' AND pending_reward >= 22000;

-- Angel Ái Vân: excess 20,000
UPDATE profiles SET pending_reward = pending_reward - 20000 
WHERE id = 'bdb1428a-9d7d-4cb7-8c61-c1cb9e16d59c' AND pending_reward >= 20000;
