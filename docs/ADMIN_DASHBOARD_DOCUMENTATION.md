# 📋 Tài liệu chi tiết hệ thống quản trị Fun Farm

> **Phiên bản: 1.0 | Cập nhật: 20/12/2024**  
> **Áp dụng cho: FUN Profile, FUN Play, FUN Trading, FUN Ecosystem**

---

## 📋 Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc bảo mật](#2-kiến-trúc-bảo-mật)
3. [Các Tab chính](#3-các-tab-chính)
4. [Chi tiết từng tính năng](#4-chi-tiết-từng-tính-năng)
5. [Database Functions](#5-database-functions)
6. [Code Structure](#6-code-structure)
7. [Hướng dẫn triển khai](#7-hướng-dẫn-triển-khai)

---

## 1. Tổng quan hệ thống

### 1.1 Mục đích

Admin Dashboard là trung tâm quản lý cho:
- ✅ Duyệt thưởng CAMLY (pending → approved)
- ✅ Rà soát & phát hiện tài khoản ảo/lạm dụng
- ✅ Khóa vĩnh viễn tài khoản vi phạm
- ✅ Theo dõi blockchain claims
- ✅ Quản lý hệ thống Luật Ánh Sáng

### 1.2 Quyền truy cập

- **Chỉ Admin** được phép truy cập (`/admin`)
- Kiểm tra qua RPC function `has_role()`
- Role được lưu riêng trong bảng `user_roles` (KHÔNG phải trong profiles)

---

## 2. Kiến trúc bảo mật

### 2.1 Kiểm tra quyền Admin

```typescript
// Frontend: src/pages/Admin.tsx
const checkAdminRole = async () => {
  const { data, error } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin'
  });
  
  if (error || !data) {
    navigate('/feed'); // Redirect nếu không phải admin
    return;
  }
  setIsAdmin(true);
};
```

### 2.2 Database Function (Supabase)

```sql
-- Kiểm tra role an toàn, tránh RLS recursive
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
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

### 2.3 Bảng User Roles

```sql
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL, -- 'admin', 'moderator', 'user', 'shipper'
  UNIQUE (user_id, role)
);
```

---

## 3. Các Tab chính

| # | Tab | Icon | Mô tả ngắn |
|---|-----|------|------------|
| 1 | **Tổng quan** | 📊 | Thống kê realtime: users, pending, approved, on-chain |
| 2 | **Duyệt thưởng** | 🎁 | Approve/Reject pending reward từng user |
| 3 | **Rà soát User** | 🛡️ | Phân loại: Nghi ngờ / Đã ban / Bà con thật |
| 4 | **Lạm dụng ví/mail** | 💳 | Phát hiện ví chung, mail ảo, profile thiếu |
| 5 | **Xóa nhanh** | 🗑️ | Tìm kiếm + xóa tài khoản ảo nhanh |
| 6 | **Blockchain** | ⛓️ | Dữ liệu claim on-chain từ BscScan/Moralis |

---

## 4. Chi tiết từng tính năng

### 4.1 Tab Duyệt thưởng (Reward Approval)

#### Dữ liệu hiển thị:

| Field | Mô tả |
|-------|-------|
| `avatar_url` | Avatar user |
| `display_name` | Tên hiển thị |
| `pending_reward` | CLC đang chờ duyệt |
| `approved_reward` | CLC đã duyệt (chờ claim) |
| `posts_count` | Số bài viết |
| `comments_count` | Số bình luận |
| `likes_received` | Số like nhận được |

#### Actions:

- **✅ Duyệt (Approve):** Chuyển pending → approved + gửi notification
- **❌ Từ chối (Reject):** Reset pending về 0 + gửi notification nhẹ nhàng

#### Lọc theo ngày:

```typescript
// Lọc users có hoạt động trong ngày được chọn
const startOfDay = new Date(selectedDate);
startOfDay.setHours(0, 0, 0, 0);
const endOfDay = new Date(selectedDate);
endOfDay.setHours(23, 59, 59, 999);

const { data } = await supabase
  .from('user_reward_tracking')
  .select('user_id')
  .gte('rewarded_at', startOfDay.toISOString())
  .lte('rewarded_at', endOfDay.toISOString());
```

---

### 4.2 Tab Rà soát User (UserReviewTab)

#### Sub-tabs:

| Sub-tab | Tiêu chí | Actions |
|---------|----------|---------|
| **Nghi ngờ** | Score ≥30% | Xem chi tiết + Ban |
| **Đã ban** | `banned = true` | Xem lý do |
| **Bà con thật** | Verified + có hoạt động | Xem thông tin |

#### Công thức tính Suspicion Score:

```typescript
const getSuspicionScore = (user: UserData): number => {
  let score = 0;
  
  // Pending reward cao bất thường
  if (user.pending_reward > 5000000) score += 40;
  else if (user.pending_reward > 2000000) score += 20;
  
  // Không có avatar
  if (!user.avatar_url) score += 15;
  
  // Không có tên hoặc tên quá ngắn
  if (!user.display_name || user.display_name.length < 3) score += 15;
  
  // Có lịch sử vi phạm
  if (user.violation_level > 0) score += 25;
  
  // Không có bài viết nhưng pending cao
  if ((user.posts_count || 0) === 0 && user.pending_reward > 100000) score += 20;
  
  // Avatar chưa xác minh
  if (!user.avatar_verified) score += 10;
  
  return Math.min(score, 100);
};
```

#### Phân loại mức độ nghi ngờ:

| Score | Level | Màu |
|-------|-------|-----|
| ≥70% | Rất cao | 🔴 Đỏ |
| ≥50% | Cao | 🟠 Cam |
| ≥30% | Trung bình | 🟡 Vàng |
| <30% | Thấp | 🟢 Xanh |

---

### 4.3 Tab Lạm dụng ví/mail (WalletAbuseTab)

#### Sub-tabs:

##### 4.3.1 Ví chung (Shared Wallet)

- **Tiêu chí:** >1 tài khoản dùng chung 1 wallet address
- **Hiển thị:** Nhóm users theo wallet, tổng pending, tổng approved
- **Action:** Ban tất cả + Blacklist ví

```typescript
// Nhóm users theo ví
const walletGroups = useMemo(() => {
  const groups: Record<string, UserData[]> = {};
  
  allUsers.forEach(user => {
    if (user.wallet_address) {
      const wallet = user.wallet_address.toLowerCase();
      if (!groups[wallet]) groups[wallet] = [];
      groups[wallet].push(user);
    }
  });

  // Lọc ví có >1 tài khoản
  return Object.entries(groups)
    .filter(([_, users]) => users.length > 1)
    .map(([wallet, users]) => ({
      wallet_address: wallet,
      users,
      total_pending: users.reduce((sum, u) => sum + u.pending_reward, 0),
    }));
}, [allUsers]);
```

##### 4.3.2 Profile thiếu

- **Tiêu chí:** Không tên + không avatar + có pending
- **Action:** Ban từng user

##### 4.3.3 Tên ảo (Fake Names)

- **Pattern phát hiện:**
  - Tên quá ngắn (<3 ký tự)
  - Toàn số
  - Pattern spam: `abc123456`
  - Tên test: `test`, `user`, `admin`

```typescript
const isFakeName = (name: string | null): boolean => {
  if (!name) return true;
  const trimmed = name.trim();
  
  if (trimmed.length < 3) return true;
  if (/^\d+$/.test(trimmed)) return true;
  if (/^[a-z]{1,4}\d{5,}$/i.test(trimmed)) return true;
  if (/^(test|user|admin|guest|demo)\d*$/i.test(trimmed)) return true;
  
  return false;
};
```

---

### 4.4 Tab Xóa nhanh (QuickDeleteTab)

#### Tính năng tìm kiếm:

| Input | Tìm theo |
|-------|----------|
| UUID | `profiles.id` |
| Tên | `profiles.display_name` (ILIKE) |
| Wallet | `profiles.wallet_address` (ILIKE) |

#### Danh sách gợi ý nghi ngờ:

Tự động phát hiện dựa trên:
- Pending cao bất thường (>500k CLC)
- Không có avatar xác thực
- Ví dùng chung
- Tài khoản mới + pending cao
- Không có hoạt động thật
- Email chưa xác thực

#### Risk Level:

| Score | Level | Badge |
|-------|-------|-------|
| ≥4 | High | 🔴 Rủi ro cao |
| ≥2 | Medium | 🟡 Nghi ngờ |
| <2 | Low | 🔵 Theo dõi |

---

### 4.5 Tab Blockchain

#### Nguồn dữ liệu:

1. **Moralis API** (live) - Ưu tiên
2. **BscScan API** (backup)
3. **Cache** (fallback)

#### Dữ liệu hiển thị:

| Field | Mô tả |
|-------|-------|
| `walletAddress` | Địa chỉ ví |
| `totalClaimed` | Tổng CLC đã claim on-chain |
| `transactions` | Số giao dịch |
| `lastClaimAt` | Thời gian claim cuối |
| `userName` | Tên user (nếu match) |

#### Edge Function:

```typescript
// supabase/functions/fetch-bscscan-history/index.ts
// Fetch và cache blockchain data
const { data } = await supabase.functions.invoke('fetch-bscscan-history', {
  body: { forceRefresh: false }
});
```

---

## 5. Database Functions

### 5.1 Ban User vĩnh viễn

```sql
CREATE OR REPLACE FUNCTION public.ban_user_permanently(
  p_admin_id uuid, 
  p_user_id uuid, 
  p_reason text DEFAULT 'Lạm dụng hệ thống'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet text;
BEGIN
  -- Check admin role
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can ban users';
  END IF;
  
  -- Get user wallet
  SELECT wallet_address INTO v_wallet FROM profiles WHERE id = p_user_id;
  
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
  IF v_wallet IS NOT NULL THEN
    INSERT INTO blacklisted_wallets (wallet_address, reason, is_permanent, user_id)
    VALUES (v_wallet, p_reason, true, p_user_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Create permanent reward ban
  INSERT INTO reward_bans (user_id, reason, expires_at)
  VALUES (p_user_id, p_reason, now() + interval '100 years');
  
  -- Send notification
  INSERT INTO notifications (user_id, type, content)
  VALUES (p_user_id, 'account_banned', 'Tài khoản bị khóa vĩnh viễn: ' || p_reason);
  
  RETURN true;
END;
$$;
```

### 5.2 Approve Reward

```sql
CREATE OR REPLACE FUNCTION public.approve_user_reward(
  p_user_id uuid, 
  p_admin_id uuid, 
  p_note text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_amount bigint;
BEGIN
  SELECT pending_reward INTO v_pending_amount FROM profiles WHERE id = p_user_id;
  
  IF v_pending_amount IS NULL OR v_pending_amount <= 0 THEN
    RAISE EXCEPTION 'No pending reward to approve';
  END IF;
  
  -- Move pending → approved
  UPDATE profiles SET 
    pending_reward = 0,
    approved_reward = approved_reward + v_pending_amount
  WHERE id = p_user_id;
  
  -- Record approval
  INSERT INTO reward_approvals (user_id, amount, status, admin_id, admin_note, reviewed_at)
  VALUES (p_user_id, v_pending_amount, 'approved', p_admin_id, p_note, now());
  
  -- Notify user
  INSERT INTO notifications (user_id, type, content)
  VALUES (p_user_id, 'reward_approved', 
    'Phước lành đã duyệt! ' || v_pending_amount || ' CLC chờ bạn rút về ví ❤️');
  
  RETURN v_pending_amount;
END;
$$;
```

### 5.3 Reject Reward

```sql
CREATE OR REPLACE FUNCTION public.reject_user_reward(
  p_user_id uuid, 
  p_admin_id uuid, 
  p_note text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pending_amount bigint;
BEGIN
  SELECT pending_reward INTO v_pending_amount FROM profiles WHERE id = p_user_id;
  
  -- Reset pending to 0
  UPDATE profiles SET pending_reward = 0 WHERE id = p_user_id;
  
  -- Record rejection
  INSERT INTO reward_approvals (user_id, amount, status, admin_id, admin_note, reviewed_at)
  VALUES (p_user_id, v_pending_amount, 'rejected', p_admin_id, p_note, now());
  
  -- Notify user gently
  INSERT INTO notifications (user_id, type, content)
  VALUES (p_user_id, 'reward_rejected', 
    'Hành động chưa đạt chất lượng từ tâm, lần sau cố lên nhé! 💪');
  
  RETURN v_pending_amount;
END;
$$;
```

---

## 6. Code Structure

```
📁 src/
├── 📁 pages/
│   └── Admin.tsx                    # Main Admin page
│
├── 📁 components/admin/
│   ├── UserReviewTab.tsx            # Rà soát + phân loại user
│   ├── WalletAbuseTab.tsx           # Phát hiện ví chung/mail ảo
│   └── QuickDeleteTab.tsx           # Tìm + xóa nhanh
│
└── 📁 integrations/supabase/
    ├── client.ts                    # Supabase client
    └── types.ts                     # TypeScript types (auto-generated)

📁 supabase/
├── 📁 functions/
│   ├── fetch-bscscan-history/       # Blockchain data fetcher
│   └── claim-camly/                 # On-chain claim handler
│
└── 📁 migrations/
    └── *.sql                        # Database migrations
```

---

## 7. Hướng dẫn triển khai

### 7.1 Áp dụng cho Platform mới

1. **Copy components:**
   ```bash
   cp -r src/components/admin/ <new-project>/src/components/admin/
   cp src/pages/Admin.tsx <new-project>/src/pages/
   ```

2. **Tạo database tables:**
   - `user_roles` (enum: admin, moderator, user)
   - `reward_bans`
   - `blacklisted_wallets`
   - `reward_approvals`
   - `user_reward_tracking`

3. **Tạo database functions:**
   - `has_role()`
   - `ban_user_permanently()`
   - `approve_user_reward()`
   - `reject_user_reward()`

4. **Cấu hình RLS policies:**
   - Admin có ALL quyền trên các bảng quản trị
   - User chỉ SELECT các bảng liên quan đến mình

### 7.2 Tùy chỉnh theo Platform

| Platform | Tùy chỉnh |
|----------|-----------|
| **FUN Profile** | Thêm tab quản lý profile verification |
| **FUN Play** | Thêm tab quản lý game rewards |
| **FUN Trading** | Thêm tab quản lý giao dịch P2P |

---

## 8. Bảng tổng hợp Database Schema

### 8.1 Profiles Table

```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  display_name text,
  avatar_url text,
  wallet_address text,
  pending_reward bigint DEFAULT 0,
  approved_reward bigint DEFAULT 0,
  camly_balance bigint DEFAULT 0,
  banned boolean DEFAULT false,
  banned_at timestamptz,
  ban_reason text,
  violation_level integer DEFAULT 0,
  is_good_heart boolean DEFAULT false,
  avatar_verified boolean DEFAULT false,
  email_verified boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 8.2 Reward Tracking Table

```sql
CREATE TABLE public.user_reward_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  action_type text NOT NULL, -- 'post', 'like_given', 'like_received_xxx', 'comment', 'share'
  rewarded_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id, action_type)
);
```

### 8.3 Blacklisted Wallets Table

```sql
CREATE TABLE public.blacklisted_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL UNIQUE,
  reason text NOT NULL,
  is_permanent boolean DEFAULT true,
  user_id uuid,
  blacklisted_at timestamptz DEFAULT now()
);
```

### 8.4 Reward Bans Table

```sql
CREATE TABLE public.reward_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  banned_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### 8.5 Reward Approvals Table

```sql
CREATE TABLE public.reward_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount bigint NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_id uuid,
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

---

## 9. API Endpoints (Edge Functions)

### 9.1 Claim CAMLY

```typescript
// POST /functions/v1/claim-camly
{
  "userId": "uuid",
  "amount": 100000,
  "walletAddress": "0x..."
}
```

### 9.2 Fetch Blockchain History

```typescript
// POST /functions/v1/fetch-bscscan-history
{
  "forceRefresh": false
}
```

---

## 📞 Liên hệ hỗ trợ

- **Telegram:** @FunFarmSupport
- **Email:** admin@funfarm.love
- **Docs:** https://docs.funfarm.love/admin

---

> *"Luật Ánh Sáng - Minh bạch, Công bằng, Yêu thương"*  
> *© 2024 FUN Ecosystem. All rights reserved.*
|----------|-----------|
| FUN Profile | Thêm tab quản lý profile verification |
| FUN Play | Thêm tab quản lý game rewards |
| FUN Trading | Thêm tab quản lý giao dịch P2P |

---

## 📞 Liên hệ hỗ trợ

- **Telegram:** @FunFarmSupport
- **Email:** admin@funfarm.love
- **Docs:** https://docs.funfarm.love/admin

---

> *"Luật Ánh Sáng - Minh bạch, Công bằng, Yêu thương"*  
> *© 2024 FUN Ecosystem. All rights reserved.*
