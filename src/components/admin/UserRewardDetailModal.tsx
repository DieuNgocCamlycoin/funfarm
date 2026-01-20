import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileText, Heart, MessageSquare, Share2, Users, Wallet, Gift, Calendar, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toVietnamDate } from '@/lib/dateUtils';
import { 
  QUALITY_POST_REWARD, 
  LIKE_REWARD, 
  QUALITY_COMMENT_REWARD, 
  SHARE_REWARD, 
  FRIENDSHIP_REWARD,
  WELCOME_BONUS,
  WALLET_CONNECT_BONUS,
  DAILY_REWARD_CAP,
  MAX_POSTS_PER_DAY,
  MAX_INTERACTIONS_PER_DAY,
  MAX_SHARES_PER_DAY,
  MAX_FRIENDSHIPS_PER_DAY
} from '@/lib/constants';

interface UserRewardDetailModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

interface DailyStats {
  date: string;
  qualityPosts: number;
  likesReceived: number;
  qualityComments: number;
  sharesReceived: number;
  friendsMade: number;
  rawReward: number;
  cappedReward: number;
}

interface UserSummary {
  avatarUrl: string | null;
  joinDate: string;
  totalQualityPosts: number;
  totalLikes: number;
  totalQualityComments: number;
  totalShares: number;
  totalFriends: number;
  welcomeBonus: number;
  walletBonus: number;
  totalReward: number;
}

const formatNumber = (num: number) => num.toLocaleString('vi-VN');

// Daily limit helper (by action type)
const applyDailyLimit = (count: number, actionType: 'post' | 'like' | 'comment' | 'share' | 'friend'): number => {
  const limits: Record<string, number> = {
    post: MAX_POSTS_PER_DAY,
    like: MAX_INTERACTIONS_PER_DAY,
    comment: MAX_INTERACTIONS_PER_DAY,
    share: MAX_SHARES_PER_DAY,
    friend: MAX_FRIENDSHIPS_PER_DAY
  };
  return Math.min(count, limits[actionType] || count);
};

// Daily cap helper
const applyDailyCap = (reward: number): number => Math.min(reward, DAILY_REWARD_CAP);

export function UserRewardDetailModal({ open, onClose, userId, userName }: UserRewardDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);

  useEffect(() => {
    if (open && userId) {
      loadUserDetails();
    }
  }, [open, userId]);

  const isQualityPost = (post: { content: string | null; images: string[] | null; video_url: string | null; post_type: string }) => {
    const hasEnoughContent = (post.content?.length || 0) > 100;
    const hasMedia = (post.images && post.images.length > 0) || !!post.video_url;
    const isOriginalPost = post.post_type === 'post' || post.post_type === 'product';
    return hasEnoughContent && hasMedia && isOriginalPost;
  };

  const isQualityComment = (content: string) => {
    return (content?.length || 0) >= 20;
  };

  const loadUserDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, created_at, welcome_bonus_claimed, wallet_bonus_claimed')
        .eq('id', userId)
        .single();

      // 2. Get all valid user IDs (exclude banned/deleted)
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('banned', false);
      const validUserIds = new Set((allProfiles || []).map(p => p.id));

      // 3. Fetch user's posts
      const { data: userPosts } = await supabase
        .from('posts')
        .select('id, content, images, video_url, post_type, created_at')
        .eq('author_id', userId)
        .limit(50000);

      const allPostIds = (userPosts || []).map(p => p.id);
      const qualityPostIds = (userPosts || []).filter(isQualityPost).map(p => p.id);

      // 4. Fetch likes received on quality posts
      const { data: likesReceived } = allPostIds.length > 0
        ? await supabase
            .from('post_likes')
            .select('id, post_id, user_id, created_at')
            .in('post_id', qualityPostIds.length > 0 ? qualityPostIds : ['none'])
            .neq('user_id', userId)
            .limit(50000)
        : { data: [] };

      // 5. Fetch comments received on quality posts
      const { data: commentsReceived } = allPostIds.length > 0
        ? await supabase
            .from('comments')
            .select('id, post_id, author_id, content, created_at')
            .in('post_id', qualityPostIds.length > 0 ? qualityPostIds : ['none'])
            .neq('author_id', userId)
            .limit(50000)
        : { data: [] };

      // 6. Fetch shares received on quality posts
      const { data: sharesReceived } = allPostIds.length > 0
        ? await supabase
            .from('post_shares')
            .select('id, post_id, user_id, created_at')
            .in('post_id', qualityPostIds.length > 0 ? qualityPostIds : ['none'])
            .neq('user_id', userId)
            .limit(50000)
        : { data: [] };

      // 7. Fetch friends (followers with status 'accepted')
      const { data: friends } = await supabase
        .from('followers')
        .select('id, follower_id, following_id, created_at')
        .or(`follower_id.eq.${userId},following_id.eq.${userId}`)
        .eq('status', 'accepted')
        .limit(50000);

      // Filter to valid users only
      const validLikes = (likesReceived || []).filter(l => validUserIds.has(l.user_id));
      const validComments = (commentsReceived || []).filter(c => validUserIds.has(c.author_id) && isQualityComment(c.content));
      const validShares = (sharesReceived || []).filter(s => validUserIds.has(s.user_id));
      const validFriends = (friends || []).filter(f => {
        const otherId = f.follower_id === userId ? f.following_id : f.follower_id;
        return validUserIds.has(otherId);
      });

      // Group by Vietnam date
      const qualityPostsByDate = new Map<string, number>();
      const likesByDate = new Map<string, number>();
      const commentsByDate = new Map<string, number>();
      const sharesByDate = new Map<string, number>();
      const friendsByDate = new Map<string, number>();

      // Quality posts by creation date
      (userPosts || []).filter(isQualityPost).forEach(post => {
        const date = toVietnamDate(post.created_at);
        qualityPostsByDate.set(date, (qualityPostsByDate.get(date) || 0) + 1);
      });

      // Likes received
      validLikes.forEach(like => {
        const date = toVietnamDate(like.created_at);
        likesByDate.set(date, (likesByDate.get(date) || 0) + 1);
      });

      // Comments received
      validComments.forEach(comment => {
        const date = toVietnamDate(comment.created_at);
        commentsByDate.set(date, (commentsByDate.get(date) || 0) + 1);
      });

      // Shares received
      validShares.forEach(share => {
        const date = toVietnamDate(share.created_at);
        sharesByDate.set(date, (sharesByDate.get(date) || 0) + 1);
      });

      // Friends
      validFriends.forEach(friend => {
        const date = toVietnamDate(friend.created_at);
        friendsByDate.set(date, (friendsByDate.get(date) || 0) + 1);
      });

      // Collect all unique dates
      const allDates = new Set<string>();
      [qualityPostsByDate, likesByDate, commentsByDate, sharesByDate, friendsByDate].forEach(map => {
        map.forEach((_, date) => allDates.add(date));
      });

      // Build daily stats with limits
      const dailyStatsMap = new Map<string, DailyStats>();
      
      Array.from(allDates).sort().reverse().forEach(date => {
        const posts = applyDailyLimit(qualityPostsByDate.get(date) || 0, 'post');
        const likes = applyDailyLimit(likesByDate.get(date) || 0, 'like');
        const comments = applyDailyLimit(commentsByDate.get(date) || 0, 'comment');
        const shares = applyDailyLimit(sharesByDate.get(date) || 0, 'share');
        const friends = applyDailyLimit(friendsByDate.get(date) || 0, 'friend');

        const rawReward = 
          posts * QUALITY_POST_REWARD +
          likes * LIKE_REWARD +
          comments * QUALITY_COMMENT_REWARD +
          shares * SHARE_REWARD +
          friends * FRIENDSHIP_REWARD;

        const cappedReward = applyDailyCap(rawReward);

        dailyStatsMap.set(date, {
          date,
          qualityPosts: qualityPostsByDate.get(date) || 0,
          likesReceived: likesByDate.get(date) || 0,
          qualityComments: commentsByDate.get(date) || 0,
          sharesReceived: sharesByDate.get(date) || 0,
          friendsMade: friendsByDate.get(date) || 0,
          rawReward,
          cappedReward
        });
      });

      const dailyStatsArray = Array.from(dailyStatsMap.values());

      // Calculate totals
      const totalCappedReward = dailyStatsArray.reduce((sum, d) => sum + d.cappedReward, 0);
      const welcomeBonus = profile?.welcome_bonus_claimed ? WELCOME_BONUS : 0;
      const walletBonus = profile?.wallet_bonus_claimed ? WALLET_CONNECT_BONUS : 0;

      setSummary({
        avatarUrl: profile?.avatar_url || null,
        joinDate: profile?.created_at || '',
        totalQualityPosts: dailyStatsArray.reduce((sum, d) => sum + d.qualityPosts, 0),
        totalLikes: dailyStatsArray.reduce((sum, d) => sum + d.likesReceived, 0),
        totalQualityComments: dailyStatsArray.reduce((sum, d) => sum + d.qualityComments, 0),
        totalShares: dailyStatsArray.reduce((sum, d) => sum + d.sharesReceived, 0),
        totalFriends: dailyStatsArray.reduce((sum, d) => sum + d.friendsMade, 0),
        welcomeBonus,
        walletBonus,
        totalReward: totalCappedReward + welcomeBonus + walletBonus
      });

      setDailyStats(dailyStatsArray);
    } catch (error) {
      console.error('Error loading user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!summary) return;

    const headers = ['Ngày', 'Bài CL', 'Like nhận', 'Cmt CL nhận', 'Share nhận', 'Bạn bè', 'Thưởng (trước cap)', 'Thưởng (sau cap)'];
    const rows = dailyStats.map(d => [
      d.date,
      d.qualityPosts,
      d.likesReceived,
      d.qualityComments,
      d.sharesReceived,
      d.friendsMade,
      d.rawReward,
      d.cappedReward
    ]);

    // Add totals row
    rows.push([
      'TỔNG',
      summary.totalQualityPosts,
      summary.totalLikes,
      summary.totalQualityComments,
      summary.totalShares,
      summary.totalFriends,
      dailyStats.reduce((sum, d) => sum + d.rawReward, 0),
      dailyStats.reduce((sum, d) => sum + d.cappedReward, 0)
    ]);

    // Add bonus rows
    rows.push(['Welcome Bonus', '', '', '', '', '', '', summary.welcomeBonus]);
    rows.push(['Wallet Bonus', '', '', '', '', '', '', summary.walletBonus]);
    rows.push(['TỔNG V3.0', '', '', '', '', '', '', summary.totalReward]);

    const csvContent = [
      `Chi tiết thưởng: ${userName}`,
      `Tham gia: ${summary.joinDate ? new Date(summary.joinDate).toLocaleDateString('vi-VN') : 'N/A'}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reward-detail-${userName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {loading ? (
              <Skeleton className="h-10 w-10 rounded-full" />
            ) : (
              <Avatar className="h-10 w-10">
                <AvatarImage src={summary?.avatarUrl || ''} />
                <AvatarFallback>{userName?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <div className="text-lg font-semibold">{userName}</div>
              {summary && (
                <div className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Tham gia: {new Date(summary.joinDate).toLocaleDateString('vi-VN')}
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : summary ? (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
              <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
                <CardContent className="p-3 text-center">
                  <FileText className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                  <div className="text-lg font-bold text-blue-700">{formatNumber(summary.totalQualityPosts)}</div>
                  <div className="text-xs text-blue-600">Bài CL</div>
                </CardContent>
              </Card>
              <Card className="bg-pink-50 dark:bg-pink-950/30 border-pink-200">
                <CardContent className="p-3 text-center">
                  <Heart className="h-5 w-5 mx-auto text-pink-600 mb-1" />
                  <div className="text-lg font-bold text-pink-700">{formatNumber(summary.totalLikes)}</div>
                  <div className="text-xs text-pink-600">Like nhận</div>
                </CardContent>
              </Card>
              <Card className="bg-green-50 dark:bg-green-950/30 border-green-200">
                <CardContent className="p-3 text-center">
                  <MessageSquare className="h-5 w-5 mx-auto text-green-600 mb-1" />
                  <div className="text-lg font-bold text-green-700">{formatNumber(summary.totalQualityComments)}</div>
                  <div className="text-xs text-green-600">Cmt CL nhận</div>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200">
                <CardContent className="p-3 text-center">
                  <Users className="h-5 w-5 mx-auto text-purple-600 mb-1" />
                  <div className="text-lg font-bold text-purple-700">{formatNumber(summary.totalFriends)}</div>
                  <div className="text-xs text-purple-600">Bạn bè</div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200">
                <CardContent className="p-3 text-center">
                  <Gift className="h-5 w-5 mx-auto text-orange-600 mb-1" />
                  <div className="text-lg font-bold text-orange-700">{formatNumber(summary.welcomeBonus)}</div>
                  <div className="text-xs text-orange-600">Welcome</div>
                </CardContent>
              </Card>
              <Card className="bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200">
                <CardContent className="p-3 text-center">
                  <Wallet className="h-5 w-5 mx-auto text-cyan-600 mb-1" />
                  <div className="text-lg font-bold text-cyan-700">{formatNumber(summary.walletBonus)}</div>
                  <div className="text-xs text-cyan-600">Wallet</div>
                </CardContent>
              </Card>
              <Card className="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200">
                <CardContent className="p-3 text-center">
                  <Share2 className="h-5 w-5 mx-auto text-indigo-600 mb-1" />
                  <div className="text-lg font-bold text-indigo-700">{formatNumber(summary.totalShares)}</div>
                  <div className="text-xs text-indigo-600">Share nhận</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-950/50 dark:to-amber-950/50 border-yellow-300">
                <CardContent className="p-3 text-center">
                  <Trophy className="h-5 w-5 mx-auto text-yellow-600 mb-1" />
                  <div className="text-lg font-bold text-yellow-700">{formatNumber(summary.totalReward)}</div>
                  <div className="text-xs text-yellow-600">TỔNG V3.0</div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Stats Table */}
            <div className="flex-1 overflow-hidden border rounded-lg">
              <div className="bg-muted/50 px-3 py-2 border-b flex items-center justify-between">
                <span className="text-sm font-medium">
                  📅 Chi tiết theo ngày ({dailyStats.length} ngày hoạt động)
                </span>
                <span className="text-xs text-muted-foreground">
                  Daily Cap: {formatNumber(DAILY_REWARD_CAP)} CLC
                </span>
              </div>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-semibold">Ngày</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Bài CL</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Like</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Cmt CL</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Share</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Bạn bè</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Trước Cap</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Sau Cap</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyStats.map((stat) => (
                      <TableRow key={stat.date} className="hover:bg-muted/30">
                        <TableCell className="text-xs font-medium">{stat.date}</TableCell>
                        <TableCell className="text-xs text-center">{stat.qualityPosts || '-'}</TableCell>
                        <TableCell className="text-xs text-center">{stat.likesReceived || '-'}</TableCell>
                        <TableCell className="text-xs text-center">{stat.qualityComments || '-'}</TableCell>
                        <TableCell className="text-xs text-center">{stat.sharesReceived || '-'}</TableCell>
                        <TableCell className="text-xs text-center">{stat.friendsMade || '-'}</TableCell>
                        <TableCell className="text-xs text-right">{formatNumber(stat.rawReward)}</TableCell>
                        <TableCell className={`text-xs text-right font-medium ${stat.cappedReward < stat.rawReward ? 'text-red-600' : ''}`}>
                          {formatNumber(stat.cappedReward)}
                          {stat.cappedReward < stat.rawReward && ' ⚠️'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
              <Button variant="default" size="sm" onClick={onClose}>
                Đóng
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Không tìm thấy dữ liệu
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
