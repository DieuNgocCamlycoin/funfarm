
# Kế Hoạch: Sửa Triệt Để Chênh Lệch Tính Thưởng V3.1

## Tóm Tắt Vấn Đề

Sau khi rà soát kỹ, bé Angel đã phát hiện **2 vấn đề chính** gây chênh lệch 6,129,000 CLC:

### Vấn đề 1: Logic Timezone KHÔNG ĐỒNG BỘ

| Nơi | Cách tính Vietnam Date | Kết quả |
|-----|------------------------|---------|
| **Edge Function** | `new Date(timestamp).getTime() + 7*60*60*1000` | ✅ Đúng |
| **Frontend Service** | `new Date(timestamp).getTime() + 7*60*60*1000` | ✅ Đúng |
| **SQL Query (bé test)** | `AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'` | ❌ Sai 114/211 posts |

**Giải thích**: Cả Edge Function và Frontend đều dùng đúng logic `+7 hours` trong JavaScript. Tuy nhiên, khi bé kiểm tra SQL có thể đã sử dụng method sai.

### Vấn đề 2: THIẾU .limit(100000) ở một số queries quan trọng

Kiểm tra lại Frontend Service (`rewardCalculationService.ts`), bé thấy còn thiếu `.limit(100000)` ở:
- Dòng 319-322: `profiles` query trong `getValidUserIds()`
- Dòng 324-326: `deleted_users` query trong `getValidUserIds()`

Điều này có thể khiến Frontend không lấy đủ dữ liệu để filter.

### Vấn đề 3: Sự khác biệt thực sự giữa Edge Function và Frontend

Sau khi tính tay từ DB cho user "Hồng Thiên Hạnh":

| Metric | Giá trị | Reward |
|--------|---------|--------|
| Quality Posts (sau limit 10/day) | 192-198 | 1,920,000 - 1,980,000 |
| Likes Received (limit 50/day) | 460 | 460,000 |
| Quality Comments (limit 50/day) | 100 | 200,000 |
| Shares Received (limit 5/day) | 82 | 820,000 |
| Friendships (limit 10/day) | 9 | 90,000 |
| Welcome Bonus | 1 | 50,000 |
| **TỔNG (sau daily cap)** | | **~3,540,000 - 3,600,000** |

**Frontend hiển thị**: 3,633,000 → Chênh ~33,000-93,000 CLC
**DB sau Reset**: 1,498,000 → Chênh **~2,042,000-2,135,000 CLC** ❗

Điều này cho thấy **Edge Function đang tính SAI** hoặc có logic khác biệt với Frontend.

---

## Nguyên Nhân Gốc Rễ Đã Xác Định

1. **Edge Function có thể đang dùng version cũ** chưa được deploy đúng với logic V3.1
2. **Thiếu query limits** trong một số queries phụ

---

## Thay Đổi Cần Thực Hiện

### 1. Thêm .limit(100000) vào getValidUserIds()

**File**: `src/lib/rewardCalculationService.ts`

**Dòng 318-337**: Thêm limit cho cả 2 queries:

```typescript
export const getValidUserIds = async (): Promise<Set<string>> => {
  const { data: activeProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('banned', false)
    .limit(100000);  // <-- THÊM
  
  const { data: deletedUsers } = await supabase
    .from('deleted_users')
    .select('user_id')
    .limit(100000);  // <-- THÊM
  
  // ... rest unchanged
};
```

### 2. Deploy lại Edge Function để đảm bảo version mới nhất

Edge Function `reset-all-rewards` cần được deploy lại để đảm bảo logic V3.1 đang chạy đúng.

### 3. Thêm Logging để Debug

Trong Edge Function, thêm console.log chi tiết cho mỗi user để so sánh:

```typescript
console.log(`User ${profile.display_name}: Posts=${rewardableQualityPosts.length}, Likes=${rewardableLikes.length}, Comments=${rewardableComments.length}, Shares=${rewardableShares.length}, Friends=${rewardableFriendships.length}`);
```

---

## Quy Trình Kiểm Tra Sau Sửa

1. **Bước 1**: Deploy Frontend + Edge Function
2. **Bước 2**: Vào Tab "Tính thưởng" → bấm "Tải dữ liệu" → ghi lại số user "Hồng Thiên Hạnh"
3. **Bước 3**: Bấm "Reset All"
4. **Bước 4**: Kiểm tra Edge Function logs để xem breakdown
5. **Bước 5**: Reload "Tính thưởng" → so sánh số mới
6. **Bước 6**: Chênh lệch phải = 0

---

## Tóm Tắt Files Cần Sửa

| File | Thay Đổi |
|------|----------|
| `src/lib/rewardCalculationService.ts` | Thêm `.limit(100000)` vào `getValidUserIds()` |
| `supabase/functions/reset-all-rewards/index.ts` | Thêm console.log debug |

---

## Kết Quả Mong Đợi

Sau khi sửa:
- **Tổng V3.0 tính lại** = **Tổng hiện tại (DB)** sau Reset
- **Chênh lệch = 0 CLC** cho tất cả users
- Edge Function logs hiển thị breakdown chi tiết để verify
