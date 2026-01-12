import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Search, Loader2, User } from "lucide-react";
import { format } from "date-fns";

interface DailyReward {
  date: string;
  qualityPosts: number;
  qualityPostsReward: number;
  normalPosts: number;
  normalPostsReward: number;
  likesReceived: number;
  likesReward: number;
  qualityComments: number;
  qualityCommentsReward: number;
  normalComments: number;
  normalCommentsReward: number;
  qualityShares: number;
  qualitySharesReward: number;
  normalShares: number;
  normalSharesReward: number;
  friendships: number;
  friendshipsReward: number;
  totalReward: number;
}

interface UserInfo {
  id: string;
  display_name: string;
  email: string;
  wallet_address: string;
  pending_reward: number;
  approved_reward: number;
  welcome_bonus_claimed: boolean;
  wallet_bonus_claimed: boolean;
  verification_bonus_claimed: boolean;
}

// Daily limits theo Luật Ánh Sáng v2.1
const MAX_POSTS_PER_DAY = 10;
const MAX_INTERACTIONS_PER_DAY = 50;
const MAX_FRIENDSHIPS_PER_DAY = 10;

// Reward values
const QUALITY_POST_REWARD = 20000;
const NORMAL_POST_REWARD = 5000;
const FIRST_THREE_LIKES_REWARD = 10000;
const REMAINING_LIKES_REWARD = 1000;
const QUALITY_COMMENT_REWARD = 5000;
const NORMAL_COMMENT_REWARD = 1000;
const QUALITY_SHARE_REWARD = 10000;
const NORMAL_SHARE_REWARD = 4000;
const FRIENDSHIP_REWARD = 50000;

export function UserDailyRewardExport() {
  const [searchQuery, setSearchQuery] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [dailyRewards, setDailyRewards] = useState<DailyReward[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const searchUser = async () => {
    if (!searchQuery.trim()) {
      toast.error("Vui lòng nhập tên hoặc ID user");
      return;
    }

    setLoading(true);
    try {
      // Search by ID or display_name
      let query = supabase
        .from("profiles")
        .select("id, display_name, email, wallet_address, pending_reward, approved_reward, welcome_bonus_claimed, wallet_bonus_claimed, verification_bonus_claimed");

      // Check if searchQuery is UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(searchQuery.trim())) {
        query = query.eq("id", searchQuery.trim());
      } else {
        query = query.ilike("display_name", `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query.limit(1).single();

      if (error || !data) {
        toast.error("Không tìm thấy user");
        setUserInfo(null);
        setDailyRewards([]);
        return;
      }

      setUserInfo(data);
      await calculateDailyRewards(data.id);
      toast.success(`Đã tìm thấy: ${data.display_name || "Chưa có tên"}`);
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Lỗi khi tìm kiếm user");
    } finally {
      setLoading(false);
    }
  };

  const calculateDailyRewards = async (userId: string) => {
    // Fetch all user activities
    const [postsRes, likesRes, commentsRes, sharesRes, friendshipsRes] = await Promise.all([
      supabase
        .from("posts")
        .select("id, content, images, video_url, created_at, post_type")
        .eq("author_id", userId)
        .eq("post_type", "post")
        .order("created_at", { ascending: true }),
      supabase
        .from("post_likes")
        .select("id, post_id, created_at, posts!inner(author_id)")
        .eq("posts.author_id", userId)
        .neq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("comments")
        .select("id, content, created_at, post_id, posts!inner(author_id)")
        .eq("posts.author_id", userId)
        .neq("author_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("posts")
        .select("id, share_comment, created_at, original_post_id, posts!original_post_id(author_id)")
        .eq("post_type", "share")
        .eq("posts.author_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("followers")
        .select("id, created_at, follower_id, following_id")
        .or(`follower_id.eq.${userId},following_id.eq.${userId}`)
        .eq("status", "accepted")
        .order("created_at", { ascending: true }),
    ]);

    const posts = postsRes.data || [];
    const likes = likesRes.data || [];
    const comments = commentsRes.data || [];
    const shares = sharesRes.data || [];
    const friendships = friendshipsRes.data || [];

    // Group by date
    const dailyMap: Record<string, DailyReward> = {};

    const getDateKey = (dateStr: string) => format(new Date(dateStr), "yyyy-MM-dd");

    const initDay = (dateKey: string): DailyReward => ({
      date: dateKey,
      qualityPosts: 0,
      qualityPostsReward: 0,
      normalPosts: 0,
      normalPostsReward: 0,
      likesReceived: 0,
      likesReward: 0,
      qualityComments: 0,
      qualityCommentsReward: 0,
      normalComments: 0,
      normalCommentsReward: 0,
      qualityShares: 0,
      qualitySharesReward: 0,
      normalShares: 0,
      normalSharesReward: 0,
      friendships: 0,
      friendshipsReward: 0,
      totalReward: 0,
    });

    // Process posts with daily limit
    const postsByDate: Record<string, typeof posts> = {};
    posts.forEach((post) => {
      const dateKey = getDateKey(post.created_at);
      if (!postsByDate[dateKey]) postsByDate[dateKey] = [];
      postsByDate[dateKey].push(post);
    });

    Object.entries(postsByDate).forEach(([dateKey, dayPosts]) => {
      if (!dailyMap[dateKey]) dailyMap[dateKey] = initDay(dateKey);
      
      const limitedPosts = dayPosts.slice(0, MAX_POSTS_PER_DAY);
      limitedPosts.forEach((post) => {
        const hasMedia = (post.images && post.images.length > 0) || !!post.video_url;
        const isQuality = (post.content?.length || 0) > 100 && hasMedia;
        
        if (isQuality) {
          dailyMap[dateKey].qualityPosts++;
          dailyMap[dateKey].qualityPostsReward += QUALITY_POST_REWARD;
        } else {
          dailyMap[dateKey].normalPosts++;
          dailyMap[dateKey].normalPostsReward += NORMAL_POST_REWARD;
        }
      });
    });

    // Process likes with daily limit and tiered rewards
    const likesByDate: Record<string, typeof likes> = {};
    likes.forEach((like) => {
      const dateKey = getDateKey(like.created_at);
      if (!likesByDate[dateKey]) likesByDate[dateKey] = [];
      likesByDate[dateKey].push(like);
    });

    // Group likes by post to apply first-3 logic
    Object.entries(likesByDate).forEach(([dateKey, dayLikes]) => {
      if (!dailyMap[dateKey]) dailyMap[dateKey] = initDay(dateKey);
      
      // Group by post_id
      const likesByPost: Record<string, number> = {};
      dayLikes.forEach((like) => {
        if (!likesByPost[like.post_id]) likesByPost[like.post_id] = 0;
        likesByPost[like.post_id]++;
      });

      let totalInteractions = 0;
      let totalLikeReward = 0;

      Object.values(likesByPost).forEach((count) => {
        if (totalInteractions >= MAX_INTERACTIONS_PER_DAY) return;
        
        const remaining = MAX_INTERACTIONS_PER_DAY - totalInteractions;
        const countToProcess = Math.min(count, remaining);
        
        // First 3 likes per post get 10k, rest get 1k
        const first3 = Math.min(3, countToProcess);
        const rest = countToProcess - first3;
        
        totalLikeReward += first3 * FIRST_THREE_LIKES_REWARD + rest * REMAINING_LIKES_REWARD;
        totalInteractions += countToProcess;
      });

      dailyMap[dateKey].likesReceived = Math.min(dayLikes.length, MAX_INTERACTIONS_PER_DAY);
      dailyMap[dateKey].likesReward = totalLikeReward;
    });

    // Process comments with daily limit
    const commentsByDate: Record<string, typeof comments> = {};
    comments.forEach((comment) => {
      const dateKey = getDateKey(comment.created_at);
      if (!commentsByDate[dateKey]) commentsByDate[dateKey] = [];
      commentsByDate[dateKey].push(comment);
    });

    Object.entries(commentsByDate).forEach(([dateKey, dayComments]) => {
      if (!dailyMap[dateKey]) dailyMap[dateKey] = initDay(dateKey);
      
      let processed = 0;
      dayComments.forEach((comment) => {
        if (processed >= MAX_INTERACTIONS_PER_DAY) return;
        processed++;
        
        const isQuality = (comment.content?.length || 0) > 20;
        if (isQuality) {
          dailyMap[dateKey].qualityComments++;
          dailyMap[dateKey].qualityCommentsReward += QUALITY_COMMENT_REWARD;
        } else {
          dailyMap[dateKey].normalComments++;
          dailyMap[dateKey].normalCommentsReward += NORMAL_COMMENT_REWARD;
        }
      });
    });

    // Process shares with daily limit
    const sharesByDate: Record<string, typeof shares> = {};
    shares.forEach((share) => {
      const dateKey = getDateKey(share.created_at);
      if (!sharesByDate[dateKey]) sharesByDate[dateKey] = [];
      sharesByDate[dateKey].push(share);
    });

    Object.entries(sharesByDate).forEach(([dateKey, dayShares]) => {
      if (!dailyMap[dateKey]) dailyMap[dateKey] = initDay(dateKey);
      
      let processed = 0;
      dayShares.forEach((share) => {
        if (processed >= MAX_INTERACTIONS_PER_DAY) return;
        processed++;
        
        const isQuality = (share.share_comment?.length || 0) >= 20;
        if (isQuality) {
          dailyMap[dateKey].qualityShares++;
          dailyMap[dateKey].qualitySharesReward += QUALITY_SHARE_REWARD;
        } else {
          dailyMap[dateKey].normalShares++;
          dailyMap[dateKey].normalSharesReward += NORMAL_SHARE_REWARD;
        }
      });
    });

    // Process friendships with daily limit
    const friendshipsByDate: Record<string, typeof friendships> = {};
    const processedPairs = new Set<string>();
    
    friendships.forEach((f) => {
      const pairKey = [f.follower_id, f.following_id].sort().join("-");
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);
      
      const dateKey = getDateKey(f.created_at);
      if (!friendshipsByDate[dateKey]) friendshipsByDate[dateKey] = [];
      friendshipsByDate[dateKey].push(f);
    });

    Object.entries(friendshipsByDate).forEach(([dateKey, dayFriendships]) => {
      if (!dailyMap[dateKey]) dailyMap[dateKey] = initDay(dateKey);
      
      const count = Math.min(dayFriendships.length, MAX_FRIENDSHIPS_PER_DAY);
      dailyMap[dateKey].friendships = count;
      dailyMap[dateKey].friendshipsReward = count * FRIENDSHIP_REWARD;
    });

    // Calculate totals for each day
    Object.values(dailyMap).forEach((day) => {
      day.totalReward =
        day.qualityPostsReward +
        day.normalPostsReward +
        day.likesReward +
        day.qualityCommentsReward +
        day.normalCommentsReward +
        day.qualitySharesReward +
        day.normalSharesReward +
        day.friendshipsReward;
    });

    // Sort by date descending
    const sorted = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
    setDailyRewards(sorted);
  };

  const exportToCSV = () => {
    if (!userInfo || dailyRewards.length === 0) {
      toast.error("Không có dữ liệu để xuất");
      return;
    }

    setExporting(true);

    try {
      const lines: string[] = [];
      
      // Header section
      lines.push("=== BÁO CÁO THƯỞNG THEO NGÀY - LUẬT ÁNH SÁNG v2.1 ===");
      lines.push(`User: ${userInfo.display_name || "Chưa có tên"}`);
      lines.push(`ID: ${userInfo.id}`);
      lines.push(`Email: ${userInfo.email || "Chưa có"}`);
      lines.push(`Ví: ${userInfo.wallet_address || "Chưa kết nối"}`);
      lines.push(`Xuất lúc: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}`);
      lines.push("");
      lines.push("=== BONUS ĐÃ NHẬN ===");
      lines.push(`Welcome Bonus (50k): ${userInfo.welcome_bonus_claimed ? "Đã nhận" : "Chưa nhận"}`);
      lines.push(`Wallet Bonus (50k): ${userInfo.wallet_bonus_claimed ? "Đã nhận" : "Chưa nhận"}`);
      lines.push(`Verification Bonus: ${userInfo.verification_bonus_claimed ? "Đã nhận" : "Chưa nhận"}`);
      lines.push("");
      lines.push("=== CHI TIẾT THƯỞNG THEO NGÀY ===");
      lines.push("");

      // CSV Header
      lines.push([
        "Ngày",
        "Bài CL",
        "CLC Bài CL",
        "Bài TT",
        "CLC Bài TT",
        "Like",
        "CLC Like",
        "Cmt CL",
        "CLC Cmt CL",
        "Cmt TT",
        "CLC Cmt TT",
        "Share CL",
        "CLC Share CL",
        "Share TT",
        "CLC Share TT",
        "Bạn bè",
        "CLC Bạn bè",
        "TỔNG NGÀY"
      ].join(","));

      // Data rows
      dailyRewards.forEach((day) => {
        lines.push([
          day.date,
          day.qualityPosts,
          day.qualityPostsReward,
          day.normalPosts,
          day.normalPostsReward,
          day.likesReceived,
          day.likesReward,
          day.qualityComments,
          day.qualityCommentsReward,
          day.normalComments,
          day.normalCommentsReward,
          day.qualityShares,
          day.qualitySharesReward,
          day.normalShares,
          day.normalSharesReward,
          day.friendships,
          day.friendshipsReward,
          day.totalReward
        ].join(","));
      });

      // Summary section
      lines.push("");
      lines.push("=== TỔNG KẾT ===");
      
      const totals = dailyRewards.reduce(
        (acc, day) => ({
          qualityPosts: acc.qualityPosts + day.qualityPosts,
          qualityPostsReward: acc.qualityPostsReward + day.qualityPostsReward,
          normalPosts: acc.normalPosts + day.normalPosts,
          normalPostsReward: acc.normalPostsReward + day.normalPostsReward,
          likes: acc.likes + day.likesReceived,
          likesReward: acc.likesReward + day.likesReward,
          qualityComments: acc.qualityComments + day.qualityComments,
          qualityCommentsReward: acc.qualityCommentsReward + day.qualityCommentsReward,
          normalComments: acc.normalComments + day.normalComments,
          normalCommentsReward: acc.normalCommentsReward + day.normalCommentsReward,
          qualityShares: acc.qualityShares + day.qualityShares,
          qualitySharesReward: acc.qualitySharesReward + day.qualitySharesReward,
          normalShares: acc.normalShares + day.normalShares,
          normalSharesReward: acc.normalSharesReward + day.normalSharesReward,
          friendships: acc.friendships + day.friendships,
          friendshipsReward: acc.friendshipsReward + day.friendshipsReward,
          total: acc.total + day.totalReward,
        }),
        {
          qualityPosts: 0,
          qualityPostsReward: 0,
          normalPosts: 0,
          normalPostsReward: 0,
          likes: 0,
          likesReward: 0,
          qualityComments: 0,
          qualityCommentsReward: 0,
          normalComments: 0,
          normalCommentsReward: 0,
          qualityShares: 0,
          qualitySharesReward: 0,
          normalShares: 0,
          normalSharesReward: 0,
          friendships: 0,
          friendshipsReward: 0,
          total: 0,
        }
      );

      lines.push(`Bài chất lượng: ${totals.qualityPosts} bài = ${totals.qualityPostsReward.toLocaleString()} CLC`);
      lines.push(`Bài thường: ${totals.normalPosts} bài = ${totals.normalPostsReward.toLocaleString()} CLC`);
      lines.push(`Like nhận được: ${totals.likes} like = ${totals.likesReward.toLocaleString()} CLC`);
      lines.push(`Comment chất lượng: ${totals.qualityComments} cmt = ${totals.qualityCommentsReward.toLocaleString()} CLC`);
      lines.push(`Comment thường: ${totals.normalComments} cmt = ${totals.normalCommentsReward.toLocaleString()} CLC`);
      lines.push(`Share chất lượng: ${totals.qualityShares} share = ${totals.qualitySharesReward.toLocaleString()} CLC`);
      lines.push(`Share thường: ${totals.normalShares} share = ${totals.normalSharesReward.toLocaleString()} CLC`);
      lines.push(`Kết bạn: ${totals.friendships} = ${totals.friendshipsReward.toLocaleString()} CLC`);
      lines.push("");
      lines.push(`TỔNG THƯỞNG HOẠT ĐỘNG: ${totals.total.toLocaleString()} CLC`);
      lines.push("");
      lines.push("=== SO SÁNH ===");
      lines.push(`Pending reward trong DB: ${userInfo.pending_reward.toLocaleString()} CLC`);
      lines.push(`Approved reward trong DB: ${userInfo.approved_reward.toLocaleString()} CLC`);
      lines.push(`Chênh lệch: ${(userInfo.pending_reward - totals.total).toLocaleString()} CLC`);

      // Download
      const csvContent = lines.join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reward_report_${userInfo.display_name?.replace(/\s+/g, "_") || userInfo.id}_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Đã xuất báo cáo CSV thành công!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Lỗi khi xuất CSV");
    } finally {
      setExporting(false);
    }
  };

  const formatCLC = (value: number) => value.toLocaleString();

  const totals = dailyRewards.reduce(
    (acc, day) => ({
      qualityPosts: acc.qualityPosts + day.qualityPosts,
      normalPosts: acc.normalPosts + day.normalPosts,
      likes: acc.likes + day.likesReceived,
      comments: acc.comments + day.qualityComments + day.normalComments,
      shares: acc.shares + day.qualityShares + day.normalShares,
      friendships: acc.friendships + day.friendships,
      total: acc.total + day.totalReward,
    }),
    { qualityPosts: 0, normalPosts: 0, likes: 0, comments: 0, shares: 0, friendships: 0, total: 0 }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Xuất báo cáo thưởng theo ngày
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Nhập tên user hoặc UUID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchUser()}
            className="flex-1"
          />
          <Button onClick={searchUser} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-2">Tìm</span>
          </Button>
        </div>

        {/* User Info */}
        {userInfo && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{userInfo.display_name || "Chưa có tên"}</h3>
                <p className="text-sm text-muted-foreground">{userInfo.email}</p>
                <p className="text-xs text-muted-foreground font-mono">{userInfo.id}</p>
              </div>
              <Button onClick={exportToCSV} disabled={exporting || dailyRewards.length === 0}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                <span className="ml-2">Xuất CSV</span>
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-background rounded p-3">
                <p className="text-xs text-muted-foreground">Pending Reward</p>
                <p className="font-bold text-primary">{formatCLC(userInfo.pending_reward)} CLC</p>
              </div>
              <div className="bg-background rounded p-3">
                <p className="text-xs text-muted-foreground">Approved Reward</p>
                <p className="font-bold text-green-600">{formatCLC(userInfo.approved_reward)} CLC</p>
              </div>
              <div className="bg-background rounded p-3">
                <p className="text-xs text-muted-foreground">Tính toán</p>
                <p className="font-bold text-blue-600">{formatCLC(totals.total)} CLC</p>
              </div>
              <div className="bg-background rounded p-3">
                <p className="text-xs text-muted-foreground">Chênh lệch</p>
                <p className={`font-bold ${userInfo.pending_reward - totals.total > 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCLC(userInfo.pending_reward - totals.total)} CLC
                </p>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2 text-center">
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Bài CL</p>
                <p className="font-semibold">{totals.qualityPosts}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Bài TT</p>
                <p className="font-semibold">{totals.normalPosts}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Like</p>
                <p className="font-semibold">{totals.likes}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Comment</p>
                <p className="font-semibold">{totals.comments}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Share</p>
                <p className="font-semibold">{totals.shares}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-xs text-muted-foreground">Bạn bè</p>
                <p className="font-semibold">{totals.friendships}</p>
              </div>
            </div>
          </div>
        )}

        {/* Daily Rewards Table */}
        {dailyRewards.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-2 text-left">Ngày</th>
                  <th className="px-2 py-2 text-center">Bài CL</th>
                  <th className="px-2 py-2 text-center">Bài TT</th>
                  <th className="px-2 py-2 text-center">Like</th>
                  <th className="px-2 py-2 text-center">Cmt CL</th>
                  <th className="px-2 py-2 text-center">Cmt TT</th>
                  <th className="px-2 py-2 text-center">Share CL</th>
                  <th className="px-2 py-2 text-center">Share TT</th>
                  <th className="px-2 py-2 text-center">Bạn bè</th>
                  <th className="px-2 py-2 text-right">Tổng (CLC)</th>
                </tr>
              </thead>
              <tbody>
                {dailyRewards.slice(0, 30).map((day) => (
                  <tr key={day.date} className="border-b hover:bg-muted/30">
                    <td className="px-2 py-2 font-mono text-xs">{day.date}</td>
                    <td className="px-2 py-2 text-center">
                      {day.qualityPosts > 0 && (
                        <span className="text-green-600">{day.qualityPosts}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {day.normalPosts > 0 && (
                        <span className="text-muted-foreground">{day.normalPosts}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {day.likesReceived > 0 && (
                        <span className="text-pink-600">{day.likesReceived}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {day.qualityComments > 0 && (
                        <span className="text-blue-600">{day.qualityComments}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {day.normalComments > 0 && (
                        <span className="text-muted-foreground">{day.normalComments}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {day.qualityShares > 0 && (
                        <span className="text-purple-600">{day.qualityShares}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {day.normalShares > 0 && (
                        <span className="text-muted-foreground">{day.normalShares}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {day.friendships > 0 && (
                        <span className="text-orange-600">{day.friendships}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold">
                      {formatCLC(day.totalReward)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dailyRewards.length > 30 && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                Hiển thị 30/{dailyRewards.length} ngày. Xuất CSV để xem đầy đủ.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
