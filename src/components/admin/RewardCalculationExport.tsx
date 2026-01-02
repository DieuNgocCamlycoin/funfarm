import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Download, RefreshCw, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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
  likes_received: number;
  comments_received: number;
  shares_received: number;
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
  const [loading, setLoading] = useState(false);

  const fetchCalculations = async () => {
    setLoading(true);
    try {
      // Direct query to calculate rewards
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('pending_reward', { ascending: false });

        if (profileError) throw profileError;

        // Calculate rewards for each user manually
        const calculations = await Promise.all(
          (profiles || []).map(async (profile) => {
            // Get quality posts
            const { count: qualityPosts } = await supabase
              .from('posts')
              .select('*', { count: 'exact', head: true })
              .eq('author_id', profile.id)
              .is('original_post_id', null)
              .lte('created_at', '2025-12-31T23:59:59Z')
              .gt('content', '')
              .not('images', 'is', null);

            // Get likes received
            const { data: userPosts } = await supabase
              .from('posts')
              .select('id')
              .eq('author_id', profile.id)
              .is('original_post_id', null);

            const postIds = userPosts?.map(p => p.id) || [];
            
            let likesReceived = 0;
            let commentsReceived = 0;
            let sharesReceived = 0;

            if (postIds.length > 0) {
              const { count: likes } = await supabase
                .from('post_likes')
                .select('*', { count: 'exact', head: true })
                .in('post_id', postIds)
                .lte('created_at', '2025-12-31T23:59:59Z');
              likesReceived = likes || 0;

              const { count: comments } = await supabase
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .in('post_id', postIds)
                .neq('author_id', profile.id)
                .lte('created_at', '2025-12-31T23:59:59Z');
              commentsReceived = comments || 0;

              const { count: shares } = await supabase
                .from('post_shares')
                .select('*', { count: 'exact', head: true })
                .in('post_id', postIds)
                .lte('created_at', '2025-12-31T23:59:59Z');
              sharesReceived = shares || 0;
            }

            // Get friendships
            const { count: friendships } = await supabase
              .from('followers')
              .select('*', { count: 'exact', head: true })
              .or(`follower_id.eq.${profile.id},following_id.eq.${profile.id}`)
              .eq('status', 'accepted')
              .lte('created_at', '2025-12-31T23:59:59Z');

            const welcomeBonus = profile.welcome_bonus_claimed ? 50000 : 0;
            const walletBonus = profile.wallet_bonus_claimed ? 50000 : 0;
            const verificationBonus = profile.verification_bonus_claimed ? 50000 : 0;
            const postReward = (qualityPosts || 0) * 20000;
            const likeReward = likesReceived <= 3 
              ? likesReceived * 10000 
              : 30000 + (likesReceived - 3) * 1000;
            const commentReward = (commentsReceived || 0) * 5000;
            const shareReward = (sharesReceived || 0) * 10000;
            const friendshipReward = (friendships || 0) * 50000;

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
              quality_posts: qualityPosts || 0,
              likes_received: likesReceived,
              comments_received: commentsReceived || 0,
              shares_received: sharesReceived || 0,
              friendships: friendships || 0,
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
            <Button onClick={exportToCSV} disabled={users.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Xuất CSV ({users.length} users)
            </Button>
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
                    <TableHead className="sticky top-0 bg-background">Comment</TableHead>
                    <TableHead className="sticky top-0 bg-background">Share</TableHead>
                    <TableHead className="sticky top-0 bg-background">Bạn bè</TableHead>
                    <TableHead className="sticky top-0 bg-background">Hiện tại</TableHead>
                    <TableHead className="sticky top-0 bg-background">Tính lại</TableHead>
                    <TableHead className="sticky top-0 bg-background">Chênh lệch</TableHead>
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
                          <div>{user.comments_received}</div>
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
                        <TableCell className="font-mono">
                          {formatNumber(user.current_total)}
                        </TableCell>
                        <TableCell className="font-mono text-primary font-bold">
                          {formatNumber(user.calculated_total)}
                        </TableCell>
                        <TableCell className={`font-mono ${getDifferenceColor(diff)}`}>
                          {diff > 0 ? '+' : ''}{formatNumber(diff)}
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
