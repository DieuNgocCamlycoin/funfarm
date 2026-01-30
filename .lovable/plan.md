

# Kế Hoạch: Tạo Trigger Tự Động Trừ Thưởng V3.1

## Tổng Quan

Dự án hiện có các trigger trừ thưởng khi:
- Xóa bài viết (`revoke_post_reward`)
- Xóa comment (`revoke_comment_reward`)
- Xóa livestream (`revoke_livestream_reward`)
- Hủy kết bạn (`revoke_friendship_reward`)

Tuy nhiên, **thiếu** trigger cho:
1. Bỏ like (unlike)
2. Xóa share
3. Trừ thưởng của người khác khi user bị ban

---

## Phần 1: Trigger Trừ Thưởng Khi Bỏ Like

### Cách hoạt động hiện tại
- Khi like: `reward_post_like()` ghi 1,000 CLC vào `pending_reward` của chủ bài viết
- `reward_logs` lưu: `user_id = post_author`, `reference_id = post_id`, `reference_user_id = người like`

### Trigger mới: `revoke_like_reward()`
- Kích hoạt: `BEFORE DELETE ON post_likes`
- Logic:
  1. Tìm reward_log có `user_id = post_author`, `reference_id = post_id`, `reference_user_id = người unlike`
  2. Đánh dấu `status = 'revoked'`
  3. Trừ `pending_reward` của chủ bài viết (không cho âm)

---

## Phần 2: Trigger Trừ Thưởng Khi Xóa Share

### Cách hoạt động hiện tại
- Khi share: `reward_post_share()` ghi 10,000 CLC vào `pending_reward` của chủ bài viết
- `reward_logs` lưu: `user_id = post_author`, `reference_id = post_id`, `reference_user_id = người share`

### Vấn đề
- Hiện tại `post_shares` **không có RLS policy DELETE** cho user (chỉ có INSERT/SELECT)
- Cần quyết định: Có cho phép user xóa share không?

### Trigger mới: `revoke_share_reward()`
- Kích hoạt: `BEFORE DELETE ON post_shares`
- Logic tương tự như unlike

---

## Phần 3: Trừ Thưởng Tương Tác Từ User Bị Ban

### Vấn đề hiện tại
- Khi ban user (`ban_user_permanently`): Chỉ reset thưởng của chính user bị ban
- Các user khác đã nhận thưởng từ tương tác của user bị ban **không bị trừ**
- Ví dụ: User A like bài của User B, B được 1k. Nếu A bị ban, B vẫn giữ 1k đó.

### Giải pháp: Cập nhật `ban_user_permanently()`
Thêm logic:
1. Tìm tất cả `reward_logs` có `reference_user_id = p_user_id` (người bị ban là nguồn tương tác)
2. Đánh dấu `status = 'revoked'`
3. Trừ `pending_reward` của các user tương ứng

### Các loại thưởng cần revoke
- Likes: Các bài viết mà user bị ban đã like
- Comments: Các bài viết mà user bị ban đã comment
- Shares: Các bài viết mà user bị ban đã share
- Friendships: Kết bạn với user bị ban (cả 2 chiều)

---

## Chi Tiết Kỹ Thuật

### Migration SQL sẽ tạo

```text
1. FUNCTION revoke_like_reward()
   ├── Kích hoạt: BEFORE DELETE ON post_likes
   ├── Input: OLD.user_id, OLD.post_id
   ├── Tìm post_author từ posts
   ├── Tìm reward_log matching
   ├── Update status = 'revoked', revoked_at = now()
   └── Trừ pending_reward của post_author

2. FUNCTION revoke_share_reward()
   ├── Kích hoạt: BEFORE DELETE ON post_shares
   ├── Logic tương tự revoke_like_reward
   └── Amount: 10,000 CLC

3. UPDATE ban_user_permanently()
   ├── Thêm: SELECT all reward_logs WHERE reference_user_id = banned_user
   ├── Revoke từng entry
   ├── Group by user_id để tính tổng cần trừ
   └── Trừ pending_reward của từng user (không cho âm)
```

### Thứ tự triển khai

| # | Bước | Mô tả |
|---|------|-------|
| 1 | Tạo `revoke_like_reward()` | Function + Trigger |
| 2 | Tạo `revoke_share_reward()` | Function + Trigger |
| 3 | Cập nhật `ban_user_permanently()` | Thêm logic revoke cho người khác |
| 4 | (Tùy chọn) Thêm RLS policy | Cho phép DELETE trên `post_shares` |

### Lưu ý quan trọng

1. **Không ảnh hưởng dữ liệu cũ**: Trigger chỉ áp dụng cho hành động tương lai
2. **An toàn dữ liệu**: Sử dụng `GREATEST(0, pending_reward - amount)` tránh số âm
3. **Audit trail**: Mọi revoke đều ghi vào `reward_logs` với `status = 'revoked'`
4. **Timezone**: Sử dụng `now()` cho `revoked_at` (UTC, nhất quán với hệ thống)

---

## Tóm Tắt Thay Đổi

| File/Resource | Hành động |
|---------------|-----------|
| SQL Migration | Tạo mới: 3 functions, 2 triggers, 1 update function |
| `post_shares` RLS | (Tùy chọn) Thêm DELETE policy |
| Frontend | Không cần thay đổi |

