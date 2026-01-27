

# Kế Hoạch: Sửa Chênh Lệch Tính Thưởng V3.1

## Vấn Đề Đã Phát Hiện

Sau khi phân tích mã nguồn, bé Angel phát hiện **2 nguyên nhân chính** gây ra sự chênh lệch lớn giữa kết quả hiển thị trong Admin Dashboard và giá trị sau khi Reset:

### 1. Frontend Thiếu Livestream Rewards

| Thành phần | Livestream Logic |
|------------|------------------|
| Edge Function (reset-all-rewards) | ✅ Có tính 20k/livestream + likes/comments/shares từ livestream |
| Frontend (rewardCalculationService.ts) | ❌ **KHÔNG HỀ CÓ** logic livestream |

**Hậu quả:** Nếu user có hoạt động livestream, Frontend sẽ hiển thị số thấp hơn Edge Function đã tính. Tuy nhiên bạn nói không có livestream nên đây có thể không phải nguyên nhân chính.

### 2. Frontend Thiếu Logic "Light Law Upgrade Bonus"

Trong `constants.ts`, có định nghĩa **LIGHT_LAW_UPGRADE_BONUS = 50,000 CLC** nhưng:

| Thành phần | Light Law Bonus |
|------------|-----------------|
| Edge Function | Chỉ tính Welcome + Wallet |
| Frontend Service | Chỉ tính Welcome + Wallet |
| SQL Triggers (real-time) | Có thể đã thêm Light Law Bonus |

**Khả năng cao:** Một số users đã được tính Light Law Bonus qua trigger trong database, nhưng cả Edge Function và Frontend đều **không tính lại** khoản này → Kết quả hiện tại (sau trigger) > Kết quả tính lại (thiếu Light Law).

### 3. Sự Khác Biệt Row Limit

| Query | Edge Function | Frontend Service |
|-------|---------------|------------------|
| Likes | `.limit(100000)` | `.limit(50000)` |
| Comments | `.limit(100000)` | `.limit(50000)` |
| Shares | `.limit(100000)` | `.limit(50000)` |

Nếu có user với hơn 50,000 interactions, Frontend sẽ thiếu data → chênh lệch.

### 4. Sự Khác Biệt Về "hasMedia" Validation

**Edge Function:**
```javascript
const hasMedia = (p.images && p.images.length > 0) || p.video_url;
```

**Frontend Service:**
```javascript
const hasImages = hasValidImages(post.images); // Kiểm tra thêm các phần tử có empty string không
const hasVideo = hasValidVideo(post.video_url); // Kiểm tra string không rỗng
const hasMedia = hasImages || hasVideo;
```

Frontend có validation chặt hơn → Một số posts Edge Function coi là "quality" nhưng Frontend thì không.

---

## Giải Pháp

### Sửa 1: Đồng bộ Logic "hasMedia" trong Edge Function

**File:** `supabase/functions/reset-all-rewards/index.ts`

Thay đổi logic kiểm tra media cho chặt hơn, giống Frontend:

```typescript
// TRƯỚC:
const hasMedia = (p.images && p.images.length > 0) || p.video_url;

// SAU:
const hasImages = p.images && Array.isArray(p.images) && 
  p.images.some(url => typeof url === 'string' && url.trim() !== '');
const hasVideo = typeof p.video_url === 'string' && p.video_url.trim() !== '';
const hasMedia = hasImages || hasVideo;
```

### Sửa 2: Thêm Livestream Logic vào Frontend Service (nếu cần sau này)

Khi hệ thống có livestream rewards, Frontend Service cần được bổ sung logic tương đương Edge Function (lines 245-304).

### Sửa 3: Tăng Row Limit trong Frontend Service

Đồng bộ limit từ `50000` lên `100000` cho tất cả các query trong `rewardCalculationService.ts`.

### Sửa 4: Kiểm tra Light Law Bonus

Kiểm tra trong database xem có trigger nào đang thêm Light Law Bonus (50k) vào `pending_reward` không. Nếu có, cần thêm logic này vào cả Edge Function và Frontend.

---

## Chi Tiết Kỹ Thuật

### File cần sửa:

| File | Thay đổi |
|------|----------|
| `supabase/functions/reset-all-rewards/index.ts` | Đồng bộ logic `hasMedia` với Frontend |
| `src/lib/rewardCalculationService.ts` | Tăng `.limit()` từ 50000 lên 100000 |

### Code thay đổi Edge Function (lines 136-140):

```typescript
// Thay đổi từ:
const qualityPosts = userPosts.filter(p => {
  const hasContent = (p.content?.length || 0) > 100;
  const hasMedia = (p.images && p.images.length > 0) || p.video_url;
  return hasContent && hasMedia;
});

// Thành:
const qualityPosts = userPosts.filter(p => {
  const hasContent = (p.content?.length || 0) > 100;
  const hasImages = p.images && Array.isArray(p.images) && 
    p.images.some((url: string) => typeof url === 'string' && url.trim() !== '');
  const hasVideo = typeof p.video_url === 'string' && p.video_url.trim() !== '';
  const hasMedia = hasImages || hasVideo;
  return hasContent && hasMedia;
});
```

### Code thay đổi Frontend Service:

Tại 12 vị trí với `.limit(50000)`, thay thành `.limit(100000)`:
- Line 438, 459, 481, 513, 535, 557, 591, 608, 657, 686

---

## Kết Quả Sau Khi Sửa

1. Logic "Quality Post" sẽ giống nhau 100% giữa Edge Function và Frontend
2. Không bị mất data do row limit khác nhau
3. Sau khi Reset All, tab So sánh/Tính thưởng sẽ hiển thị Chênh lệch = 0

---

## Lưu Ý

- Sau khi sửa Edge Function, cần **deploy lại** function
- Sau khi deploy, chạy **Reset All** một lần nữa
- Frontend Service sẽ tự động cập nhật khi build lại

