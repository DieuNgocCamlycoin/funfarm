import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Download, RefreshCw, Loader2, ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  MAX_LIKES_PER_DAY,
  MAX_COMMENTS_PER_DAY,
  MAX_SHARES_PER_DAY,
  MAX_FRIENDSHIPS_PER_DAY
} from "@/lib/constants";
import { toVietnamDate, applyDailyLimit as applyDailyLimitVN, applyDailyCap as applyDailyCapVN } from "@/lib/dateUtils";
import { UserRewardDetailModal } from "./UserRewardDetailModal";

interface ComparisonData {
  id: string;
  display_name: string;
  avatar_url: string | null;
  current_pending: number;
  calculated_v3: number;
  difference: number;
  // Breakdown
  welcome_bonus: number;
  wallet_bonus: number;
  quality_posts: number;
  likes_received: number;
  quality_comments: number;
  shares_received: number;
  friendships: number;
}

const CACHE_KEY = 'reward_comparison_cache_v1';

export function RewardComparisonTable() {
  const [users, setUsers] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortField, setSortField] = useState<'current_pending' | 'calculated_v3' | 'difference'>('difference');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState<'all' | 'increase' | 'decrease' | 'same'>('all');
  
  // Modal state for user detail view
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');

  // Load from cache on mount
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        setUsers(data);
        setLastUpdated(new Date(timestamp));
      } catch (e) {
        console.error('Error loading cache:', e);
        localStorage.removeItem(CACHE_KEY);
      }
    }
  }, []);

  const formatNumber = (n: number) => n.toLocaleString('vi-VN');

  // Use Vietnam timezone helpers from dateUtils.ts
  const applyDailyLimit = applyDailyLimitVN;
  const applyDailyCap = (rewardsByDate: Map<string, number>): number => applyDailyCapVN(rewardsByDate, DAILY_REWARD_CAP);

  const fetchComparison = async () => {
    setLoading(true);
    try {
      // Fetch profiles with pending_reward (Honor Board data)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('banned', false)
        .order('pending_reward', { ascending: false });

      if (profileError) throw profileError;

      // Get existing user IDs
      const { data: existingUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('banned', false);
      const existingUserIds = new Set((existingUsers || []).map(u => u.id));

      const cutoffDate = new Date().toISOString();

      // Calculate v3.0 rewards for each user
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
            .lte('created_at', cutoffDate)
            .order('created_at', { ascending: true });

          // Quality posts only: >100 chars + media
          const qualityPostsData = (allPosts || []).filter(p => {
            const hasContent = (p.content?.length || 0) > 100;
            const hasMedia = (p.images && p.images.length > 0) || p.video_url;
            const isOriginalContent = p.post_type === 'post' || p.post_type === 'product';
            return hasContent && hasMedia && isOriginalContent;
          });

          const rewardableQualityPosts = applyDailyLimit(qualityPostsData, p => p.created_at, MAX_POSTS_PER_DAY);
          const qualityPosts = rewardableQualityPosts.length;

          for (const post of rewardableQualityPosts) {
            addRewardForDate(toVietnamDate(post.created_at), QUALITY_POST_REWARD);
          }

          // V3.1: Interactions are rewarded on ALL quality posts (not just first 10/day)
          const qualityPostIds = qualityPostsData.map(p => p.id);
          
          let likesReceived = 0;
          let qualityComments = 0;
          let sharesReceived = 0;

          if (qualityPostIds.length > 0) {
            // Likes received on QUALITY posts only
            const { data: likesData } = await supabase
              .from('post_likes')
              .select('user_id, post_id, created_at')
              .in('post_id', qualityPostIds)
              .neq('user_id', profile.id)
              .lte('created_at', cutoffDate)
              .order('created_at', { ascending: true });

            const validLikes = (likesData || []).filter(l => existingUserIds.has(l.user_id));

            // Quality comments (>20 chars) on QUALITY posts only
            const { data: commentsData } = await supabase
              .from('comments')
              .select('author_id, post_id, content, created_at')
              .in('post_id', qualityPostIds)
              .neq('author_id', profile.id)
              .lte('created_at', cutoffDate)
              .order('created_at', { ascending: true });

            const validQualityComments = (commentsData || []).filter(c => 
              existingUserIds.has(c.author_id) && (c.content?.length || 0) > 20
            );

            // V3.1: Apply SEPARATE daily limits - 50 likes/day AND 50 comments/day
            const rewardableLikes = applyDailyLimit(validLikes, l => l.created_at, MAX_LIKES_PER_DAY);
            const rewardableComments = applyDailyLimit(validQualityComments, c => c.created_at, MAX_COMMENTS_PER_DAY);

            // Add likes rewards
            for (const like of rewardableLikes) {
              const vnDate = toVietnamDate(like.created_at);
              likesReceived++;
              addRewardForDate(vnDate, LIKE_REWARD);
            }

            // Add comments rewards
            for (const comment of rewardableComments) {
              const vnDate = toVietnamDate(comment.created_at);
              qualityComments++;
              addRewardForDate(vnDate, QUALITY_COMMENT_REWARD);
            }

            // Shares received on QUALITY posts only
            const { data: sharesData } = await supabase
              .from('post_shares')
              .select('user_id, post_id, created_at')
              .in('post_id', qualityPostIds)
              .neq('user_id', profile.id)
              .lte('created_at', cutoffDate)
              .order('created_at', { ascending: true });

            const validShares = (sharesData || []).filter(s => existingUserIds.has(s.user_id));
            const rewardableShares = applyDailyLimit(validShares, s => s.created_at, MAX_SHARES_PER_DAY);
            sharesReceived = rewardableShares.length;

            for (const share of rewardableShares) {
              addRewardForDate(toVietnamDate(share.created_at), SHARE_REWARD);
            }
          }

          // Friendships
          const { data: friendshipsData } = await supabase
            .from('followers')
            .select('follower_id, following_id, created_at')
            .or(`follower_id.eq.${profile.id},following_id.eq.${profile.id}`)
            .eq('status', 'accepted')
            .lte('created_at', cutoffDate)
            .order('created_at', { ascending: true });
          
          const validFriendships = (friendshipsData || []).filter(f => {
            const friendId = f.follower_id === profile.id ? f.following_id : f.follower_id;
            return existingUserIds.has(friendId);
          });
          
          const rewardableFriendships = applyDailyLimit(validFriendships, f => f.created_at, MAX_FRIENDSHIPS_PER_DAY);
          const friendships = rewardableFriendships.length;

          for (const friendship of rewardableFriendships) {
            addRewardForDate(toVietnamDate(friendship.created_at), FRIENDSHIP_REWARD);
          }

          // Calculate rewards
          const welcomeBonus = profile.welcome_bonus_claimed ? WELCOME_BONUS : 0;
          const walletBonus = profile.wallet_bonus_claimed ? WALLET_CONNECT_BONUS : 0;
          const dailyRewardsTotal = applyDailyCap(rewardsByDate);
          const calculatedTotal = welcomeBonus + walletBonus + dailyRewardsTotal;

          return {
            id: profile.id,
            display_name: profile.display_name || 'N/A',
            avatar_url: profile.avatar_url,
            current_pending: profile.pending_reward || 0,
            calculated_v3: calculatedTotal,
            difference: (profile.pending_reward || 0) - calculatedTotal,
            welcome_bonus: welcomeBonus,
            wallet_bonus: walletBonus,
            quality_posts: qualityPosts,
            likes_received: likesReceived,
            quality_comments: qualityComments,
            shares_received: sharesReceived,
            friendships: friendships
          };
        })
      );

      // Filter out users with both values = 0
      const filteredCalcs = calculations.filter(u => u.current_pending > 0 || u.calculated_v3 > 0);
      
      setUsers(filteredCalcs);
      const now = new Date();
      setLastUpdated(now);
      
      // Save to cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: filteredCalcs,
        timestamp: now.toISOString()
      }));
      
      toast.success(`Đã so sánh ${filteredCalcs.length} users với V3.0`);
    } catch (error) {
      console.error('Error fetching comparison:', error);
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
      'Điểm hiện tại (Honor Board)',
      'Điểm V3.0 tính lại',
      'Chênh lệch',
      'Welcome bonus',
      'Wallet bonus',
      'Số bài CL',
      'Số like nhận',
      'Số comment CL',
      'Số share nhận',
      'Số bạn bè'
    ];

    const rows = users.map(user => [
      user.id,
      user.display_name,
      user.current_pending,
      user.calculated_v3,
      user.difference,
      user.welcome_bonus,
      user.wallet_bonus,
      user.quality_posts,
      user.likes_received,
      user.quality_comments,
      user.shares_received,
      user.friendships
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reward_comparison_v3_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Đã xuất CSV thành công!');
  };

  // Stats
  const usersIncrease = users.filter(u => u.difference < 0);
  const usersDecrease = users.filter(u => u.difference > 0);
  const usersSame = users.filter(u => u.difference === 0);
  const totalDifference = users.reduce((sum, u) => sum + u.difference, 0);

  // Sorting and filtering
  const sortedUsers = [...users]
    .filter(u => {
      if (filter === 'increase') return u.difference < 0;
      if (filter === 'decrease') return u.difference > 0;
      if (filter === 'same') return u.difference === 0;
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

  const handleSort = (field: 'current_pending' | 'calculated_v3' | 'difference') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-indigo-500" />
            <span>So sánh điểm: Honor Board vs V3.0</span>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Cập nhật: {lastUpdated.toLocaleString('vi-VN')}
              </span>
            )}
            <Button onClick={fetchComparison} disabled={loading} size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Tải dữ liệu
            </Button>
            <Button onClick={exportToCSV} disabled={users.length === 0} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Xuất CSV
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Summary */}
        {users.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Tổng users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
                  <TrendingUp className="h-4 w-4" /> Được tăng
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{usersIncrease.length}</p>
                <p className="text-xs text-green-500">
                  +{formatNumber(Math.abs(usersIncrease.reduce((s, u) => s + u.difference, 0)))} CLC
                </p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center justify-center gap-1">
                  <TrendingDown className="h-4 w-4" /> Bị giảm
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{usersDecrease.length}</p>
                <p className="text-xs text-red-500">
                  -{formatNumber(usersDecrease.reduce((s, u) => s + u.difference, 0))} CLC
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Minus className="h-4 w-4" /> Không đổi
                </p>
                <p className="text-2xl font-bold">{usersSame.length}</p>
              </CardContent>
            </Card>
            <Card className={totalDifference > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-green-50 dark:bg-green-950/30"}>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Chênh lệch ròng</p>
                <p className={`text-xl font-bold ${totalDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {totalDifference > 0 ? '-' : '+'}{formatNumber(Math.abs(totalDifference))} CLC
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter buttons */}
        {users.length > 0 && (
          <div className="flex gap-2 mb-4">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter('all')}
            >
              Tất cả ({users.length})
            </Button>
            <Button 
              variant={filter === 'increase' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter('increase')}
              className={filter === 'increase' ? '' : 'text-green-600 border-green-300 hover:bg-green-50'}
            >
              <ArrowUp className="h-3 w-3 mr-1" />
              Được tăng ({usersIncrease.length})
            </Button>
            <Button 
              variant={filter === 'decrease' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter('decrease')}
              className={filter === 'decrease' ? '' : 'text-red-600 border-red-300 hover:bg-red-50'}
            >
              <ArrowDown className="h-3 w-3 mr-1" />
              Bị giảm ({usersDecrease.length})
            </Button>
            <Button 
              variant={filter === 'same' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter('same')}
            >
              <Minus className="h-3 w-3 mr-1" />
              Không đổi ({usersSame.length})
            </Button>
          </div>
        )}

        {/* Table */}
        {users.length > 0 ? (
          <div className="rounded-md border overflow-x-auto max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="min-w-[150px]">User</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50" 
                    onClick={() => handleSort('current_pending')}
                  >
                    Điểm hiện tại {sortField === 'current_pending' && (sortDir === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('calculated_v3')}
                  >
                    Điểm V3.0 {sortField === 'calculated_v3' && (sortDir === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('difference')}
                  >
                    Chênh lệch {sortField === 'difference' && (sortDir === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-center">Chi tiết V3.0</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.map((user, idx) => (
                  <TableRow key={user.id} className={
                    user.difference < 0 
                      ? 'bg-green-50/50 dark:bg-green-950/10' 
                      : user.difference > 0 
                        ? 'bg-red-50/50 dark:bg-red-950/10' 
                        : ''
                  }>
                    <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                    <TableCell>
                      <button 
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setSelectedUserName(user.display_name);
                        }}
                        className="flex items-center gap-2 hover:bg-muted/50 rounded-lg p-1 -m-1 transition-colors cursor-pointer group"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || ''} />
                          <AvatarFallback>{user.display_name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm truncate max-w-[120px] text-blue-600 group-hover:underline">
                          {user.display_name}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(user.current_pending)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(user.calculated_v3)}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.difference === 0 ? (
                        <Badge variant="outline" className="font-mono">0</Badge>
                      ) : user.difference > 0 ? (
                        <Badge variant="destructive" className="font-mono">
                          <ArrowDown className="h-3 w-3 mr-1" />
                          -{formatNumber(user.difference)}
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500 font-mono">
                          <ArrowUp className="h-3 w-3 mr-1" />
                          +{formatNumber(Math.abs(user.difference))}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 justify-center text-xs">
                        {user.welcome_bonus > 0 && (
                          <Badge variant="secondary" className="text-[10px]">W:{formatNumber(user.welcome_bonus)}</Badge>
                        )}
                        {user.wallet_bonus > 0 && (
                          <Badge variant="secondary" className="text-[10px]">💰:{formatNumber(user.wallet_bonus)}</Badge>
                        )}
                        {user.quality_posts > 0 && (
                          <Badge variant="outline" className="text-[10px]">📝:{user.quality_posts}</Badge>
                        )}
                        {user.likes_received > 0 && (
                          <Badge variant="outline" className="text-[10px]">👍:{user.likes_received}</Badge>
                        )}
                        {user.quality_comments > 0 && (
                          <Badge variant="outline" className="text-[10px]">💬:{user.quality_comments}</Badge>
                        )}
                        {user.shares_received > 0 && (
                          <Badge variant="outline" className="text-[10px]">🔄:{user.shares_received}</Badge>
                        )}
                        {user.friendships > 0 && (
                          <Badge variant="outline" className="text-[10px]">🤝:{user.friendships}</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Scale className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nhấn "Tải dữ liệu" để so sánh điểm Honor Board với V3.0</p>
          </div>
        )}
      </CardContent>
      
      {/* User Reward Detail Modal */}
      <UserRewardDetailModal
        open={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
        userId={selectedUserId || ''}
        userName={selectedUserName}
      />
    </Card>
  );
}
