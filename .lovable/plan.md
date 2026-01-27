

# Kế Hoạch: Đồng Bộ Logic V3.1 - Unified Daily Limits cho Posts + Products + Livestreams

## Mục Tiêu

Đảm bảo **100% đồng bộ** giữa Edge Function và Frontend Service với logic:

- **50 likes/ngày** = Pool chung từ (Quality Posts + Quality Products + Valid Livestreams)
- **50 comments/ngày** = Pool chung từ (Quality Posts + Quality Products + Valid Livestreams)  
- **5 shares/ngày** = Pool chung từ (Quality Posts + Quality Products + Valid Livestreams)

---

## Trả Lời Thắc Mắc

✅ **Comment đã có yêu cầu >20 ký tự** trong cả 2 nơi:
- Edge Function (line 177, 285): `contentLength > 20`
- Frontend Service (line 240-242): `isQualityComment(): content?.length > 20`

---

## Tiêu Chí Nội Dung Hợp Lệ

| Loại Nội Dung | Tiêu Chí Để Được Thưởng Interactions |
|---------------|-------------------------------------|
| **Post / Product** | Content >100 ký tự + có media (hình/video) |
| **Livestream** | Duration ≥ 15 phút |

| Loại Interaction | Tiêu Chí |
|------------------|----------|
| **Like** | Từ user hợp lệ (không bị ban, chưa xóa) |
| **Comment** | Từ user hợp lệ + >20 ký tự |
| **Share** | Từ user hợp lệ |

---

## Vấn Đề Hiện Tại

### Edge Function (`reset-all-rewards/index.ts`):

| Logic | Hiện Trạng | Cần Sửa |
|-------|------------|---------|
| Post/Product Likes | ✅ Limit 50/day | Gộp với Livestream |
| Post/Product Comments | ✅ Limit 50/day | Gộp với Livestream |
| Post/Product Shares | ✅ Limit 5/day | Gộp với Livestream |
| Livestream Likes | ❌ **KHÔNG limit** (dòng 275-278) | Gộp vào pool 50/day |
| Livestream Comments | ❌ **KHÔNG limit** (dòng 288-291) | Gộp vào pool 50/day |
| Livestream Shares | ⚠️ Limit 5/day **RIÊNG** (dòng 298-307) | Gộp vào pool 5/day |
| Livestream Validity | ❌ Chưa check trước khi thưởng interactions | Chỉ thưởng nếu ≥15 phút |

### Frontend Service (`rewardCalculationService.ts`):

| Logic | Hiện Trạng | Cần Sửa |
|-------|------------|---------|
| Post/Product Likes | ✅ Limit 50/day | Gộp với Livestream |
| Post/Product Comments | ✅ Limit 50/day | Gộp với Livestream |
| Post/Product Shares | ✅ Limit 5/day | Gộp với Livestream |
| Livestream Logic | ❌ **HOÀN TOÀN KHÔNG CÓ** | Thêm toàn bộ |

---

## Chi Tiết Kỹ Thuật

### 1. Sửa Edge Function (`supabase/functions/reset-all-rewards/index.ts`)

#### 1a. Tạo Set validLivestreamIds (livestreams ≥15 phút)

**Thêm sau dòng 155 (sau qualityPostIds):**

```typescript
// Valid livestreams: >=15 minutes duration
const validLivestreamIds = new Set(
  allLivestreamsData
    .filter(l => l.user_id === userId && l.ended_at && l.duration_minutes >= 15)
    .map(l => l.id)
);
```

#### 1b. Thu thập Livestream Interactions vào cùng pool

**Sửa logic thu thập likes (dòng 160-170):**

```typescript
// Collect likes received on QUALITY posts + VALID livestreams
const allLikes: { user_id: string; source_id: string; source_type: string; created_at: string }[] = [];

// From quality posts
for (const like of allLikesData) {
  if (qualityPostIds.has(like.post_id) && like.user_id !== userId && existingUserIds.has(like.user_id)) {
    allLikes.push({
      user_id: like.user_id,
      source_id: like.post_id,
      source_type: 'post',
      created_at: like.created_at
    });
  }
}

// From valid livestreams (≥15 min)
for (const like of allLivestreamLikesData) {
  if (validLivestreamIds.has(like.livestream_id) && like.user_id !== userId && existingUserIds.has(like.user_id)) {
    allLikes.push({
      user_id: like.user_id,
      source_id: like.livestream_id,
      source_type: 'livestream',
      created_at: like.created_at
    });
  }
}
```

**Sửa logic thu thập comments (dòng 172-185):**

```typescript
// Collect quality comments on QUALITY posts + VALID livestreams
const allQualityComments: { user_id: string; source_id: string; source_type: string; created_at: string }[] = [];

// From quality posts
for (const comment of allCommentsData) {
  if (qualityPostIds.has(comment.post_id) && comment.author_id !== userId && existingUserIds.has(comment.author_id)) {
    const contentLength = comment.content?.length || 0;
    if (contentLength > 20) {
      allQualityComments.push({
        user_id: comment.author_id,
        source_id: comment.post_id,
        source_type: 'post',
        created_at: comment.created_at
      });
    }
  }
}

// From valid livestreams (≥15 min)
for (const comment of allLivestreamCommentsData) {
  if (validLivestreamIds.has(comment.livestream_id) && comment.author_id !== userId && existingUserIds.has(comment.author_id)) {
    const contentLength = comment.content?.length || 0;
    if (contentLength > 20) {
      allQualityComments.push({
        user_id: comment.author_id,
        source_id: comment.livestream_id,
        source_type: 'livestream',
        created_at: comment.created_at
      });
    }
  }
}
```

**Sửa logic thu thập shares (dòng 207-224):**

```typescript
// Collect shares on QUALITY posts + VALID livestreams
const allShares: { user_id: string; source_id: string; source_type: string; created_at: string }[] = [];

// From quality posts
for (const share of allSharesData) {
  if (qualityPostIds.has(share.post_id) && share.user_id !== userId && existingUserIds.has(share.user_id)) {
    allShares.push({
      user_id: share.user_id,
      source_id: share.post_id,
      source_type: 'post',
      created_at: share.created_at
    });
  }
}

// From valid livestreams (≥15 min)
for (const share of allLivestreamSharesData) {
  if (validLivestreamIds.has(share.livestream_id) && share.user_id !== userId && existingUserIds.has(share.user_id)) {
    allShares.push({
      user_id: share.user_id,
      source_id: share.livestream_id,
      source_type: 'livestream',
      created_at: share.created_at
    });
  }
}

// Apply unified limit 5/day for ALL shares
allShares.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
const rewardableShares = applyDailyLimit(allShares, s => s.created_at, MAX_SHARES_PER_DAY);
```

#### 1c. Xóa logic livestream interactions riêng biệt

**Xóa dòng 266-308** (section 7. Livestream interactions) vì đã được gộp vào pools chung.

---

### 2. Sửa Frontend Service (`src/lib/rewardCalculationService.ts`)

#### 2a. Thêm Imports

**Sửa dòng 28-42:**

```typescript
import {
  QUALITY_POST_REWARD,
  LIKE_REWARD,
  QUALITY_COMMENT_REWARD,
  SHARE_REWARD,
  FRIENDSHIP_REWARD,
  LIVESTREAM_REWARD,
  LIVESTREAM_MIN_DURATION,
  MAX_POSTS_PER_DAY,
  MAX_LIKES_PER_DAY,
  MAX_COMMENTS_PER_DAY,
  MAX_SHARES_PER_DAY,
  MAX_FRIENDSHIPS_PER_DAY,
  MAX_LIVESTREAMS_PER_DAY,
  WELCOME_BONUS,
  WALLET_CONNECT_BONUS,
  DAILY_REWARD_CAP
} from './constants';
```

#### 2b. Thêm Interfaces cho Livestream

**Thêm sau dòng 82:**

```typescript
interface Livestream {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
}

interface LivestreamLike {
  livestream_id: string;
  user_id: string;
  created_at: string;
}

interface LivestreamComment {
  livestream_id: string;
  author_id: string;
  content: string | null;
  created_at: string;
}

interface LivestreamShare {
  livestream_id: string;
  user_id: string;
  created_at: string;
}
```

#### 2c. Mở rộng DailyRewardStats Interface

**Thêm vào DailyRewardStats:**

```typescript
// Livestream completion
livestreamsCompleted: number;
livestreamReward: number;

// Livestream interactions (gộp vào total counts)
livestreamLikesReceived: number;
livestreamQualityComments: number;
livestreamSharesReceived: number;
```

#### 2d. Thêm Logic Fetch và Xử lý Livestream

**Sau section Friendships, thêm:**

```typescript
// ========================================
// 7. LIVESTREAM COMPLETION REWARDS
// ========================================

let livestreamsQuery = supabase
  .from('livestreams')
  .select('id, user_id, started_at, ended_at, duration_minutes')
  .eq('user_id', userId)
  .not('ended_at', 'is', null)
  .gte('duration_minutes', LIVESTREAM_MIN_DURATION)
  .lte('created_at', cutoff)
  .order('started_at', { ascending: true })
  .limit(100000);

if (startDateStr) livestreamsQuery = livestreamsQuery.gte('created_at', startDateStr);
if (endDateStr) livestreamsQuery = livestreamsQuery.lte('created_at', endDateStr);

const { data: livestreamsData } = await livestreamsQuery;
const validLivestreams = livestreamsData || [];

// Apply limit 5/day for livestream completion
const rewardableLivestreams = applyDailyLimit(
  validLivestreams, 
  l => l.started_at, 
  MAX_LIVESTREAMS_PER_DAY
);

for (const livestream of rewardableLivestreams) {
  const vnDate = toVietnamDate(livestream.started_at);
  addRewardForDate(vnDate, LIVESTREAM_REWARD);
  const stats = getOrCreateDailyStats(vnDate);
  stats.livestreamsCompleted++;
  stats.livestreamReward += LIVESTREAM_REWARD;
}

// Get ALL valid livestream IDs (≥15 min) for interaction rewards
const { data: allValidLivestreamsData } = await supabase
  .from('livestreams')
  .select('id')
  .eq('user_id', userId)
  .not('ended_at', 'is', null)
  .gte('duration_minutes', LIVESTREAM_MIN_DURATION)
  .lte('created_at', cutoff)
  .limit(100000);

const validLivestreamIds = (allValidLivestreamsData || []).map(l => l.id);
```

#### 2e. Sửa Logic Gộp Pools (trước khi apply daily limit)

**Sửa section Likes/Comments/Shares để gộp livestream interactions:**

```typescript
// ========================================
// Unified Pool: Likes from Posts + Livestreams
// ========================================

// Existing: validLikes from quality posts
let allLikesPool = [...validLikes]; // Clone array

if (validLivestreamIds.length > 0) {
  let lsLikesQuery = supabase
    .from('livestream_likes')
    .select('livestream_id, user_id, created_at')
    .in('livestream_id', validLivestreamIds)
    .neq('user_id', userId)
    .in('user_id', validUserIdArray)
    .lte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(100000);

  if (startDateStr) lsLikesQuery = lsLikesQuery.gte('created_at', startDateStr);
  if (endDateStr) lsLikesQuery = lsLikesQuery.lte('created_at', endDateStr);

  const { data: lsLikesData } = await lsLikesQuery;
  
  // Add to unified pool with same shape
  (lsLikesData || []).forEach(l => {
    allLikesPool.push({
      user_id: l.user_id,
      post_id: l.livestream_id, // Use same field for sorting
      created_at: l.created_at,
      _source: 'livestream' // Tag for stats tracking
    });
  });
}

// Sort by created_at and apply unified 50/day limit
allLikesPool.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
rewardableLikes = applyDailyLimit(allLikesPool, l => l.created_at, MAX_LIKES_PER_DAY);

// Tương tự cho Comments và Shares...
```

---

## Tóm Tắt Thay Đổi

| File | Dòng | Thay Đổi |
|------|------|----------|
| Edge Function | 155 | Thêm `validLivestreamIds` set |
| Edge Function | 160-185 | Gộp livestream likes/comments vào pool chung |
| Edge Function | 207-224 | Gộp livestream shares vào pool chung |
| Edge Function | 266-308 | **XÓA** section riêng biệt |
| Frontend Service | 28-42 | Thêm imports LIVESTREAM_* constants |
| Frontend Service | 82+ | Thêm Livestream interfaces |
| Frontend Service | DailyRewardStats | Thêm livestream fields |
| Frontend Service | Section 7 | Thêm Livestream completion logic |
| Frontend Service | Likes/Comments/Shares | Gộp livestream vào pools trước apply limit |

---

## Kết Quả Mong Đợi

Sau khi sửa:

| Pool | Nguồn | Limit |
|------|-------|-------|
| **Likes** | Quality Posts + Quality Products + Valid Livestreams (≥15 min) | 50/ngày |
| **Comments** | Quality Posts + Quality Products + Valid Livestreams (≥15 min) | 50/ngày |
| **Shares** | Quality Posts + Quality Products + Valid Livestreams (≥15 min) | 5/ngày |

- Edge Function và Frontend Service **100% đồng bộ**
- Sau "Reset toàn bộ" → Chênh lệch = 0

