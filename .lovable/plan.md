
# Kế Hoạch: Sửa Triệt Để Chênh Lệch Tính Thưởng V3.1

## Tóm Tắt Vấn Đề

Frontend Service và Edge Function đang tính ra kết quả **không khớp**, dẫn đến sau khi bấm "Reset All", số liệu trong DB không bằng số Frontend hiển thị.

**Ví dụ user "Hồng Thiên Hạnh":**
- DB sau reset: 1,498,000 CLC
- Frontend V3.0 tính: 3,633,000 CLC  
- Chênh lệch: **-2,135,000 CLC**

---

## Nguyên Nhân Đã Phát Hiện

### 1. Thiếu Query Limit trong Frontend Service

Hai query quan trọng trong `src/lib/rewardCalculationService.ts` thiếu `.limit(100000)`:

| Query | Dòng | Vấn đề |
|-------|------|--------|
| Posts query | 453-458 | Mặc định chỉ lấy 1000 rows |
| Profiles query | 1070-1074 | Mặc định chỉ lấy 1000 rows |

### 2. Timing/Deployment Issue

Edge Function đã được deploy với logic V3.1 mới, nhưng có thể chưa được apply đúng khi user bấm Reset.

---

## Thay Đổi Cần Thực Hiện

### File: `src/lib/rewardCalculationService.ts`

#### Sửa #1: Thêm limit cho Posts query (dòng 453-458)

```typescript
// TRƯỚC
const allPostsQuery = supabase
  .from('posts')
  .select('id, content, images, video_url, created_at, post_type')
  .eq('author_id', userId)
  .lte('created_at', cutoff)
  .order('created_at', { ascending: true });

// SAU
const allPostsQuery = supabase
  .from('posts')
  .select('id, content, images, video_url, created_at, post_type')
  .eq('author_id', userId)
  .lte('created_at', cutoff)
  .order('created_at', { ascending: true })
  .limit(100000);
```

#### Sửa #2: Thêm limit cho Profiles query (dòng 1070-1074)

```typescript
// TRƯỚC
const { data: profiles, error } = await supabase
  .from('profiles')
  .select('...')
  .eq('banned', false)
  .order('pending_reward', { ascending: false });

// SAU
const { data: profiles, error } = await supabase
  .from('profiles')
  .select('...')
  .eq('banned', false)
  .order('pending_reward', { ascending: false })
  .limit(100000);
```

---

## Quy Trình Kiểm Tra Sau Sửa

1. **Bước 1**: Deploy Frontend Service đã sửa
2. **Bước 2**: Vào Tab "Tính thưởng" → bấm "Tải dữ liệu"
3. **Bước 3**: Ghi nhận số "Tổng V3.0 tính lại"
4. **Bước 4**: Bấm "Reset All" 
5. **Bước 5**: Reload và kiểm tra "Tổng hiện tại (DB)"
6. **Bước 6**: Xác nhận 2 con số phải **BẰNG NHAU** (chênh lệch = 0)

---

## Tóm Tắt Files Cần Sửa

| File | Thay Đổi |
|------|----------|
| `src/lib/rewardCalculationService.ts` | Thêm `.limit(100000)` vào 2 queries |

---

## Kết Quả Mong Đợi

- Tổng V3.0 tính lại = Tổng hiện tại (DB) sau Reset
- Chênh lệch = **0 CLC** cho tất cả users
- Frontend và Edge Function **100% đồng bộ**
