-- Thêm cột verification_bonus_claimed để đánh dấu đã nhận thưởng xác minh
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verification_bonus_claimed BOOLEAN NOT NULL DEFAULT false;

-- Comment giải thích
COMMENT ON COLUMN profiles.verification_bonus_claimed IS 'Đánh dấu đã nhận thưởng xác minh danh tính (email + avatar + tên + Luật Ánh Sáng) - chỉ 1 lần';