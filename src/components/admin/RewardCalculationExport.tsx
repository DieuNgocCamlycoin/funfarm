import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Download, RefreshCw, Loader2, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  DAILY_REWARD_CAP, 
  QUALITY_POST_REWARD, 
  LIKE_REWARD, 
  QUALITY_COMMENT_REWARD, 
  SHARE_REWARD, 
  FRIENDSHIP_REWARD,
  WELCOME_BONUS,
  WALLET_CONNECT_BONUS,
  MAX_POSTS_PER_DAY,
  MAX_INTERACTIONS_PER_DAY,
  MAX_SHARES_PER_DAY,
  MAX_FRIENDSHIPS_PER_DAY
} from "@/lib/constants";

interface UserRewardCalculation {
  id: string;
  display_name: string;
  wallet_address: string;
  pending_reward: number;
  approved_reward: number;
  camly_balance: number;
  current_total: number;
  welcome_bonus_claimed: boolean;
  wallet_bonus_claimed: boolean;
  is_verified: boolean;
  quality_posts: number;
  likes_received: number;
  quality_comments: number;
  shares_received: number;
  friendships: number;
  welcome_bonus: number;
  wallet_bonus: number;
  post_reward: number;
  like_reward: number;
  comment_reward: number;
  share_reward: number;
  friendship_reward: number;
  daily_rewards_total: number;
  calculated_total: number;
  created_at: string;
}

export function RewardCalculationExport() {
  const [users, setUsers] = useState<UserRewardCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    if (!initialLoaded) {
      fetchCalculations();
      setInitialLoaded(true);
    }
  }, [initialLoaded]);

  const resetSingleUser = async (userId: string, calculatedTotal: number) => {
    setResettingUserId(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vui lòng đăng nhập lại');
        return;
      }

      const response = await supabase.functions.invoke('reset-reward', {
        body: { userId, amount: calculatedTotal },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      if (data.success) {
        toast.success(`Đã reset ${formatNumber(calculatedTotal)} CLC cho user`);
        setUsers(prev => prev.map(u => 
          u.id === userId 
            ? { ...u, pending_reward: calculatedTotal, current_total: calculatedTotal + u.approved_reward + u.camly_balance }
            : u
        ));
      } else {
        toast.error(data.message || 'Có lỗi xảy ra');
      }
    } catch (error: any) {
      console.error('Error resetting user reward:', error);
      toast.error('Lỗi khi reset: ' + error.message);
    } finally {
      setResettingUserId(null);
    }
  };

  const resetAllRewards = async () => {
    setResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vui lòng đăng nhập lại');
        return;
      }

      const response = await supabase.functions.invoke('reset-all-rewards', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      if (data.success) {
        toast.success(data.message);
        await fetchCalculations();
      } else {
        toast.error(data.message || 'Có lỗi xảy ra');
      }
    } catch (error: any) {
      console.error('Error resetting rewards:', error);
      toast.error('Lỗi khi reset: ' + error.message);
    } finally {
      setResetting(false);
    }
  };

  const fetchCalculations = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('pending_reward', { ascending: false });

      if (profileError) throw profileError;

      // Helper functions
      const groupByDate = <T,>(items: T[], getDate: (item: T) => string): Map<string, T[]> => {
        const grouped = new Map<string, T[]>();
        for (const item of items) {
          const date = getDate(item).split('T')[0];
          if (!grouped.has(date)) {
            grouped.set(date, []);
          }
          grouped.get(date)!.push(item);
        }
        return grouped;
      };

      const applyDailyLimit = <T,>(items: T[], getDate: (item: T) => string, limit: number): T[] => {
        const grouped = groupByDate(items, getDate);
        const result: T[] = [];
        for (const [, dayItems] of grouped) {
          result.push(...dayItems.slice(0, limit));
        }
        return result;
      };

      const applyDailyCap = (rewardsByDate: Map<string, number>): number => {
        let total = 0;
        for (const [, amount] of rewardsByDate) {
          total += Math.min(amount, DAILY_REWARD_CAP);
        }
        return total;
      };

      // Get existing user IDs
      const { data: existingUsers } = await supabase.from('profiles').select('id');
      const existingUserIds = new Set((existingUsers || []).map(u => u.id));

      // Calculate rewards for each user
      const calculations = await Promise.all(
        (profiles || []).map(async (profile) => {
          const rewardsByDate = new Map<string, number>();
          
          const addRewardForDate = (date: string, amount: number) => {
            const current = rewardsByDate.get(date) || 0;
            rewardsByDate.set(date, current + amount);
          };

          // Get ALL posts
          const { data: allPosts } = await supabase
            .from('posts')
            .select('id, content, images, video_url, created_at, post_type')
            .eq('author_id', profile.id)
            .lte('created_at', '2025-12-31T23:59:59Z')
            .order('created_at', { ascending: true });

          // Quality posts only: >100 chars + media = 10,000 CLC
          const qualityPostsData = (allPosts || []).filter(p => {
            const hasContent = (p.content?.length || 0) > 100;
            const hasMedia = (p.images && p.images.length > 0) || p.video_url;
            return hasContent && hasMedia && p.post_type === 'post';
          });

          const rewardableQualityPosts = applyDailyLimit(qualityPostsData, p => p.created_at, MAX_POSTS_PER_DAY);
          const qualityPosts = rewardableQualityPosts.length;

          for (const post of rewardableQualityPosts) {
            addRewardForDate(post.created_at.split('T')[0], QUALITY_POST_REWARD);
          }

          // Get ALL post IDs (original + shared) for interaction rewards
          const allPostIds = (allPosts || []).map(p => p.id);
          
          let likesReceived = 0;
          let qualityComments = 0;
          let sharesReceived = 0;

          if (allPostIds.length > 0) {
            // Likes received
            const { data: likesData } = await supabase
              .from('post_likes')
              .select('user_id, post_id, created_at')
              .in('post_id', allPostIds)
              .neq('user_id', profile.id)
              .lte('created_at', '2025-12-31T23:59:59Z')
              .order('created_at', { ascending: true });

            const validLikes = (likesData || []).filter(l => existingUserIds.has(l.user_id));

            // Quality comments (>20 chars)
            const { data: commentsData } = await supabase
              .from('comments')
              .select('author_id, post_id, content, created_at')
              .in('post_id', allPostIds)
              .neq('author_id', profile.id)
              .lte('created_at', '2025-12-31T23:59:59Z')
              .order('created_at', { ascending: true });

            const validQualityComments = (commentsData || []).filter(c => 
              existingUserIds.has(c.author_id) && (c.content?.length || 0) > 20
            );

            // Combine likes + comments for daily limit
            interface Interaction {
              type: 'like' | 'comment';
              created_at: string;
            }
            const allInteractions: Interaction[] = [
              ...validLikes.map(l => ({ type: 'like' as const, created_at: l.created_at })),
              ...validQualityComments.map(c => ({ type: 'comment' as const, created_at: c.created_at }))
            ];
            allInteractions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            
            const rewardableInteractions = applyDailyLimit(allInteractions, i => i.created_at, MAX_INTERACTIONS_PER_DAY);
            
            for (const interaction of rewardableInteractions) {
              const date = interaction.created_at.split('T')[0];
              if (interaction.type === 'like') {
                likesReceived++;
                addRewardForDate(date, LIKE_REWARD);
              } else {
                qualityComments++;
                addRewardForDate(date, QUALITY_COMMENT_REWARD);
              }
            }

            // Shares received - limit 5/day
            const { data: sharesData } = await supabase
              .from('post_shares')
              .select('user_id, post_id, created_at')
              .in('post_id', allPostIds)
              .neq('user_id', profile.id)
              .lte('created_at', '2025-12-31T23:59:59Z')
              .order('created_at', { ascending: true });

            const validShares = (sharesData || []).filter(s => existingUserIds.has(s.user_id));
            const rewardableShares = applyDailyLimit(validShares, s => s.created_at, MAX_SHARES_PER_DAY);
            sharesReceived = rewardableShares.length;

            for (const share of rewardableShares) {
              addRewardForDate(share.created_at.split('T')[0], SHARE_REWARD);
            }
          }

          // Friendships - 10k each, limit 10/day
          const { data: friendshipsData } = await supabase
            .from('followers')
            .select('follower_id, following_id, created_at')
            .or(`follower_id.eq.${profile.id},following_id.eq.${profile.id}`)
            .eq('status', 'accepted')
            .lte('created_at', '2025-12-31T23:59:59Z')
            .order('created_at', { ascending: true });
          
          const validFriendships = (friendshipsData || []).filter(f => {
            const friendId = f.follower_id === profile.id ? f.following_id : f.follower_id;
            return existingUserIds.has(friendId);
          });
          
          const rewardableFriendships = applyDailyLimit(validFriendships, f => f.created_at, MAX_FRIENDSHIPS_PER_DAY);
          const friendships = rewardableFriendships.length;

          for (const friendship of rewardableFriendships) {
            addRewardForDate(friendship.created_at.split('T')[0], FRIENDSHIP_REWARD);
          }

          // Calculate rewards
          const welcomeBonus = profile.welcome_bonus_claimed ? WELCOME_BONUS : 0;
          const walletBonus = profile.wallet_bonus_claimed ? WALLET_CONNECT_BONUS : 0;
          
          // Apply daily cap (excludes welcome + wallet)
          const dailyRewardsTotal = applyDailyCap(rewardsByDate);
          
          const postReward = qualityPosts * QUALITY_POST_REWARD;
          const likeReward = likesReceived * LIKE_REWARD;
          const commentReward = qualityComments * QUALITY_COMMENT_REWARD;
          const shareReward = sharesReceived * SHARE_REWARD;
          const friendshipReward = friendships * FRIENDSHIP_REWARD;

          // Total = one-time + capped daily
          const calculatedTotal = welcomeBonus + walletBonus + dailyRewardsTotal;

          return {
            id: profile.id,
            display_name: profile.display_name || 'N/A',
            wallet_address: profile.wallet_address || '',
            pending_reward: profile.pending_reward || 0,
            approved_reward: profile.approved_reward || 0,
            camly_balance: profile.camly_balance || 0,
            current_total: (profile.pending_reward || 0) + (profile.approved_reward || 0) + (profile.camly_balance || 0),
            welcome_bonus_claimed: profile.welcome_bonus_claimed,
            wallet_bonus_claimed: profile.wallet_bonus_claimed,
            is_verified: profile.is_verified,
            quality_posts: qualityPosts,
            likes_received: likesReceived,
            quality_comments: qualityComments,
            shares_received: sharesReceived,
            friendships: friendships,
            welcome_bonus: welcomeBonus,
            wallet_bonus: walletBonus,
            post_reward: postReward,
            like_reward: likeReward,
            comment_reward: commentReward,
            share_reward: shareReward,
            friendship_reward: friendshipReward,
            daily_rewards_total: dailyRewardsTotal,
            calculated_total: calculatedTotal,
            created_at: profile.created_at
          };
        })
      );

      setUsers(calculations);
      toast.success(`Đã tải ${calculations.length} users (Reward System v3.0)`);
    } catch (error) {
      console.error('Error fetching calculations:', error);
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (users.length === 0) {
      toast.error('Chưa có dữ liệu để xuất');
      return;
    }

    const headers = [
      'ID',
      'Tên hiển thị',
      'Địa chỉ ví',
      'Pending hiện tại',
      'Approved hiện tại',
      'Đã claim (camly_balance)',
      'Tổng hiện tại',
      'Welcome bonus',
      'Wallet bonus',
      'Số bài CL',
      'Số like nhận',
      'Số comment CL',
      'Số share nhận',
      'Số bạn bè',
      'Thưởng Welcome',
      'Thưởng Wallet',
      'Thưởng Bài viết',
      'Thưởng Like',
      'Thưởng Comment',
      'Thưởng Share',
      'Thưởng Kết bạn',
      'Daily Rewards (sau cap)',
      'TỔNG TÍNH LẠI',
      'CHÊNH LỆCH',
      'Ngày tạo'
    ];

    const rows = users.map(user => [
      user.id,
      user.display_name,
      user.wallet_address,
      user.pending_reward,
      user.approved_reward,
      user.camly_balance,
      user.current_total,
      user.welcome_bonus_claimed ? 'Có' : 'Không',
      user.wallet_bonus_claimed ? 'Có' : 'Không',
      user.quality_posts,
      user.likes_received,
      user.quality_comments,
      user.shares_received,
      user.friendships,
      user.welcome_bonus,
      user.wallet_bonus,
      user.post_reward,
      user.like_reward,
      user.comment_reward,
      user.share_reward,
      user.friendship_reward,
      user.daily_rewards_total,
      user.calculated_total,
      user.current_total - user.calculated_total,
      user.created_at
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reward_v3_calculation_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Đã xuất CSV thành công!');
  };

  const getActionTypeSummary = () => {
    const totals = {
      welcome: { count: 0, amount: 0 },
      wallet: { count: 0, amount: 0 },
      post: { count: 0, amount: 0 },
      like: { count: 0, amount: 0 },
      comment: { count: 0, amount: 0 },
      share: { count: 0, amount: 0 },
      friendship: { count: 0, amount: 0 }
    };

    users.forEach(user => {
      if (user.welcome_bonus > 0) { totals.welcome.count++; totals.welcome.amount += user.welcome_bonus; }
      if (user.wallet_bonus > 0) { totals.wallet.count++; totals.wallet.amount += user.wallet_bonus; }
      totals.post.count += user.quality_posts; totals.post.amount += user.post_reward;
      totals.like.count += user.likes_received; totals.like.amount += user.like_reward;
      totals.comment.count += user.quality_comments; totals.comment.amount += user.comment_reward;
      totals.share.count += user.shares_received; totals.share.amount += user.share_reward;
      totals.friendship.count += user.friendships; totals.friendship.amount += user.friendship_reward;
    });

    return totals;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const getDifferenceColor = (diff: number) => {
    if (diff > 100000) return 'text-red-500 font-bold';
    if (diff < -100000) return 'text-green-500 font-bold';
    return 'text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            📊 Bảng Tính Điểm Thưởng v3.0 (Daily Cap: {formatNumber(DAILY_REWARD_CAP)} CLC)
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={fetchCalculations} disabled={loading} variant="outline">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Tải dữ liệu
            </Button>
            <Button onClick={exportToCSV} disabled={users.length === 0} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={users.length === 0 || resetting}>
                  {resetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                  Reset All v3.0
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>⚠️ Reset theo Reward System v3.0</AlertDialogTitle>
                  <AlertDialogDescription>
                    Hành động này sẽ tính lại thưởng theo công thức mới:
                    <br /><br />
                    <strong>Không tính Daily Cap:</strong> Welcome (50k) + Wallet (50k)
                    <br />
                    <strong>Tính Daily Cap 500k/ngày:</strong>
                    <br />• Bài CL: {formatNumber(QUALITY_POST_REWARD)} (max {MAX_POSTS_PER_DAY}/ngày)
                    <br />• Like: {formatNumber(LIKE_REWARD)}/like (max {MAX_INTERACTIONS_PER_DAY}/ngày)
                    <br />• Comment CL: {formatNumber(QUALITY_COMMENT_REWARD)} (max {MAX_INTERACTIONS_PER_DAY}/ngày)
                    <br />• Share: {formatNumber(SHARE_REWARD)} (max {MAX_SHARES_PER_DAY}/ngày)
                    <br />• Kết bạn: {formatNumber(FRIENDSHIP_REWARD)}/người (max {MAX_FRIENDSHIPS_PER_DAY}/ngày)
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={resetAllRewards} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Xác nhận Reset v3.0
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nhấn "Tải dữ liệu" để xem bảng tính điểm thưởng v3.0</p>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-500/10 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-500">{users.length}</div>
                <div className="text-sm text-muted-foreground">Tổng users</div>
              </div>
              <div className="bg-green-500/10 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-500">
                  {formatNumber(users.reduce((sum, u) => sum + u.calculated_total, 0))}
                </div>
                <div className="text-sm text-muted-foreground">Tổng tính lại (CLC)</div>
              </div>
              <div className="bg-orange-500/10 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-500">
                  {formatNumber(users.reduce((sum, u) => sum + u.current_total, 0))}
                </div>
                <div className="text-sm text-muted-foreground">Tổng hiện tại (CLC)</div>
              </div>
              <div className="bg-red-500/10 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-500">
                  {formatNumber(users.reduce((sum, u) => sum + (u.current_total - u.calculated_total), 0))}
                </div>
                <div className="text-sm text-muted-foreground">Tổng chênh lệch (CLC)</div>
              </div>
            </div>

            {/* Action Type Summary */}
            {(() => {
              const summary = getActionTypeSummary();
              return (
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-3">📈 Tổng kết theo loại hành động (Reward v3.0)</h3>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div className="flex justify-between border-b pb-1">
                      <span>🎁 Welcome (không cap)</span>
                      <span className="font-mono">{summary.welcome.count} users = {formatNumber(summary.welcome.amount)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>💳 Wallet (không cap)</span>
                      <span className="font-mono">{summary.wallet.count} users = {formatNumber(summary.wallet.amount)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>📝 Bài CL ({formatNumber(QUALITY_POST_REWARD)}/bài)</span>
                      <span className="font-mono">{summary.post.count} bài = {formatNumber(summary.post.amount)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>❤️ Like ({formatNumber(LIKE_REWARD)}/like)</span>
                      <span className="font-mono">{summary.like.count} = {formatNumber(summary.like.amount)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>💬 Comment CL ({formatNumber(QUALITY_COMMENT_REWARD)})</span>
                      <span className="font-mono">{summary.comment.count} = {formatNumber(summary.comment.amount)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>🔄 Share ({formatNumber(SHARE_REWARD)})</span>
                      <span className="font-mono">{summary.share.count} = {formatNumber(summary.share.amount)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>🤝 Kết bạn ({formatNumber(FRIENDSHIP_REWARD)})</span>
                      <span className="font-mono">{summary.friendship.count} = {formatNumber(summary.friendship.amount)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1 font-bold">
                      <span>📊 Daily Cap</span>
                      <span className="font-mono">{formatNumber(DAILY_REWARD_CAP)}/ngày</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Users needing review */}
            <div className="mb-4">
              <Badge variant="destructive" className="mr-2">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {users.filter(u => Math.abs(u.current_total - u.calculated_total) > 100000).length} users chênh lệch &gt; 100k
              </Badge>
              <Badge variant="secondary">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {users.filter(u => Math.abs(u.current_total - u.calculated_total) <= 100000).length} users OK
              </Badge>
            </div>

            <div className="overflow-x-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 bg-background">Tên</TableHead>
                    <TableHead className="sticky top-0 bg-background">Bài CL</TableHead>
                    <TableHead className="sticky top-0 bg-background">Like</TableHead>
                    <TableHead className="sticky top-0 bg-background">Cmt CL</TableHead>
                    <TableHead className="sticky top-0 bg-background">Share</TableHead>
                    <TableHead className="sticky top-0 bg-background">Bạn bè</TableHead>
                    <TableHead className="sticky top-0 bg-background">Pending</TableHead>
                    <TableHead className="sticky top-0 bg-background">Approved</TableHead>
                    <TableHead className="sticky top-0 bg-background">Tổng cũ</TableHead>
                    <TableHead className="sticky top-0 bg-background">Tính lại</TableHead>
                    <TableHead className="sticky top-0 bg-background">Chênh lệch</TableHead>
                    <TableHead className="sticky top-0 bg-background text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const diff = user.current_total - user.calculated_total;
                    return (
                      <TableRow key={user.id} className={Math.abs(diff) > 100000 ? 'bg-red-500/5' : ''}>
                        <TableCell className="font-medium">
                          <div>{user.display_name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {user.wallet_address?.slice(0, 10)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{user.quality_posts}</div>
                          <div className="text-xs text-green-500">+{formatNumber(user.post_reward)}</div>
                        </TableCell>
                        <TableCell>
                          <div>{user.likes_received}</div>
                          <div className="text-xs text-green-500">+{formatNumber(user.like_reward)}</div>
                        </TableCell>
                        <TableCell>
                          <div>{user.quality_comments}</div>
                          <div className="text-xs text-green-500">+{formatNumber(user.comment_reward)}</div>
                        </TableCell>
                        <TableCell>
                          <div>{user.shares_received}</div>
                          <div className="text-xs text-green-500">+{formatNumber(user.share_reward)}</div>
                        </TableCell>
                        <TableCell>
                          <div>{user.friendships}</div>
                          <div className="text-xs text-green-500">+{formatNumber(user.friendship_reward)}</div>
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {formatNumber(user.pending_reward)}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {formatNumber(user.approved_reward)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatNumber(user.current_total)}
                        </TableCell>
                        <TableCell className="font-mono text-primary font-bold">
                          {formatNumber(user.calculated_total)}
                        </TableCell>
                        <TableCell className={`font-mono ${getDifferenceColor(diff)}`}>
                          {diff > 0 ? '+' : ''}{formatNumber(diff)}
                        </TableCell>
                        <TableCell className="text-center">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={resettingUserId === user.id || diff === 0}
                                className="h-7 px-2"
                              >
                                {resettingUserId === user.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-3 h-3" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reset pending_reward cho {user.display_name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Đặt <strong>pending_reward = {formatNumber(user.calculated_total)} CLC</strong>
                                  <br />
                                  (Hiện tại: {formatNumber(user.pending_reward)} | Chênh lệch: {diff > 0 ? '+' : ''}{formatNumber(diff)})
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Hủy</AlertDialogCancel>
                                <AlertDialogAction onClick={() => resetSingleUser(user.id, user.calculated_total)}>
                                  Xác nhận
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
