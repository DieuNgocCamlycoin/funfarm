# 📋 REWARD SYNC CHECKLIST - V3.1

> **Mục đích**: Quy trình chuẩn (SOP) để đảm bảo logic thưởng **luôn đồng bộ** giữa tất cả các vị trí trong hệ thống.
>
> **Version hiện tại**: V3.1 (2026-01-21)
>
> **Divine Mantra**: "Free-Fee & Earn - FUN FARM Web3"

---

## 📍 1. Bản Đồ Code (Code Map)

```
📁 REWARD LOGIC LOCATIONS
│
├── 🎯 SOURCE OF TRUTH - Constants
│   └── src/lib/constants.ts
│       ├── DAILY_REWARD_CAP = 500,000
│       ├── QUALITY_POST_REWARD = 10,000
│       ├── LIKE_REWARD = 1,000
│       ├── QUALITY_COMMENT_REWARD = 2,000
│       ├── MAX_POSTS_PER_DAY = 10
│       ├── MAX_LIKES_PER_DAY = 50      ← V3.1
│       └── MAX_COMMENTS_PER_DAY = 50   ← V3.1
│
├── 📊 SSOT - Admin Reporting
│   └── src/lib/rewardCalculationService.ts
│       ├── calculateUserReward()
│       ├── isQualityPost()
│       ├── isQualityComment()
│       └── REWARD_RATES / DAILY_LIMITS exports
│
├── ⚡ EDGE FUNCTION - Batch Recalculation
│   └── supabase/functions/reset-all-rewards/index.ts
│       ├── processUser()
│       ├── toVietnamDate()
│       └── applyDailyCap()
│
├── 🗄️ SQL TRIGGERS - Real-time Allocation
│   └── supabase/migrations/
│       ├── 20260120163610_*.sql  ← V3.0 Base
│       └── 20260121094221_*.sql  ← V3.1 Separate limits
│
└── 🧪 UNIT TESTS - Protection
    └── src/lib/
        ├── dateUtils.test.ts         (12 tests)
        ├── rewardValidation.test.ts  (15 tests)
        ├── rewardLimits.test.ts      (8 tests)
        └── rewardCalculation.test.ts (60 tests)
```

---

## ✅ 2. Checklist 5 Bước Khi Update Logic

### Bước 1: Update Constants (SOURCE OF TRUTH)

| Action | File | Verification |
|--------|------|--------------|
| ✏️ Thay đổi giá trị constants | `src/lib/constants.ts` | TypeScript compile pass |
| 📝 Thêm comment version | `// V3.x - Description` | Manual review |

```typescript
// Ví dụ thay đổi
export const MAX_LIKES_PER_DAY = 50; // V3.1 - Tách riêng khỏi combined limit
```

---

### Bước 2: Update Frontend Service

| Action | File | Verification |
|--------|------|--------------|
| 🔧 Sync logic với constants mới | `src/lib/rewardCalculationService.ts` | Import từ constants.ts |
| 🧪 Chạy unit tests | Terminal | `npm run test -- --run` |

```bash
# Verify tests pass
npm run test -- src/lib/rewardCalculation.test.ts
npm run test -- src/lib/rewardLimits.test.ts
```

---

### Bước 3: Create SQL Migration

| Action | File | Verification |
|--------|------|--------------|
| 📄 Tạo migration mới | `supabase/migrations/YYYYMMDDHHMMSS_*.sql` | Supabase CLI |
| 🧪 Test locally | Supabase local | `supabase db reset` |

```sql
-- Template cho migration header
-- =============================================
-- REWARD LOGIC V3.x
-- Synced with: src/lib/constants.ts
-- Date: YYYY-MM-DD
-- Changes: [Description]
-- =============================================
```

---

### Bước 4: Update Edge Function

| Action | File | Verification |
|--------|------|--------------|
| 🔧 Sync constants | `supabase/functions/reset-all-rewards/index.ts` | Manual comparison |
| 🚀 Deploy | Supabase Dashboard | Function logs |
| 🧪 Test với 1 user | Admin Dashboard | "So sánh V3.0" tab |

```typescript
// ⚠️ PHẢI MATCH với constants.ts
const DAILY_CAP = 500000;
const LIKE_REWARD = 1000;
const MAX_LIKES_PER_DAY = 50;
const MAX_COMMENTS_PER_DAY = 50;
```

---

### Bước 5: Update Documentation

| Action | File | Verification |
|--------|------|--------------|
| 📝 Update version history | `docs/REWARD_SYNC_CHECKLIST.md` | This file |
| 📝 Update admin docs | `docs/ADMIN_DASHBOARD_DOCUMENTATION.md` | Manual review |
| 💾 Update memory | Lovable Memory System | Confirm update |

---

## 📊 3. Bảng So Sánh Constants (V3.1)

| Constant | constants.ts | Edge Function | SQL Trigger | Unit Test |
|----------|--------------|---------------|-------------|-----------|
| `DAILY_REWARD_CAP` | 500,000 ✅ | 500,000 ✅ | 500,000 ✅ | ✅ |
| `QUALITY_POST_REWARD` | 10,000 ✅ | 10,000 ✅ | 10,000 ✅ | ✅ |
| `LIKE_REWARD` | 1,000 ✅ | 1,000 ✅ | 1,000 ✅ | ✅ |
| `QUALITY_COMMENT_REWARD` | 2,000 ✅ | 2,000 ✅ | 2,000 ✅ | ✅ |
| `SHARE_REWARD` | 10,000 ✅ | 10,000 ✅ | 10,000 ✅ | ✅ |
| `FRIENDSHIP_REWARD` | 10,000 ✅ | 10,000 ✅ | 10,000 ✅ | ✅ |
| `LIVESTREAM_REWARD` | 20,000 ✅ | 20,000 ✅ | 20,000 ✅ | ✅ |
| `MAX_POSTS_PER_DAY` | 10 ✅ | 10 ✅ | 10 ✅ | ✅ |
| `MAX_LIKES_PER_DAY` | 50 ✅ | 50 ✅ | 50 ✅ | ✅ |
| `MAX_COMMENTS_PER_DAY` | 50 ✅ | 50 ✅ | 50 ✅ | ✅ |
| `MAX_SHARES_PER_DAY` | 5 ✅ | 5 ✅ | 5 ✅ | ✅ |
| `MAX_FRIENDSHIPS_PER_DAY` | 10 ✅ | 10 ✅ | 10 ✅ | ✅ |
| `MAX_LIVESTREAMS_PER_DAY` | 5 ✅ | 5 ✅ | 5 ✅ | ✅ |
| `WELCOME_BONUS` | 50,000 ✅ | 50,000 ✅ | N/A | ✅ |
| `WALLET_CONNECT_BONUS` | 50,000 ✅ | 50,000 ✅ | N/A | ✅ |

---

## 🔍 4. Validation Rules (V3.1)

### Quality Post Criteria
```typescript
isQualityPost(post) = (
  post.content.length > 100 &&           // Nội dung > 100 ký tự
  (hasValidImages(post.images) || hasValidVideo(post.video_url)) &&  // Có media
  post.post_type !== 'share'             // Không phải bài share
)
```

### Quality Comment Criteria
```typescript
isQualityComment(content) = content.length > 20  // Nội dung > 20 ký tự
```

### Timezone Rule
```typescript
toVietnamDate(utcTimestamp) = UTC + 7 hours
// 17:00 UTC = 00:00 Vietnam (ngày mới)
// 16:59 UTC = 23:59 Vietnam (cùng ngày)
```

### V3.1 Separate Limits
```
❌ V3.0: Combined 50 interactions (likes + comments + shares)
✅ V3.1: Separate pools
   ├── 50 likes/day
   ├── 50 quality comments/day
   └── 5 shares/day
```

---

## 🧪 5. Test Verification Commands

```bash
# ═══════════════════════════════════════════
# Chạy TẤT CẢ unit tests (95 tests)
# ═══════════════════════════════════════════
npm run test -- --run

# ═══════════════════════════════════════════
# Chạy test theo file cụ thể
# ═══════════════════════════════════════════

# Timezone logic
npm run test -- src/lib/dateUtils.test.ts --run

# Quality validation
npm run test -- src/lib/rewardValidation.test.ts --run

# V3.1 limits & rates
npm run test -- src/lib/rewardLimits.test.ts --run

# Integration & daily cap
npm run test -- src/lib/rewardCalculation.test.ts --run

# ═══════════════════════════════════════════
# Watch mode (development)
# ═══════════════════════════════════════════
npm run test -- src/lib/rewardCalculation.test.ts --watch
```

### Expected Output
```
✓ src/lib/dateUtils.test.ts (12 tests)
✓ src/lib/rewardValidation.test.ts (15 tests)
✓ src/lib/rewardLimits.test.ts (8 tests)
✓ src/lib/rewardCalculation.test.ts (60 tests)

Test Files  4 passed (4)
Tests       95 passed (95)
```

---

## 📝 6. Version History

| Version | Date | Changes | Synced Files | Author |
|---------|------|---------|--------------|--------|
| V1.0 | 2025-12 | Initial reward system | constants.ts | Team |
| V2.0 | 2026-01-15 | Add daily cap 500k | All | Team |
| V3.0 | 2026-01-20 | Combined 50 interaction limit | All | Team |
| **V3.1** | **2026-01-21** | **Separate 50 likes + 50 comments** | **All** | **Team** |

### V3.1 Changelog
- ✅ Tách `MAX_INTERACTIONS_PER_DAY` thành `MAX_LIKES_PER_DAY` + `MAX_COMMENTS_PER_DAY`
- ✅ Update SQL helper functions: `count_likes_today_vn()`, `count_comments_today_vn()`
- ✅ Update 23 SQL trigger functions
- ✅ Sync Edge Function `reset-all-rewards`
- ✅ Sync `rewardCalculationService.ts`
- ✅ Add 95 unit tests for protection
- ✅ **2026-01-26**: Xóa hoàn toàn deprecated constant `MAX_INTERACTIONS_PER_DAY` khỏi `constants.ts`

---

## ⚠️ 7. Common Mistakes to Avoid

### ❌ Mistake 1: Quên Update SQL Triggers
```
Symptom: Frontend hiển thị đúng nhưng DB allocation sai
Solution: LUÔN tạo migration khi thay đổi logic
```

### ❌ Mistake 2: Hardcode Values
```typescript
// ❌ WRONG
const maxLikes = 50;

// ✅ CORRECT
import { MAX_LIKES_PER_DAY } from '@/lib/constants';
```

### ❌ Mistake 3: Không Chạy Unit Tests
```
Symptom: Logic drift không được phát hiện
Solution: LUÔN chạy `npm run test -- --run` trước khi deploy
```

### ❌ Mistake 4: Nhầm Timezone
```typescript
// ❌ WRONG - Dùng UTC trực tiếp
const today = new Date().toISOString().split('T')[0];

// ✅ CORRECT - Convert sang Vietnam time
const today = toVietnamDate(timestamp);
```

### ❌ Mistake 5: Quên Exclusion Bonuses từ Daily Cap
```
Symptom: Welcome/Wallet bonus bị tính vào 500k cap
Solution: Chỉ apply cap cho daily rewards, không cho one-time bonuses
```

---

## 🔗 8. Related Files & Links

### Unit Tests
- `src/lib/dateUtils.test.ts` - Timezone conversion tests
- `src/lib/rewardValidation.test.ts` - Quality validation tests
- `src/lib/rewardLimits.test.ts` - V3.1 limits & rates tests
- `src/lib/rewardCalculation.test.ts` - Integration tests

### Documentation
- `docs/ADMIN_DASHBOARD_DOCUMENTATION.md` - Admin Dashboard guide
- `docs/README.md` - Documentation hub

### Source Code
- `src/lib/constants.ts` - Constants SOURCE OF TRUTH
- `src/lib/rewardCalculationService.ts` - SSOT for admin reporting
- `supabase/functions/reset-all-rewards/index.ts` - Batch recalculation

### Admin Dashboard
- `/admin` → Tab "Tra cứu" - User reward lookup
- `/admin` → Tab "So sánh V3.0" - Compare before reset
- `/admin` → Tab "Tổng kết" - System-wide statistics

### Supabase
- Dashboard → Edge Functions → `reset-all-rewards` → Logs
- Dashboard → Database → Tables → `reward_logs`
- Dashboard → SQL Editor → Test queries

---

## 🎯 9. Quick Reference Card

```
╔═══════════════════════════════════════════════════════════════╗
║                  REWARD SYSTEM V3.1 - QUICK REF               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  📊 DAILY CAP: 500,000 CLC (excluding bonuses)               ║
║                                                               ║
║  🎁 ONE-TIME BONUSES (excluded from cap):                    ║
║     • Welcome: 50,000 CLC                                    ║
║     • Wallet:  50,000 CLC                                    ║
║                                                               ║
║  📝 DAILY REWARDS:                                           ║
║     • Quality Post:    10,000 CLC × 10/day                   ║
║     • Like Received:    1,000 CLC × 50/day                   ║
║     • Quality Comment:  2,000 CLC × 50/day                   ║
║     • Share Received:  10,000 CLC × 5/day                    ║
║     • Friendship:      10,000 CLC × 10/day                   ║
║     • Livestream:      20,000 CLC × 5/day                    ║
║                                                               ║
║  ✅ QUALITY CRITERIA:                                        ║
║     • Post: >100 chars + media + (post|product)              ║
║     • Comment: >20 chars                                     ║
║                                                               ║
║  🕐 TIMEZONE: Vietnam (UTC+7)                                ║
║     • 17:00 UTC = 00:00 VN (new day)                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## ✨ Maintenance Schedule

| Task | Frequency | Responsible |
|------|-----------|-------------|
| Verify constants sync | Before each deploy | Developer |
| Run unit tests | Before each deploy | CI/CD |
| Update version history | After each change | Developer |
| Review SQL triggers | Monthly | Admin |
| Audit reward_logs | Weekly | Admin |

---

> **Last Updated**: 2026-01-26
>
> **Maintained by**: FUN Ecosystem Team
>
> **Next Review**: When V3.2 is planned
