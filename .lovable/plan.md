
# Tổng Hợp: Bảng Vinh Danh & Hệ Sinh Thái FUN Ecosystem

Tài liệu này đóng gói toàn bộ thiết kế, công thức và code của các bảng xếp hạng để sử dụng cho các nền tảng khác trong FUN Ecosystem.

---

## 1. Tổng Quan Các Components

| Component | Vị trí | Chức năng |
|-----------|--------|-----------|
| **HonorBoard** | Feed Right Sidebar | Thống kê cộng đồng: users, posts, photos, videos, total reward |
| **ProfileHonorBoard** | Trang Profile | Thống kê cá nhân: posts, reactions, comments, shares, friends, claimable/claimed |
| **TopRanking** | Feed Right Sidebar | Bảng xếp hạng Top 10 users theo total_reward |
| **TopSponsor** | Feed Right Sidebar | Bảng xếp hạng Top 10 nhà tài trợ theo total_sent |
| **EcosystemSidebar** | Feed Left Sidebar | Navigation đến các nền tảng trong FUN Ecosystem |

---

## 2. Design System Chung

### 2.1 Màu Sắc Chính

```css
/* Primary Gold - Viền và text nổi bật */
--gold-primary: #fbbf24;      /* Amber-400 */
--gold-bright: #ffd700;       /* Gold sáng */
--gold-text: #fbbf24;         /* Text vàng */

/* Green Mirror Gradient - Rows */
--green-light: #4ade80;       /* Green-400 */
--green-medium: #22c55e;      /* Green-500 */
--green-dark: #16a34a;        /* Green-600 */
--green-darker: #15803d;      /* Green-700 */
--green-darkest: #166534;     /* Green-800 */
```

### 2.2 Container Style (Liquid Glass Effect)

```javascript
const containerStyle = {
  background: 'linear-gradient(135deg, rgba(120,200,255,0.12) 0%, rgba(255,255,255,0.08) 30%, rgba(180,220,255,0.15) 70%, rgba(255,255,255,0.1) 100%)',
  backdropFilter: 'saturate(120%)',
  border: '3px solid #fbbf24',
  borderRadius: '20px',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(200,150,0,0.4), 0 0 20px rgba(251,191,36,0.4), 0 8px 32px rgba(0,0,0,0.25)',
};
```

### 2.3 Stat Row Style (Green Mirror Gradient)

```javascript
// Stat row thường
const statRowStyle = {
  background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 30%, #16a34a 60%, #15803d 100%)',
  border: '2px solid #fbbf24',
  borderRadius: '20px',
  boxShadow: 'inset 0 8px 16px rgba(255,255,255,0.5), inset 0 -4px 12px rgba(0,0,0,0.2), 0 0 10px rgba(251,191,36,0.5), 0 4px 8px rgba(0,0,0,0.3)',
};

// Total row (đậm hơn, border dày hơn)
const totalRowStyle = {
  background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 40%, #15803d 70%, #166534 100%)',
  border: '2.5px solid #fbbf24',
  borderRadius: '20px',
  boxShadow: 'inset 0 10px 20px rgba(255,255,255,0.45), inset 0 -5px 15px rgba(0,0,0,0.25), 0 0 15px rgba(251,191,36,0.6), 0 6px 12px rgba(0,0,0,0.35)',
};

// User row cho Top 3 (premium style)
const userRowTop3Style = {
  background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 40%, #15803d 70%, #166534 100%)',
  border: '2.5px solid #fbbf24',
  borderRadius: '20px',
  boxShadow: 'inset 0 10px 20px rgba(255,255,255,0.45), inset 0 -5px 15px rgba(0,0,0,0.25), 0 0 15px rgba(251,191,36,0.6), 0 6px 12px rgba(0,0,0,0.35)',
};
```

### 2.4 Text Styles

```javascript
// Title Style (HONOR BOARD, TOP RANKING)
const titleStyle = {
  fontFamily: "system-ui, -apple-system, sans-serif",
  fontWeight: 900,
  fontSize: '1.7rem', // compact: 1.4rem
  color: '#ffd700',
  textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 25px rgba(255,215,0,0.7)',
  letterSpacing: '0.15em',
};

// Label Style (TOTAL USERS, TOTAL POSTS...)
const labelStyle = {
  color: '#fbbf24',
  textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 10px rgba(251,191,36,0.5)',
};

// Value Style (số liệu)
const valueStyle = {
  color: '#ffffff', // hoặc #ffd700 cho gold
  textShadow: '0 2px 4px rgba(0,0,0,0.9)',
};
```

### 2.5 CSS Class Quan Trọng

```css
/* Hiệu ứng bóng gương chạy qua - Thêm vào index.css */
.stat-row-shine {
  position: relative;
  overflow: hidden;
}

.stat-row-shine::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shine 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes shine {
  0% { left: -100%; }
  50%, 100% { left: 100%; }
}
```

---

## 3. HonorBoard (Bảng Vinh Danh Cộng Đồng)

### 3.1 Interface

```typescript
interface HonorStats {
  totalUsers: number;
  totalPosts: number;
  totalPhotos: number;
  totalVideos: number;
  totalReward: number;
}

interface HonorBoardProps {
  compact?: boolean; // true cho mobile
}
```

### 3.2 Công Thức Tính Total Reward

```typescript
// TOTAL REWARD = Đã claim on-chain (cố định) + Tổng pending_reward hiện tại
const CLAIMED_ON_BSC = 28986000; // Cập nhật định kỳ từ blockchain_cache

const fetchStats = async () => {
  // Đếm users
  const { count: usersCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  // Đếm posts (không tính share)
  const { count: postsCount } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .neq("post_type", "share");

  // Đếm photos/videos từ mảng images
  const { data: postsWithMedia } = await supabase
    .from("posts")
    .select("images, video_url");

  let totalPhotos = 0;
  let totalVideos = 0;

  const isVideoUrl = (url: string): boolean => {
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.mp4') || lowerUrl.includes('.webm') || lowerUrl.includes('.mov');
  };

  postsWithMedia?.forEach((post) => {
    if (post.images && Array.isArray(post.images)) {
      post.images.forEach((url: string) => {
        if (isVideoUrl(url)) {
          totalVideos += 1;
        } else {
          totalPhotos += 1;
        }
      });
    }
    if (post.video_url) {
      totalVideos += 1;
    }
  });

  // Tổng pending reward
  const { data: rewardsData } = await supabase
    .from("profiles")
    .select("pending_reward");

  const totalPendingReward = rewardsData?.reduce((sum, profile) => {
    return sum + (profile.pending_reward || 0);
  }, 0) || 0;

  const totalReward = CLAIMED_ON_BSC + totalPendingReward;

  return { totalUsers: usersCount || 0, totalPosts: postsCount || 0, totalPhotos, totalVideos, totalReward };
};
```

### 3.3 Animated Counter Component

```typescript
const AnimatedCounter = ({ value, duration = 1500 }: { value: number; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const countRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (countRef.current) clearInterval(countRef.current);
    
    const startValue = displayValue;
    const difference = value - startValue;
    const steps = 60;
    const stepValue = difference / steps;
    const stepDuration = duration / steps;
    let currentStep = 0;

    countRef.current = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(value);
        clearInterval(countRef.current);
      } else {
        setDisplayValue(Math.round(startValue + stepValue * currentStep));
      }
    }, stepDuration);

    return () => {
      if (countRef.current) clearInterval(countRef.current);
    };
  }, [value]);

  return <span>{displayValue.toLocaleString("vi-VN")}</span>;
};
```

### 3.4 Auto Refresh (5 phút)

```typescript
useEffect(() => {
  fetchStats();
  const interval = setInterval(fetchStats, 5 * 60 * 1000); // 5 phút
  return () => clearInterval(interval);
}, []);
```

---

## 4. ProfileHonorBoard (Bảng Vinh Danh Cá Nhân)

### 4.1 Interface

```typescript
interface ProfileHonorBoardProps {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  variant?: 'cover' | 'standalone'; // cover = trên cover photo, standalone = riêng lẻ
}

interface ProfileStats {
  postsCount: number;
  reactionsGiven: number;
  reactionsReceived: number;
  commentsGiven: number;
  commentsReceived: number;
  sharesGiven: number;
  sharesReceived: number;
  friendsCount: number;
  nftsCount: number;
  claimable: number;      // pending_reward + approved_reward
  claimed: number;        // camly_balance
  camlyBalance: number;
  totalSent: number;      // Tổng đã gửi gift
  totalReceivedFromUsers: number; // Tổng đã nhận gift từ users khác
}
```

### 4.2 Công Thức Tính (V3.1 Logic)

```typescript
const fetchStats = async () => {
  if (!userId) return;
  
  // Lấy post IDs của user
  const { data: userPosts } = await supabase
    .from('posts')
    .select('id')
    .eq('author_id', userId);
  
  const userPostIds = (userPosts || []).map(p => p.id);

  const [
    postsResult,
    reactionsGivenResult,
    reactionsReceivedResult,  // Exclude self-likes
    commentsGivenResult,
    commentsReceivedResult,   // Exclude self-comments
    sharesGivenResult,
    sharesReceivedResult,     // Exclude self-shares
    friendsResult1,
    friendsResult2,
    profileResult,
    sentResult,
    receivedResult
  ] = await Promise.all([
    // Posts count (không tính share)
    supabase.from('posts').select('id', { count: 'exact', head: true })
      .eq('author_id', userId).neq('post_type', 'share'),
    
    // Reactions given
    supabase.from('post_likes').select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    
    // Reactions received (EXCLUDE self-likes per V3.0 reward logic)
    userPostIds.length > 0
      ? supabase.from('post_likes').select('id', { count: 'exact', head: true })
          .in('post_id', userPostIds).neq('user_id', userId)
      : Promise.resolve({ count: 0 }),
    
    // Comments given
    supabase.from('comments').select('id', { count: 'exact', head: true })
      .eq('author_id', userId),
    
    // Comments received (EXCLUDE self-comments per V3.0 reward logic)
    userPostIds.length > 0
      ? supabase.from('comments').select('id', { count: 'exact', head: true })
          .in('post_id', userPostIds).neq('author_id', userId)
      : Promise.resolve({ count: 0 }),
    
    // Shares given
    supabase.from('posts').select('id', { count: 'exact', head: true })
      .eq('author_id', userId).eq('post_type', 'share'),
    
    // Shares received (EXCLUDE self-share per V3.0 reward logic)
    userPostIds.length > 0
      ? supabase.from('post_shares').select('id', { count: 'exact', head: true })
          .in('post_id', userPostIds).neq('user_id', userId)
      : Promise.resolve({ count: 0 }),
    
    // Friends (follower + following với status accepted)
    supabase.from('followers').select('id', { count: 'exact', head: true })
      .eq('follower_id', userId).eq('status', 'accepted'),
    supabase.from('followers').select('id', { count: 'exact', head: true })
      .eq('following_id', userId).eq('status', 'accepted'),
    
    // Profile data
    supabase.from('profiles').select('pending_reward, approved_reward, camly_balance')
      .eq('id', userId).maybeSingle(),
    
    // Wallet transactions - sent
    supabase.from('wallet_transactions').select('amount')
      .eq('sender_id', userId).eq('status', 'completed'),
    
    // Wallet transactions - received
    supabase.from('wallet_transactions').select('amount')
      .eq('receiver_id', userId).eq('status', 'completed')
  ]);

  const pendingReward = profileResult.data?.pending_reward || 0;
  const approvedReward = profileResult.data?.approved_reward || 0;
  const camlyBalance = profileResult.data?.camly_balance || 0;
  
  const totalSent = (sentResult.data || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalReceivedFromUsers = (receivedResult.data || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);

  // Công thức tổng kết
  const totalReward = claimable + claimed; // pending + approved + camly_balance
  const totalReceived = totalReward + totalReceivedFromUsers;
  const totalMoney = totalSent + totalReceived;

  return {
    postsCount: postsResult.count || 0,
    reactionsGiven: reactionsGivenResult.count || 0,
    reactionsReceived: (reactionsReceivedResult as any).count || 0,
    commentsGiven: commentsGivenResult.count || 0,
    commentsReceived: (commentsReceivedResult as any).count || 0,
    sharesGiven: sharesGivenResult.count || 0,
    sharesReceived: (sharesReceivedResult as any).count || 0,
    friendsCount: (friendsResult1.count || 0) + (friendsResult2.count || 0),
    nftsCount: 0, // Reserved for future
    claimable: pendingReward + approvedReward,
    claimed: camlyBalance,
    camlyBalance,
    totalSent,
    totalReceivedFromUsers,
  };
};
```

### 4.3 Query Utilities (Loại trừ self-interactions & banned/deleted users)

```typescript
// src/lib/honorBoardQueries.ts

export interface HonorBoardQueryParams {
  userId: string;
  userPostIds: string[];
  validUserIds?: string[]; // Only count interactions from these users
}

// Lấy list valid user IDs (active, not banned, not deleted)
export async function getValidUserIds(): Promise<string[]> {
  const { data: activeProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('banned', false);
  
  const { data: deletedUsers } = await supabase
    .from('deleted_users')
    .select('user_id');
  
  const deletedUserIds = new Set(deletedUsers?.map(d => d.user_id) || []);
  
  return activeProfiles
    ?.filter(p => !deletedUserIds.has(p.id))
    .map(p => p.id) || [];
}

// Fetch reactions received (exclude self + banned/deleted)
export async function fetchReactionsReceived({ userId, userPostIds, validUserIds }: HonorBoardQueryParams): Promise<number> {
  if (userPostIds.length === 0) return 0;
  
  let query = supabase
    .from('post_likes')
    .select('id', { count: 'exact', head: true })
    .in('post_id', userPostIds)
    .neq('user_id', userId); // Exclude self-likes
  
  if (validUserIds && validUserIds.length > 0) {
    query = query.in('user_id', validUserIds);
  }
  
  const { count } = await query;
  return count || 0;
}

// Tương tự cho comments và shares...
```

---

## 5. TopRanking (Bảng Xếp Hạng)

### 5.1 Interface

```typescript
interface TopUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_reward: number;
  is_good_heart: boolean;
}

interface TopRankingProps {
  compact?: boolean;
}
```

### 5.2 Công Thức Ranking

```typescript
const fetchTopUsers = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, pending_reward, camly_balance, is_good_heart")
    .order("pending_reward", { ascending: false })
    .limit(20);

  if (error) throw error;

  // Total reward = pending_reward + camly_balance
  const transformedUsers: TopUser[] = (data || []).map((user) => ({
    id: user.id,
    display_name: user.display_name || "Nông dân FUN",
    avatar_url: user.avatar_url,
    total_reward: (user.pending_reward || 0) + (user.camly_balance || 0),
    is_good_heart: user.is_good_heart || false,
  }));

  // Re-sort by total_reward (vì query chỉ sort theo pending_reward)
  transformedUsers.sort((a, b) => b.total_reward - a.total_reward);
  
  return transformedUsers;
};
```

### 5.3 Phoenix Frame System (Top 5)

```typescript
// Assets cần có:
// - top1-frame.png (Khung vàng phượng hoàng)
// - top2-frame.png (Khung bạc)
// - top3-frame.png (Khung đồng)
// - top4-frame.png (Khung xanh lá)
// - top5-frame.png (Khung tím)

const frameImages: Record<number, string> = {
  1: top1Frame,
  2: top2Frame,
  3: top3Frame,
  4: top4Frame,
  5: top5Frame,
};

const glowColors: Record<number, string> = {
  1: 'rgba(251, 191, 36, 1)',     // Vàng sáng
  2: 'rgba(156, 163, 175, 0.9)',  // Bạc
  3: 'rgba(217, 119, 6, 0.9)',    // Đồng
  4: 'rgba(34, 197, 94, 0.9)',    // Xanh lá
  5: 'rgba(168, 85, 247, 0.9)',   // Tím
};

const LaurelFrame = ({ rank }: { rank: number }) => {
  const frameImage = frameImages[rank] || top5Frame;
  const glowSize = rank === 1 ? 18 : 12;
  const glowColor = glowColors[rank] || glowColors[5];
  
  return (
    <div 
      className="absolute inset-0 flex items-center justify-center"
      style={{
        filter: `drop-shadow(0 0 ${glowSize}px ${glowColor})`,
      }}
    >
      <img 
        src={frameImage} 
        alt="frame" 
        className="w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );
};
```

### 5.4 Avatar Positioning trong Frame

```typescript
// Avatar nằm ở 42% từ trên xuống, căn giữa ngang
<div 
  className="relative flex-shrink-0"
  style={{ 
    width: rank === 1 ? 140 : 130, 
    height: rank === 1 ? 100 : 92,
  }}
>
  <LaurelFrame rank={rank} />
  <Avatar 
    className="absolute rounded-full"
    style={{ 
      width: rank === 1 ? 48 : 44, 
      height: rank === 1 ? 48 : 44, 
      top: '42%',          // Quan trọng: 42% từ trên xuống
      left: '50%',         // Căn giữa ngang
      transform: 'translate(-50%, -50%)',
      border: `2px solid ${isTop3 ? '#fbbf24' : 'rgba(251, 191, 36, 0.5)'}`,
      boxShadow: isTop3 ? '0 0 8px rgba(251, 191, 36, 0.5)' : 'none',
      zIndex: 10,          // Trên frame
    }}
  >
    <AvatarImage src={user.avatar_url || ""} alt={user.display_name} />
    <AvatarFallback>...</AvatarFallback>
  </Avatar>
</div>
```

---

## 6. TopSponsor (Nhà Tài Trợ Thiên Thần)

### 6.1 Interface

```typescript
interface TopSponsorUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_sent: number;
}
```

### 6.2 Công Thức Tính Top Sponsor

```typescript
const fetchTopSponsors = async () => {
  // Aggregate từ wallet_transactions
  const { data: transactionData, error: txError } = await supabase
    .from('wallet_transactions')
    .select('sender_id, amount')
    .eq('status', 'completed');

  if (txError) throw txError;

  // Tính tổng theo sender_id
  const senderTotals: Record<string, number> = {};
  transactionData?.forEach(tx => {
    senderTotals[tx.sender_id] = (senderTotals[tx.sender_id] || 0) + tx.amount;
  });

  // Sort và lấy top 20
  const sortedSenders = Object.entries(senderTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  if (sortedSenders.length === 0) {
    return [];
  }

  const senderIds = sortedSenders.map(([id]) => id);

  // Fetch profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', senderIds);

  if (profileError) throw profileError;

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  // Combine data
  const sponsors: TopSponsorUser[] = sortedSenders.map(([id, total]) => {
    const profile = profileMap.get(id);
    return {
      id,
      display_name: profile?.display_name || 'Người dùng',
      avatar_url: profile?.avatar_url || null,
      total_sent: total,
    };
  });

  return sponsors;
};
```

---

## 7. EcosystemSidebar (Navigation Hệ Sinh Thái)

### 7.1 Platform Configuration

```typescript
interface Platform {
  name: string;
  logo: string;
  link: string | null;
  internal?: boolean; // true = React Router, false = external link
}

const platforms: Platform[] = [
  { name: "FUN Profile", logo: funProfileLogo, link: "https://fun.rich/" },
  { name: "FUN Play", logo: funPlayLogo, link: "https://play.fun.rich/" },
  { name: "FUN Planet", logo: funPlanetLogo, link: "https://planet.fun.rich/" },
  { name: "FUN Charity", logo: funCharityLogo, link: "https://angelaivan.fun.rich/" },
  { name: "FUN Wallet", logo: funWalletLogo, link: "https://funwallet-rich.lovable.app/dashboard" },
  { name: "Angel AI", logo: angelAiLogo, link: "/angel-ai", internal: true },
  { name: "Green Earth", logo: greenEarthLogo, link: "https://greenearth-fun.lovable.app" },
  { name: "Camly Coin", logo: camlyCoinLogo, link: "https://camly.co/" },
  { name: "FUN Money", logo: funMoneyLogo, link: null }, // Coming soon
  { name: "FUN Life", logo: funLifeLogo, link: null },   // Coming soon
];
```

### 7.2 Sticky Scroll Container

```typescript
<div
  className="sticky top-24 space-y-4 overflow-y-auto scrollbar-thin pr-2"
  style={{
    maxHeight: "calc(100vh - 120px)",
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(16, 185, 129, 0.5) transparent",
  }}
>
  {/* Content */}
</div>
```

### 7.3 Collapsible Menu (About Section)

```typescript
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const [aboutOpen, setAboutOpen] = useState(false);

<Collapsible open={aboutOpen} onOpenChange={setAboutOpen}>
  <CollapsibleTrigger asChild>
    <button className="stat-row-shine flex items-center gap-3 w-full p-3 rounded-xl">
      {/* Logo + Title + ChevronDown */}
      <ChevronDown 
        className={cn(
          "w-5 h-5 text-amber-300 transition-transform duration-200",
          aboutOpen && "rotate-180"
        )} 
      />
    </button>
  </CollapsibleTrigger>
  
  <CollapsibleContent className="pl-4 space-y-2 mb-3">
    {/* Sub-menu items */}
  </CollapsibleContent>
</Collapsible>
```

---

## 8. Assets Cần Thiết

```text
src/assets/
├── camly_coin.png              # Logo CAMLY coin (spinning animation)
├── logo_fun_farm_web3.png      # Logo FUN FARM
├── top1-frame.png              # Phoenix frame - Vàng
├── top2-frame.png              # Phoenix frame - Bạc
├── top3-frame.png              # Phoenix frame - Đồng
├── top4-frame.png              # Phoenix frame - Xanh lá
├── top5-frame.png              # Phoenix frame - Tím
└── platforms/
    ├── fun-profile.png
    ├── fun-play.png
    ├── fun-planet.png
    ├── fun-charity.png
    ├── fun-wallet.png
    ├── angel-ai.png
    ├── green-earth.png
    ├── fun-money.png
    └── fun-life.png
```

---

## 9. CSS Animations Cần Thêm

```css
/* Thêm vào src/index.css */

/* Hiệu ứng bóng gương chạy qua stat rows */
.stat-row-shine {
  position: relative;
  overflow: hidden;
}

.stat-row-shine::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shine 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes shine {
  0% { left: -100%; }
  50%, 100% { left: 100%; }
}

/* Sparkle effects */
.animate-ping {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}

/* CAMLY coin spin */
.animate-spin {
  animation: spin 4s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## 10. Database Tables Cần Thiết

```sql
-- profiles (bảng chính)
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  pending_reward BIGINT DEFAULT 0,
  approved_reward BIGINT DEFAULT 0,
  camly_balance BIGINT DEFAULT 0,
  is_good_heart BOOLEAN DEFAULT FALSE,
  banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id),
  content TEXT,
  images TEXT[],
  video_url TEXT,
  post_type TEXT DEFAULT 'post', -- 'post', 'share', 'gift'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- post_likes
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  post_id UUID REFERENCES posts(id),
  reaction_type TEXT DEFAULT 'like',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id),
  post_id UUID REFERENCES posts(id),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- post_shares
CREATE TABLE post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  post_id UUID REFERENCES posts(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- followers (friendship)
CREATE TABLE followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES profiles(id),
  following_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- wallet_transactions (gift/sponsor tracking)
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id),
  receiver_id UUID REFERENCES profiles(id),
  amount BIGINT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- deleted_users (archive)
CREATE TABLE deleted_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  display_name TEXT,
  deleted_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 11. Hướng Dẫn Triển Khai

### 11.1 Copy Files

```bash
# Copy components
cp src/components/HonorBoard.tsx <project>/src/components/
cp src/components/profile/ProfileHonorBoard.tsx <project>/src/components/profile/
cp src/components/TopRanking.tsx <project>/src/components/
cp src/components/wallet/TopSponsor.tsx <project>/src/components/wallet/
cp src/components/feed/EcosystemSidebar.tsx <project>/src/components/feed/

# Copy utilities
cp src/lib/honorBoardQueries.ts <project>/src/lib/

# Copy assets
cp -r src/assets/top*.png <project>/src/assets/
cp src/assets/camly_coin.png <project>/src/assets/
cp src/assets/logo_fun_farm_web3.png <project>/src/assets/
cp -r src/assets/platforms/ <project>/src/assets/platforms/
```

### 11.2 Update CSS

Thêm các keyframes và classes vào `src/index.css` như đã nêu ở Section 9.

### 11.3 Customize

- Thay đổi logo từ `logo_fun_farm_web3.png` sang logo của platform mới
- Cập nhật `CLAIMED_ON_BSC` constant nếu có
- Thay đổi danh sách platforms trong EcosystemSidebar
- Điều chỉnh màu sắc nếu cần (thay green palette sang màu khác)

---

## 12. Tóm Tắt

| Component | Data Source | Refresh | Key Formula |
|-----------|-------------|---------|-------------|
| HonorBoard | profiles, posts | 5 phút | totalReward = CLAIMED_ON_BSC + sum(pending_reward) |
| ProfileHonorBoard | profiles, posts, likes, comments, shares, followers, wallet_transactions | On mount | totalMoney = totalSent + (claimable + claimed + receivedFromUsers) |
| TopRanking | profiles | 5 phút | total_reward = pending_reward + camly_balance |
| TopSponsor | wallet_transactions, profiles | 5 phút | total_sent = sum(completed transactions) |
| EcosystemSidebar | Static config | - | - |

Tất cả components đều sử dụng chung **Design System** với:
- Liquid Glass container effect
- Green Mirror gradient cho stat rows
- Golden border và text highlights
- Animated counter cho số liệu
- Phoenix frames cho Top 5 rankings
- Sparkle effects và shine animations

Chúc bạn triển khai thành công! 💖✨
