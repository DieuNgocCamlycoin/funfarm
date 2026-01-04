import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Download, RefreshCw, Loader2, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  verification_bonus_claimed: boolean;
  email_verified: boolean;
  avatar_verified: boolean;
  is_verified: boolean;
  quality_posts: number;
  normal_posts: number;
  likes_received: number;
  comments_received: number;
  quality_comments: number;
  normal_comments: number;
  shares_received: number;
  quality_shares: number;
  basic_shares: number;
  friendships: number;
  welcome_bonus: number;
  wallet_bonus: number;
  verification_bonus: number;
  post_reward: number;
  like_reward: number;
  comment_reward: number;
  share_reward: number;
  friendship_reward: number;
  calculated_total: number;
  created_at: string;
}

export function RewardCalculationExport() {
  const [users, setUsers] = useState<UserRewardCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Auto-load data on mount
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
        // Update local state
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
        // Reload data
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
      // Direct query to calculate rewards
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('pending_reward', { ascending: false });

        if (profileError) throw profileError;

        // Constants for daily limits
        const MAX_POSTS_PER_DAY = 10;
        const MAX_INTERACTIONS_PER_DAY = 50;
        const MAX_FRIENDSHIPS_PER_DAY = 10;

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

        // Get existing user IDs once
        const { data: existingUsers } = await supabase.from('profiles').select('id');
        const existingUserIds = new Set((existingUsers || []).map(u => u.id));

        // Calculate rewards for each user manually
        const calculations = await Promise.all(
          (profiles || []).map(async (profile) => {
            // Get ALL posts with timestamps for daily limit calculation
            const { data: allPosts } = await supabase
              .from('posts')
              .select('id, content, images, video_url, created_at')
              .eq('author_id', profile.id)
              .eq('post_type', 'post')
              .lte('created_at', '2025-12-31T23:59:59Z')
              .order('created_at', { ascending: true });

            // Filter quality posts: >100 chars + media = 20,000 CLC
            const qualityPostsData = (allPosts || []).filter(p => {
              const hasContent = (p.content?.length || 0) > 100;
              const hasMedia = (p.images && p.images.length > 0) || p.video_url;
              return hasContent && hasMedia;
            });
            
            // Filter normal posts: không đạt chất lượng = 5,000 CLC
            const normalPostsData = (allPosts || []).filter(p => {
              const hasContent = (p.content?.length || 0) > 100;
              const hasMedia = (p.images && p.images.length > 0) || p.video_url;
              return !(hasContent && hasMedia);
            });

            // Apply 10 posts/day limit
            const rewardableQualityPosts = applyDailyLimit(qualityPostsData, p => p.created_at, MAX_POSTS_PER_DAY);
            const rewardableNormalPosts = applyDailyLimit(normalPostsData, p => p.created_at, MAX_POSTS_PER_DAY);
            const qualityPosts = rewardableQualityPosts.length;
            const normalPosts = rewardableNormalPosts.length;

            // Get original post IDs
            const postIds = (allPosts || []).map(p => p.id);
            
            let likesReceived = 0;
            let commentsReceived = 0;
            let qualityComments = 0;
            let normalComments = 0;
            let sharesReceived = 0;
            let basicShares = 0;
            let qualityShares = 0;

            // Collect all interactions for daily limit
            interface Interaction {
              type: 'like' | 'comment' | 'share';
              user_id: string;
              post_id: string;
              created_at: string;
              share_comment_length?: number;
              content_length?: number;
            }
            const allInteractions: Interaction[] = [];

            if (postIds.length > 0) {
              // Fetch likes received
              const { data: likesData } = await supabase
                .from('post_likes')
                .select('user_id, post_id, created_at')
                .in('post_id', postIds)
                .neq('user_id', profile.id)
                .lte('created_at', '2025-12-31T23:59:59Z')
                .order('created_at', { ascending: true });

              for (const like of likesData || []) {
                if (existingUserIds.has(like.user_id)) {
                  allInteractions.push({
                    type: 'like',
                    user_id: like.user_id,
                    post_id: like.post_id,
                    created_at: like.created_at
                  });
                }
              }

              // Fetch ALL comments received
              const { data: commentsData } = await supabase
                .from('comments')
                .select('author_id, post_id, content, created_at')
                .in('post_id', postIds)
                .neq('author_id', profile.id)
                .lte('created_at', '2025-12-31T23:59:59Z')
                .order('created_at', { ascending: true });

              for (const comment of commentsData || []) {
                if (existingUserIds.has(comment.author_id)) {
                  allInteractions.push({
                    type: 'comment',
                    user_id: comment.author_id,
                    post_id: comment.post_id,
                    created_at: comment.created_at,
                    content_length: comment.content?.length || 0
                  });
                }
              }

              // Fetch shares received
              const { data: sharesData } = await supabase
                .from('post_shares')
                .select('user_id, post_id, created_at')
                .in('post_id', postIds)
                .neq('user_id', profile.id)
                .lte('created_at', '2025-12-31T23:59:59Z')
                .order('created_at', { ascending: true });

              for (const share of sharesData || []) {
                if (existingUserIds.has(share.user_id)) {
                  const { data: sharePost } = await supabase
                    .from('posts')
                    .select('share_comment')
                    .eq('original_post_id', share.post_id)
                    .eq('author_id', share.user_id)
                    .eq('post_type', 'share')
                    .maybeSingle();

                  allInteractions.push({
                    type: 'share',
                    user_id: share.user_id,
                    post_id: share.post_id,
                    created_at: share.created_at,
                    share_comment_length: sharePost?.share_comment?.length || 0
                  });
                }
              }
            }

            // Sort all interactions by created_at
            allInteractions.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            // Apply 50 interactions/day limit
            const rewardableInteractions = applyDailyLimit(
              allInteractions,
              i => i.created_at,
              MAX_INTERACTIONS_PER_DAY
            );

            // Count totals from limited interactions - GROUP LIKES BY POST
            const likesPerPost = new Map<string, Set<string>>();
            for (const i of rewardableInteractions) {
              if (i.type === 'like') {
                if (!likesPerPost.has(i.post_id)) {
                  likesPerPost.set(i.post_id, new Set());
                }
                likesPerPost.get(i.post_id)!.add(i.user_id);
                likesReceived++;
              } else if (i.type === 'comment') {
                commentsReceived++;
                // Phân loại comment: chất lượng >20 chars, thường <=20 chars
                if ((i.content_length || 0) > 20) {
                  qualityComments++;
                } else {
                  normalComments++;
                }
              } else if (i.type === 'share') {
                sharesReceived++;
                if ((i.share_comment_length || 0) >= 20) {
                  qualityShares++;
                } else {
                  basicShares++;
                }
              }
            }
            
            // Calculate like reward PER POST (3 first likes = 10k each, rest = 1k each)
            let calculatedLikeReward = 0;
            for (const [, likers] of likesPerPost) {
              const likeCount = likers.size;
              const first3Reward = Math.min(likeCount, 3) * 10000;
              const restReward = Math.max(0, likeCount - 3) * 1000;
              calculatedLikeReward += first3Reward + restReward;
            }

            // Get friendships với users còn tồn tại - MAX 10/DAY
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
            
            // Apply 10 friendships/day limit
            const rewardableFriendships = applyDailyLimit(
              validFriendships,
              (f: { created_at: string }) => f.created_at,
              MAX_FRIENDSHIPS_PER_DAY
            );
            const friendships = rewardableFriendships.length;

            const welcomeBonus = profile.welcome_bonus_claimed ? 50000 : 0;
            const walletBonus = profile.wallet_bonus_claimed ? 50000 : 0;
            // verification_bonus_claimed đã gộp vào welcome_bonus, không tính riêng
            const verificationBonus = 0;
            const postReward = (qualityPosts * 20000) + (normalPosts * 5000); // Bài CL = 20k, Bài thường = 5k
            const likeReward = calculatedLikeReward;
            const commentReward = (qualityComments * 5000) + (normalComments * 1000); // Comment CL = 5k, Comment thường = 1k
            const shareReward = (basicShares * 4000) + (qualityShares * 10000);
            const friendshipReward = friendships * 50000;

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
              verification_bonus_claimed: profile.verification_bonus_claimed,
              email_verified: profile.email_verified,
              avatar_verified: profile.avatar_verified,
              is_verified: profile.is_verified,
              quality_posts: qualityPosts,
              normal_posts: normalPosts,
              likes_received: likesReceived,
              comments_received: commentsReceived,
              quality_comments: qualityComments,
              normal_comments: normalComments,
              shares_received: sharesReceived,
              quality_shares: qualityShares,
              basic_shares: basicShares,
              friendships: friendships,
              welcome_bonus: welcomeBonus,
              wallet_bonus: walletBonus,
              verification_bonus: verificationBonus,
              post_reward: postReward,
              like_reward: likeReward,
              comment_reward: commentReward,
              share_reward: shareReward,
              friendship_reward: friendshipReward,
              calculated_total: welcomeBonus + walletBonus + verificationBonus + postReward + likeReward + commentReward + shareReward + friendshipReward,
              created_at: profile.created_at
            };
          })
        );

        setUsers(calculations);
        toast.success(`Đã tải ${calculations.length} users`);
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
      'Welcome bonus (claimed)',
      'Wallet bonus (claimed)',
      'Verification bonus (claimed)',
      'Email verified',
      'Avatar verified',
      'Is verified',
      'Số bài CL',
      'Số like nhận',
      'Số comment nhận',
      'Số share nhận',
      'Số bạn bè',
      'Thưởng Welcome',
      'Thưởng Wallet',
      'Thưởng Verification',
      'Thưởng Bài viết',
      'Thưởng Like',
      'Thưởng Comment',
      'Thưởng Share',
      'Thưởng Kết bạn',
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
      user.verification_bonus_claimed ? 'Có' : 'Không',
      user.email_verified ? 'Có' : 'Không',
      user.avatar_verified ? 'Có' : 'Không',
      user.is_verified ? 'Có' : 'Không',
      user.quality_posts,
      user.likes_received,
      user.comments_received,
      user.shares_received,
      user.friendships,
      user.welcome_bonus,
      user.wallet_bonus,
      user.verification_bonus,
      user.post_reward,
      user.like_reward,
      user.comment_reward,
      user.share_reward,
      user.friendship_reward,
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
    link.download = `reward_calculation_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Đã xuất CSV thành công!');
  };

  const exportDetailedReport = () => {
    if (users.length === 0) {
      toast.error('Chưa có dữ liệu để xuất');
      return;
    }

    // Calculate totals by action type
    const totals = {
      welcome: { count: 0, amount: 0 },
      wallet: { count: 0, amount: 0 },
      verification: { count: 0, amount: 0 },
      post: { count: 0, amount: 0 },
      like: { count: 0, amount: 0 },
      comment: { count: 0, amount: 0 },
      share: { count: 0, amount: 0 },
      friendship: { count: 0, amount: 0 }
    };

    users.forEach(user => {
      if (user.welcome_bonus > 0) { totals.welcome.count++; totals.welcome.amount += user.welcome_bonus; }
      if (user.wallet_bonus > 0) { totals.wallet.count++; totals.wallet.amount += user.wallet_bonus; }
      if (user.verification_bonus > 0) { totals.verification.count++; totals.verification.amount += user.verification_bonus; }
      if (user.post_reward > 0) { totals.post.count += user.quality_posts; totals.post.amount += user.post_reward; }
      if (user.like_reward > 0) { totals.like.count += user.likes_received; totals.like.amount += user.like_reward; }
      if (user.comment_reward > 0) { totals.comment.count += user.comments_received; totals.comment.amount += user.comment_reward; }
      if (user.share_reward > 0) { totals.share.count += user.shares_received; totals.share.amount += user.share_reward; }
      if (user.friendship_reward > 0) { totals.friendship.count += user.friendships; totals.friendship.amount += user.friendship_reward; }
    });

    // Summary section
    const summaryLines = [
      '=== BÁO CÁO CHI TIẾT REWARD THEO LOẠI HÀNH ĐỘNG ===',
      `Ngày xuất: ${new Date().toLocaleString('vi-VN')}`,
      `Cutoff date: 31/12/2025`,
      `Tổng users: ${users.length}`,
      '',
      '=== TỔNG KẾT THEO LOẠI HÀNH ĐỘNG ===',
      'Loại hành động,Số lượng,Thưởng (CLC),Đơn giá (CLC)',
      `Welcome Bonus,${totals.welcome.count} users,${totals.welcome.amount},50000/user`,
      `Wallet Bonus,${totals.wallet.count} users,${totals.wallet.amount},50000/user`,
      `Verification Bonus,${totals.verification.count} users,${totals.verification.amount},50000/user`,
      `Quality Posts,${totals.post.count} bài,${totals.post.amount},20000/bài`,
      `Likes Received,${totals.like.count} likes,${totals.like.amount},"10000 (3 đầu) / 1000 (còn lại)"`,
      `Comments Received,${totals.comment.count} comments,${totals.comment.amount},5000/comment`,
      `Shares Received,${totals.share.count} shares,${totals.share.amount},10000/share`,
      `Friendships,${totals.friendship.count} friendships,${totals.friendship.amount},50000/friendship`,
      '',
      `TỔNG CỘNG,,${totals.welcome.amount + totals.wallet.amount + totals.verification.amount + totals.post.amount + totals.like.amount + totals.comment.amount + totals.share.amount + totals.friendship.amount},`,
      '',
      '=== CHI TIẾT TỪNG USER ==='
    ];

    // Detail headers
    const detailHeaders = [
      'Tên',
      'Welcome',
      'Wallet', 
      'Verification',
      'Bài CL (số)',
      'Bài CL (CLC)',
      'Like (số)',
      'Like (CLC)',
      'Comment (số)',
      'Comment (CLC)',
      'Share (số)',
      'Share (CLC)',
      'Bạn bè (số)',
      'Bạn bè (CLC)',
      'TỔNG (CLC)'
    ];

    const detailRows = users.map(user => [
      user.display_name,
      user.welcome_bonus,
      user.wallet_bonus,
      user.verification_bonus,
      user.quality_posts,
      user.post_reward,
      user.likes_received,
      user.like_reward,
      user.comments_received,
      user.comment_reward,
      user.shares_received,
      user.share_reward,
      user.friendships,
      user.friendship_reward,
      user.calculated_total
    ]);

    const csvContent = [
      ...summaryLines,
      detailHeaders.join(','),
      ...detailRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reward_detailed_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Đã xuất báo cáo chi tiết!');
  };

  // Calculate summary by action type for display
  const getActionTypeSummary = () => {
    const totals = {
      welcome: { count: 0, amount: 0 },
      wallet: { count: 0, amount: 0 },
      verification: { count: 0, amount: 0 },
      post: { count: 0, amount: 0 },
      like: { count: 0, amount: 0 },
      comment: { count: 0, amount: 0 },
      share: { count: 0, amount: 0 },
      friendship: { count: 0, amount: 0 }
    };

    users.forEach(user => {
      if (user.welcome_bonus > 0) { totals.welcome.count++; totals.welcome.amount += user.welcome_bonus; }
      if (user.wallet_bonus > 0) { totals.wallet.count++; totals.wallet.amount += user.wallet_bonus; }
      if (user.verification_bonus > 0) { totals.verification.count++; totals.verification.amount += user.verification_bonus; }
      totals.post.count += user.quality_posts; totals.post.amount += user.post_reward;
      totals.like.count += user.likes_received; totals.like.amount += user.like_reward;
      totals.comment.count += user.comments_received; totals.comment.amount += user.comment_reward;
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
            📊 Bảng Tính Điểm Thưởng (đến 31/12/2025)
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
            <Button onClick={exportDetailedReport} disabled={users.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Báo cáo chi tiết
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={users.length === 0 || resetting}>
                  {resetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                  Reset All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>⚠️ Xác nhận Reset Pending Reward</AlertDialogTitle>
                  <AlertDialogDescription>
                    Hành động này sẽ reset <strong>pending_reward</strong> của TẤT CẢ users về số đã tính lại theo công thức Light Law (đến 31/12/2025).
                    <br /><br />
                    <strong>Lưu ý:</strong> approved_reward và camly_balance (đã claim) sẽ KHÔNG bị thay đổi.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={resetAllRewards} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Xác nhận Reset
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
            <p>Nhấn "Tải dữ liệu" để xem bảng tính điểm thưởng</p>
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
                  <h3 className="font-semibold mb-3">📈 Tổng kết theo loại hành động</h3>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div className="flex justify-between border-b pb-1">
                      <span>🎁 Welcome Bonus</span>
                      <span className="font-mono">{summary.welcome.count} users = {formatNumber(summary.welcome.amount)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>💳 Wallet Bonus</span>
                      <span className="font-mono">{summary.wallet.count} users = {formatNumber(summary.wallet.amount)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>✅ Verification</span>
                      <span className="font-mono">{summary.verification.count} users = {formatNumber(summary.verification.amount)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>📝 Quality Posts</span>
                      <span className="font-mono">{summary.post.count} bài = {formatNumber(summary.post.amount)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>❤️ Likes</span>
                      <span className="font-mono">{summary.like.count} likes = {formatNumber(summary.like.amount)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>💬 Comments</span>
                      <span className="font-mono">{summary.comment.count} cmt = {formatNumber(summary.comment.amount)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>🔄 Shares</span>
                      <span className="font-mono">{summary.share.count} shares = {formatNumber(summary.share.amount)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>🤝 Friendships</span>
                      <span className="font-mono">{summary.friendship.count} = {formatNumber(summary.friendship.amount)}</span>
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
                    <TableHead className="sticky top-0 bg-background">Bài TT</TableHead>
                    <TableHead className="sticky top-0 bg-background">Like</TableHead>
                    <TableHead className="sticky top-0 bg-background">Cmt CL</TableHead>
                    <TableHead className="sticky top-0 bg-background">Cmt TT</TableHead>
                    <TableHead className="sticky top-0 bg-background">Share CL</TableHead>
                    <TableHead className="sticky top-0 bg-background">Share TT</TableHead>
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
                          <div className="text-xs text-green-500">+{formatNumber(user.quality_posts * 20000)}</div>
                        </TableCell>
                        <TableCell>
                          <div>{user.normal_posts}</div>
                          <div className="text-xs text-blue-500">+{formatNumber(user.normal_posts * 5000)}</div>
                        </TableCell>
                        <TableCell>
                          <div>{user.likes_received}</div>
                          <div className="text-xs text-green-500">+{formatNumber(user.like_reward)}</div>
                        </TableCell>
                        <TableCell>
                          <div>{user.quality_comments}</div>
                          <div className="text-xs text-green-500">+{formatNumber(user.quality_comments * 5000)}</div>
                        </TableCell>
                        <TableCell>
                          <div>{user.normal_comments}</div>
                          <div className="text-xs text-blue-500">+{formatNumber(user.normal_comments * 1000)}</div>
                        </TableCell>
                        <TableCell>
                          <div>{user.quality_shares}</div>
                          <div className="text-xs text-green-500">+{formatNumber(user.quality_shares * 10000)}</div>
                        </TableCell>
                        <TableCell>
                          <div>{user.basic_shares}</div>
                          <div className="text-xs text-blue-500">+{formatNumber(user.basic_shares * 4000)}</div>
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
