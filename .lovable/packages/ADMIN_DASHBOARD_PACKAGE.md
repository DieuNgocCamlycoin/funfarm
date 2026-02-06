# 📦 Đóng Gói Admin Dashboard - FUN Ecosystem
## Phiên bản: 2.0 | Cập nhật: 06/02/2026
## Áp dụng: FUN Profile, FUN Play, FUN Trading, FUN Money

---

# Mục Lục

1. [Tổng Quan Hệ Thống](#1-tổng-quan-hệ-thống)
2. [Kiến Trúc Bảo Mật](#2-kiến-trúc-bảo-mật)
3. [Các Tab Quản Trị](#3-các-tab-quản-trị)
4. [Components Chi Tiết](#4-components-chi-tiết)
5. [Database Schema](#5-database-schema)
6. [Database Functions](#6-database-functions)
7. [Edge Functions](#7-edge-functions)
8. [Constants & Formulas](#8-constants--formulas)
9. [Hướng Dẫn Triển Khai](#9-hướng-dẫn-triển-khai)
10. [File Structure](#10-file-structure)

---

## 1. Tổng Quan Hệ Thống

### 1.1 Mục Đích

Admin Dashboard là trung tâm quản lý hệ sinh thái FUN:

| Chức năng | Mô tả |
|-----------|-------|
| 🎁 Duyệt thưởng | Approve/Reject pending reward → approved reward |
| 🛡️ Rà soát User | Phát hiện tài khoản ảo, nghi ngờ lạm dụng |
| 💳 Phát hiện lạm dụng | Ví chung, email ảo, profile thiếu |
| 🗑️ Xóa nhanh | Tìm kiếm + ban tài khoản vi phạm |
| 📊 Báo cáo tài chính | Tổng chi hệ thống, on-chain claims |
| ⛓️ Blockchain | Theo dõi claims trên BSC |
| 🔗 SSO Merge | Quản lý xung đột FUN Profile merge |

### 1.2 Quyền Truy Cập

```typescript
// CRITICAL: Roles PHẢI lưu riêng bảng user_roles
// KHÔNG được lưu trong profiles/users để tránh privilege escalation

interface AdminAccess {
  role: 'admin' | 'owner' | 'moderator';
  checkMethod: 'has_role()'; // RPC function
  storage: 'user_roles table'; // Separate table
}
```

---

## 2. Kiến Trúc Bảo Mật

### 2.1 Role Types (Enum)

```sql
CREATE TYPE public.app_role AS ENUM (
  'admin',      -- Full admin access
  'owner',      -- Super admin (can manage admins)
  'moderator',  -- Limited moderation
  'user',       -- Regular user
  'shipper'     -- Delivery partner
);
```

### 2.2 User Roles Table

```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can view/modify roles
CREATE POLICY "Admins can manage roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'owner'));
```

### 2.3 has_role() Function (SECURITY DEFINER)

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
```

### 2.4 Frontend Admin Check

```typescript
// src/pages/Admin.tsx
const checkAdminRole = async () => {
  if (!user?.id) {
    navigate('/auth');
    return;
  }

  try {
    const { data, error } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (error || !data) {
      toast.error('Bạn không có quyền truy cập trang này');
      navigate('/feed');
      return;
    }

    setIsAdmin(true);
  } catch (err) {
    navigate('/feed');
  }
};

useEffect(() => {
  if (!authLoading) checkAdminRole();
}, [user?.id, authLoading]);
```

### 2.5 Navbar Admin Check

```typescript
// src/components/Navbar.tsx
const [isAdmin, setIsAdmin] = useState(false);

useEffect(() => {
  const checkAdminRole = async () => {
    if (!user?.id) {
      setIsAdmin(false);
      return;
    }
    try {
      const { data } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      setIsAdmin(data === true);
    } catch {
      setIsAdmin(false);
    }
  };
  checkAdminRole();
}, [user?.id]);

// Render admin link only if isAdmin
{isAdmin && (
  <Link to="/admin" className="text-primary">
    <Shield className="w-4 h-4 mr-2" />
    Admin Dashboard
  </Link>
)}
```

---

## 3. Các Tab Quản Trị

### 3.1 Danh Sách Tabs

| # | Tab ID | Tên | Icon | Mô tả |
|---|--------|-----|------|-------|
| 1 | `reward-calc` | Tính thưởng | Download | Export Excel tính thưởng V3.0 |
| 2 | `reward-compare` | So sánh V3.0 | Scale | So sánh pending vs recalculated |
| 3 | `financial` | Báo cáo TC | DollarSign | Tổng chi hệ thống |
| 4 | `user-activity-search` | Tra cứu & Báo cáo | FileSpreadsheet | Chi tiết hoạt động user |
| 5 | `verification` | Xác minh | Shield | Email/Avatar/Law status |
| 6 | `gift-backfill` | Backfill | Gift | Fix gift posts cũ |
| 7 | `quick-delete` | Xóa nhanh | Search | Tìm + ban nhanh |
| 8 | `deleted-users` | Đã xóa | Trash2 | Lịch sử users đã xóa |
| 9 | `rewards` | Duyệt | Gift | Approve/Reject pending |
| 10 | `abuse` | Lạm dụng | AlertTriangle | Ví chung, mail ảo |
| 11 | `review` | Rà soát | Search | Suspicion scoring |
| 12 | `approved` | Đã Duyệt | CheckCircle | Lịch sử approved |
| 13 | `claimed` | Đã Claim | Wallet | Users đã rút |
| 14 | `blockchain` | BSC | Link | On-chain data |
| 15 | `all-users` | Tất cả | Users | Directory |
| 16 | `merge-requests` | Gửi Merge | Send | SSO merge requests |
| 17 | `merge-conflicts` | Xung đột | GitMerge | Resolve conflicts |
| 18 | `content-moderation` | AI Review | AlertTriangle | Content moderation |
| 19 | `bans` | Ban | Ban | Banned users list |

### 3.2 Tab Layout (Flex Wrap)

```tsx
<TabsList className="flex flex-wrap h-auto gap-1 p-2 bg-muted/50">
  <TabsTrigger value="reward-calc" className="flex items-center gap-1.5 px-3 py-2 text-xs">
    <Download className="h-4 w-4 text-purple-500" />
    <span className="text-purple-500 font-medium">Tính thưởng</span>
  </TabsTrigger>
  {/* ... more tabs */}
</TabsList>
```

---

## 4. Components Chi Tiết

### 4.1 UserReviewTab - Rà Soát User

**File:** `src/components/admin/UserReviewTab.tsx`

**Chức năng:** Phân loại users thành 3 nhóm: Nghi ngờ, Đã ban, Bà con thật

**Suspicion Score Formula:**

```typescript
const getSuspicionScore = (user: UserData): number => {
  let score = 0;
  
  // Pending reward cao bất thường (>3 ngày cap = 1.5 triệu)
  if (user.pending_reward > DAILY_REWARD_CAP * 3) score += 40;
  else if (user.pending_reward > DAILY_REWARD_CAP * 2) score += 20;
  
  // Không có avatar
  if (!user.avatar_url) score += 15;
  
  // Không có tên hoặc tên quá ngắn
  if (!user.display_name || user.display_name.length < 3) score += 15;
  
  // Có lịch sử vi phạm
  if (user.violation_level > 0) score += 25;
  
  // Không có bài viết nhưng có pending cao (> welcome bonus)
  if ((user.posts_count || 0) === 0 && user.pending_reward > TOTAL_WELCOME_BONUS) score += 20;
  
  // Không có hoạt động nhưng pending cao
  const totalActivity = (user.posts_count || 0) + (user.comments_count || 0);
  if (totalActivity === 0 && user.pending_reward > TOTAL_WELCOME_BONUS) score += 15;
  
  // Avatar chưa xác minh
  if (!user.avatar_verified) score += 10;
  
  return Math.min(score, 100);
};
```

**Suspicion Level Mapping:**

| Score | Level | Color |
|-------|-------|-------|
| ≥70% | Rất cao | 🔴 Red |
| ≥50% | Cao | 🟠 Orange |
| ≥30% | Trung bình | 🟡 Yellow |
| <30% | Thấp | 🟢 Green |

**Props Interface:**

```typescript
interface UserReviewTabProps {
  allUsers: UserData[];
  adminId: string;
  onRefresh: () => void;
}
```

---

### 4.2 WalletAbuseTab - Phát Hiện Lạm Dụng

**File:** `src/components/admin/WalletAbuseTab.tsx`

**Chức năng:** Phát hiện ví chung, mail ảo, profile thiếu

**Sub-tabs:**

| Tab | Tiêu chí |
|-----|----------|
| Ví chung | >1 tài khoản dùng chung wallet address |
| Profile thiếu | Không tên + không avatar + có pending |
| Tên ảo | Pattern spam, quá ngắn, toàn số |

**Wallet Grouping Logic:**

```typescript
const walletGroups = useMemo(() => {
  const groups: Record<string, UserData[]> = {};
  
  allUsers.forEach(user => {
    if (user.wallet_address && user.wallet_address !== '') {
      const wallet = user.wallet_address.toLowerCase();
      if (!groups[wallet]) groups[wallet] = [];
      groups[wallet].push(user);
    }
  });

  // Lọc chỉ các ví có >1 tài khoản
  return Object.entries(groups)
    .filter(([_, users]) => users.length > 1)
    .map(([wallet, users]) => ({
      wallet_address: wallet,
      users,
      total_pending: users.reduce((sum, u) => sum + u.pending_reward, 0),
      total_approved: users.reduce((sum, u) => sum + u.approved_reward, 0),
      is_suspicious: users.length > 2 || users.some(u => u.banned)
    }))
    .sort((a, b) => b.users.length - a.users.length);
}, [allUsers]);
```

**Fake Name Detection:**

```typescript
const isFakeName = (name: string | null): boolean => {
  if (!name) return true;
  const trimmed = name.trim();
  
  // Quá ngắn (<3 ký tự)
  if (trimmed.length < 3) return true;
  
  // Toàn số
  if (/^\d+$/.test(trimmed)) return true;
  
  // Pattern spam: abc123456
  if (/^[a-z]{1,4}\d{5,}$/i.test(trimmed)) return true;
  
  // Test/user/admin patterns
  if (/^(test|user|admin|guest|demo)\d*$/i.test(trimmed)) return true;
  
  return false;
};
```

**Temp Mail Domains List:**

```typescript
const TEMP_MAIL_DOMAINS = [
  'tempmail.com', 'temp-mail.org', 'guerrillamail.com',
  'mailinator.com', 'yopmail.com', '10minutemail.com',
  'throwaway.email', 'fakeinbox.com', 'maildrop.cc',
  // ... 40+ domains
];
```

---

### 4.3 QuickDeleteTab - Xóa Nhanh

**File:** `src/components/admin/QuickDeleteTab.tsx`

**Chức năng:** Tìm kiếm + ban tài khoản nhanh

**Search Types:**

| Input | Tìm theo |
|-------|----------|
| UUID format | `profiles.id` |
| Text | `display_name` (ILIKE) |
| Wallet format | `wallet_address` (ILIKE) |

**Risk Level Calculation:**

```typescript
const calculateRiskLevel = (user: UserData): { score: number; reasons: string[] } => {
  const reasons: string[] = [];
  let riskScore = 0;

  // 1. Pending cao (> DAILY_REWARD_CAP)
  if (user.pending_reward > DAILY_REWARD_CAP) {
    reasons.push(`Pending cao: ${user.pending_reward.toLocaleString()} CLC`);
    riskScore += 3;
  }

  // 2. Không có avatar xác thực
  if (!user.avatar_url || !user.avatar_verified) {
    reasons.push('Không có avatar xác thực');
    riskScore += 1;
  }

  // 3. Ví dùng chung
  if (walletCounts[user.wallet_address?.toLowerCase()] > 1) {
    reasons.push(`Ví dùng chung (${count} tài khoản)`);
    riskScore += 3;
  }

  // 4. Tài khoản mới + pending cao
  if (daysSinceCreation < 3 && user.pending_reward > TOTAL_WELCOME_BONUS * 1.5) {
    reasons.push(`Tài khoản mới + pending cao`);
    riskScore += 2;
  }

  // 5. Không hoạt động thật
  if (posts === 0 && comments === 0 && user.pending_reward > TOTAL_WELCOME_BONUS) {
    reasons.push('Không có bài viết/bình luận');
    riskScore += 2;
  }

  return { score: riskScore, reasons };
};
```

**Risk Badge:**

| Score | Level | Badge Color |
|-------|-------|-------------|
| ≥4 | High | 🔴 Red |
| ≥2 | Medium | 🟡 Yellow |
| <2 | Low | 🔵 Blue |

---

### 4.4 FinancialReportTab - Báo Cáo Tài Chính

**File:** `src/components/admin/FinancialReportTab.tsx`

**Chức năng:** Tổng chi hệ thống, on-chain claims

**Summary Cards:**

| Card | Source | Color |
|------|--------|-------|
| Pending | Active profiles | Yellow |
| In-app Balance | Active profiles | Green |
| On-chain Claimed | blockchain_cache | Purple |
| Deleted Users | deleted_users table | Red |
| Banned Users | Banned profiles | Orange |
| **TỔNG CHI** | Sum of all | Primary |

**Parallel Data Fetch:**

```typescript
const [
  { data: activeProfiles },
  { data: bannedProfiles },
  { data: deletedUsersData },
  { data: blockchainCache },
] = await Promise.all([
  supabase.from("profiles").select("pending_reward, camly_balance").eq("banned", false),
  supabase.from("profiles").select("pending_reward, camly_balance, wallet_address").eq("banned", true),
  supabase.from("deleted_users").select("*").order("deleted_at", { ascending: false }),
  supabase.from("blockchain_cache").select("*").eq("id", "camly_claims").single(),
]);
```

**Export Functions:**

- `exportSummaryCSV()` - Tổng hợp tất cả metrics
- `exportOnChainCSV()` - Chi tiết on-chain claims
- `exportDeletedUsersCSV()` - Lịch sử deleted users

---

### 4.5 UserDailyActivityStats - Tra Cứu Chi Tiết

**File:** `src/components/admin/UserDailyActivityStats.tsx`

**Chức năng:** Chi tiết hoạt động từng user theo ngày

**Features:**

| Feature | Mô tả |
|---------|-------|
| Moving Snapshot | Round to nearest 5 minutes |
| Auto-refresh | 5-minute countdown with pause |
| Date Filter | Vietnam Time (UTC+7) |
| Sticky Headers | Double sticky (header + summary row) |
| Debug Mode | Show query info + post details |
| CSV Export | All users or single user |

**Data Cutoff Calculation:**

```typescript
const calculateCutoffTimestamp = (): Date => {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = Math.floor(minutes / 5) * 5;
  now.setMinutes(roundedMinutes, 0, 0);
  return now;
};
```

**Auto-Refresh with Pause:**

```typescript
useEffect(() => {
  // Pause conditions
  const shouldRun = autoRefreshEnabled && 
                    isTabVisible && 
                    selectedUser && 
                    !isLoading && 
                    !isExportingAll;

  if (!shouldRun) {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    return;
  }

  countdownIntervalRef.current = setInterval(() => {
    setCountdown(prev => {
      if (prev <= 1) {
        handleSelectUser(selectedUser);
        return 300; // Reset to 5 minutes
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(countdownIntervalRef.current);
}, [autoRefreshEnabled, isTabVisible, selectedUser, isLoading, isExportingAll]);
```

---

## 5. Database Schema

### 5.1 profiles Table (Core)

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  avatar_url TEXT,
  wallet_address TEXT,
  pending_reward BIGINT DEFAULT 0,
  approved_reward BIGINT DEFAULT 0,
  camly_balance BIGINT DEFAULT 0,
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  avatar_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  
  -- Ban status
  banned BOOLEAN DEFAULT false,
  banned_at TIMESTAMPTZ,
  ban_reason TEXT,
  violation_level INTEGER DEFAULT 0,
  last_violation_at TIMESTAMPTZ,
  
  -- Good Heart
  is_good_heart BOOLEAN DEFAULT false,
  good_heart_since TIMESTAMPTZ,
  
  -- Bonuses claimed
  welcome_bonus_claimed BOOLEAN DEFAULT false,
  wallet_bonus_claimed BOOLEAN DEFAULT false,
  verification_bonus_claimed BOOLEAN DEFAULT false,
  law_of_light_accepted BOOLEAN DEFAULT false,
  law_of_light_accepted_at TIMESTAMPTZ,
  
  -- SSO Integration
  fun_id TEXT,
  fun_profile_id TEXT,
  is_merged BOOLEAN DEFAULT false,
  merged_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.2 reward_approvals Table

```sql
CREATE TABLE public.reward_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount BIGINT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_id UUID,
  admin_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.3 reward_bans Table

```sql
CREATE TABLE public.reward_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  banned_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.4 blacklisted_wallets Table

```sql
CREATE TABLE public.blacklisted_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  is_permanent BOOLEAN DEFAULT true,
  user_id UUID, -- Optional link to original user
  blacklisted_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.5 deleted_users Table

```sql
CREATE TABLE public.deleted_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  wallet_address TEXT,
  camly_balance BIGINT,
  pending_reward BIGINT,
  approved_reward BIGINT,
  profile_type TEXT,
  is_verified BOOLEAN,
  banned BOOLEAN,
  ban_reason TEXT,
  deletion_reason TEXT,
  deleted_by UUID,
  deleted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ
);
```

### 5.6 user_reward_tracking Table

```sql
CREATE TABLE public.user_reward_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  post_id UUID REFERENCES posts(id),
  action_type TEXT NOT NULL, -- 'post', 'like_given', 'like_received_xxx', 'comment', 'share'
  rewarded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id, action_type)
);
```

### 5.7 blockchain_cache Table

```sql
CREATE TABLE public.blockchain_cache (
  id TEXT PRIMARY KEY, -- 'camly_claims'
  aggregated_data JSONB,
  total_claimed BIGINT DEFAULT 0,
  total_wallets INTEGER DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  transfers_sample JSONB,
  wallets_with_names INTEGER DEFAULT 0,
  last_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. Database Functions

### 6.1 ban_user_permanently

```sql
CREATE OR REPLACE FUNCTION public.ban_user_permanently(
  p_admin_id UUID, 
  p_user_id UUID, 
  p_reason TEXT DEFAULT 'Lạm dụng hệ thống'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet TEXT;
  v_user_data RECORD;
BEGIN
  -- Check admin role
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can ban users';
  END IF;
  
  -- Get user data before banning
  SELECT * INTO v_user_data FROM profiles WHERE id = p_user_id;
  v_wallet := v_user_data.wallet_address;
  
  -- Archive to deleted_users
  INSERT INTO deleted_users (
    user_id, display_name, email, avatar_url, wallet_address,
    camly_balance, pending_reward, approved_reward, profile_type,
    is_verified, banned, ban_reason, deletion_reason, deleted_by
  ) VALUES (
    v_user_data.id, v_user_data.display_name, v_user_data.email,
    v_user_data.avatar_url, v_user_data.wallet_address,
    v_user_data.camly_balance, v_user_data.pending_reward,
    v_user_data.approved_reward, v_user_data.profile_type,
    v_user_data.is_verified, true, p_reason, p_reason, p_admin_id
  );
  
  -- Update profile
  UPDATE profiles SET 
    banned = true,
    banned_at = now(),
    ban_reason = p_reason,
    violation_level = 3,
    is_good_heart = false,
    pending_reward = 0,
    approved_reward = 0
  WHERE id = p_user_id;
  
  -- Blacklist wallet
  IF v_wallet IS NOT NULL AND v_wallet != '' THEN
    INSERT INTO blacklisted_wallets (wallet_address, reason, is_permanent, user_id)
    VALUES (lower(v_wallet), p_reason, true, p_user_id)
    ON CONFLICT (wallet_address) DO NOTHING;
  END IF;
  
  -- Create permanent reward ban
  INSERT INTO reward_bans (user_id, reason, expires_at)
  VALUES (p_user_id, p_reason, now() + interval '100 years');
  
  -- Send notification
  INSERT INTO notifications (user_id, type, content)
  VALUES (p_user_id, 'account_banned', 
    'Tài khoản bị khóa vĩnh viễn: ' || p_reason);
  
  RETURN true;
END;
$$;
```

### 6.2 approve_user_reward

```sql
CREATE OR REPLACE FUNCTION public.approve_user_reward(
  p_user_id UUID, 
  p_admin_id UUID, 
  p_note TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_amount BIGINT;
BEGIN
  -- Check admin role
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve rewards';
  END IF;

  SELECT pending_reward INTO v_pending_amount 
  FROM profiles WHERE id = p_user_id;
  
  IF v_pending_amount IS NULL OR v_pending_amount <= 0 THEN
    RAISE EXCEPTION 'No pending reward to approve';
  END IF;
  
  -- Move pending → approved
  UPDATE profiles SET 
    pending_reward = 0,
    approved_reward = approved_reward + v_pending_amount
  WHERE id = p_user_id;
  
  -- Record approval
  INSERT INTO reward_approvals (
    user_id, amount, status, admin_id, admin_note, reviewed_at
  ) VALUES (
    p_user_id, v_pending_amount, 'approved', 
    p_admin_id, p_note, now()
  );
  
  -- Notify user
  INSERT INTO notifications (user_id, type, content)
  VALUES (p_user_id, 'reward_approved', 
    'Phước lành đã duyệt! ' || v_pending_amount || ' CLC chờ bạn rút về ví ❤️');
  
  RETURN v_pending_amount;
END;
$$;
```

### 6.3 reject_user_reward

```sql
CREATE OR REPLACE FUNCTION public.reject_user_reward(
  p_user_id UUID, 
  p_admin_id UUID, 
  p_note TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_amount BIGINT;
BEGIN
  -- Check admin role
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject rewards';
  END IF;

  SELECT pending_reward INTO v_pending_amount 
  FROM profiles WHERE id = p_user_id;
  
  -- Reset pending to 0
  UPDATE profiles SET pending_reward = 0 
  WHERE id = p_user_id;
  
  -- Record rejection
  INSERT INTO reward_approvals (
    user_id, amount, status, admin_id, admin_note, reviewed_at
  ) VALUES (
    p_user_id, v_pending_amount, 'rejected', 
    p_admin_id, p_note, now()
  );
  
  -- Notify user gently
  INSERT INTO notifications (user_id, type, content)
  VALUES (p_user_id, 'reward_rejected', 
    'Hành động chưa đạt chất lượng từ tâm, lần sau cố lên nhé! 💪');
  
  RETURN v_pending_amount;
END;
$$;
```

---

## 7. Edge Functions

### 7.1 fetch-bscscan-history

**File:** `supabase/functions/fetch-bscscan-history/index.ts`

**Purpose:** Fetch on-chain claim data from Moralis/BscScan

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { forceRefresh = false } = await req.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const moralisKey = Deno.env.get('MORALIS_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const { data: cache } = await supabase
        .from('blockchain_cache')
        .select('*')
        .eq('id', 'camly_claims')
        .single();
      
      if (cache && cache.last_updated_at) {
        const cacheAge = Date.now() - new Date(cache.last_updated_at).getTime();
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes
          return new Response(JSON.stringify({
            ...cache,
            dataSource: 'Cache (fresh)',
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
    }

    // Fetch from Moralis API
    // ... implementation details

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

---

## 8. Constants & Formulas

### 8.1 Reward Constants

**File:** `src/lib/constants.ts`

```typescript
// ============================================
// ONE-TIME REWARDS (Không tính vào Daily Cap)
// ============================================
export const WELCOME_BONUS = 50000;
export const WALLET_CONNECT_BONUS = 50000;
export const TOTAL_WELCOME_BONUS = 100000; // Sum
export const LIGHT_LAW_UPGRADE_BONUS = 50000;

// ============================================
// DAILY REWARDS (Tính vào Daily Cap)
// ============================================
export const DAILY_REWARD_CAP = 500000;
export const QUALITY_POST_REWARD = 10000;
export const LIKE_REWARD = 1000;
export const QUALITY_COMMENT_REWARD = 2000;
export const SHARE_REWARD = 10000;
export const FRIENDSHIP_REWARD = 10000;
export const LIVESTREAM_REWARD = 20000;

// ============================================
// DAILY LIMITS
// ============================================
export const MAX_POSTS_PER_DAY = 10;
export const MAX_LIKES_PER_DAY = 50;
export const MAX_COMMENTS_PER_DAY = 50;
export const MAX_SHARES_PER_DAY = 5;
export const MAX_FRIENDSHIPS_PER_DAY = 10;
export const MAX_LIVESTREAMS_PER_DAY = 5;
```

### 8.2 Quality Criteria

```typescript
// Quality Post: >100 chars + valid media (image OR video)
const isQualityPost = (post: Post): boolean => {
  const hasQualityContent = (post.content?.length || 0) > 100;
  const hasImages = post.images && post.images.length > 0;
  const hasVideo = post.video_url && post.video_url.trim() !== '';
  return hasQualityContent && (hasImages || hasVideo);
};

// Quality Comment: >20 chars
const isQualityComment = (comment: Comment): boolean => {
  return (comment.content?.length || 0) > 20;
};
```

---

## 9. Hướng Dẫn Triển Khai

### 9.1 Copy Files

```bash
# 1. Copy components
cp -r src/components/admin/ <project>/src/components/admin/

# 2. Copy main page
cp src/pages/Admin.tsx <project>/src/pages/

# 3. Copy constants
cp src/lib/constants.ts <project>/src/lib/

# 4. Copy reward calculation service (if needed)
cp src/lib/rewardCalculationService.ts <project>/src/lib/

# 5. Copy edge functions
cp -r supabase/functions/fetch-bscscan-history/ <project>/supabase/functions/
```

### 9.2 Run Database Migrations

```sql
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'moderator', 'user', 'shipper');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (...);

-- 3. Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(...);

-- 4. Create admin functions
CREATE OR REPLACE FUNCTION public.ban_user_permanently(...);
CREATE OR REPLACE FUNCTION public.approve_user_reward(...);
CREATE OR REPLACE FUNCTION public.reject_user_reward(...);

-- 5. Create additional tables
CREATE TABLE public.reward_approvals (...);
CREATE TABLE public.reward_bans (...);
CREATE TABLE public.blacklisted_wallets (...);
CREATE TABLE public.deleted_users (...);
CREATE TABLE public.blockchain_cache (...);
```

### 9.3 Grant Admin Role

```sql
-- Grant admin role to specific user
INSERT INTO user_roles (user_id, role)
VALUES ('your-user-uuid', 'admin');

-- Grant owner role (super admin)
INSERT INTO user_roles (user_id, role)
VALUES ('owner-user-uuid', 'owner');
```

### 9.4 Add Route

```typescript
// src/App.tsx or router config
import Admin from '@/pages/Admin';

<Route path="/admin" element={<Admin />} />
```

### 9.5 Deploy Edge Functions

```bash
supabase functions deploy fetch-bscscan-history
```

---

## 10. File Structure

```
src/
├── pages/
│   └── Admin.tsx                        # Main admin page
│
├── components/admin/
│   ├── ContentModerationTab.tsx         # AI content review
│   ├── DeletedUsersTab.tsx              # Deleted users history
│   ├── FinancialReportTab.tsx           # Financial summary
│   ├── GiftBackfillTab.tsx              # Fix old gift posts
│   ├── MergeConflictsTab.tsx            # SSO merge conflicts
│   ├── MergeRequestTab.tsx              # Send merge requests
│   ├── QuickDeleteTab.tsx               # Quick search + ban
│   ├── RewardCalculationExport.tsx      # Excel export
│   ├── RewardComparisonTable.tsx        # V3.0 comparison
│   ├── UserDailyActivityStats.tsx       # Detailed user stats
│   ├── UserReviewTab.tsx                # Suspicion scoring
│   ├── UserRewardDetailModal.tsx        # User detail modal
│   ├── UserVerificationTab.tsx          # Verification status
│   └── WalletAbuseTab.tsx               # Shared wallet detection
│
├── lib/
│   ├── constants.ts                     # Reward constants
│   └── rewardCalculationService.ts      # V3.0 calculation logic
│
└── hooks/
    └── useAdminAccess.ts                # (Optional) Admin access hook

supabase/
├── functions/
│   ├── fetch-bscscan-history/           # Blockchain data
│   └── claim-camly/                     # On-chain claim handler
│
└── migrations/
    └── *.sql                            # Database migrations
```

---

## Tóm Tắt

| Item | Count |
|------|-------|
| React Components | 14 |
| Database Tables | 7 |
| Database Functions | 4 |
| Edge Functions | 2 |
| Admin Tabs | 19 |
| Constants | 15+ |

**Key Security Notes:**
1. ⚠️ **NEVER** store roles in profiles table
2. ⚠️ **NEVER** use localStorage/sessionStorage for admin check
3. ✅ Always use `has_role()` RPC with SECURITY DEFINER
4. ✅ Store roles in separate `user_roles` table
5. ✅ Check admin status on both frontend + backend

---

*Chúc bạn triển khai thành công!* 🧚✨💖

> *"Luật Ánh Sáng - Minh bạch, Công bằng, Yêu thương"*  
> *© 2026 FUN Ecosystem. All rights reserved.*
