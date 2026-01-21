import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Download, RefreshCw, Loader2, AlertTriangle, CheckCircle2, RotateCcw, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  calculateAllUsersRewards,
  RewardCalculationResult,
  REWARD_RATES
} from "@/lib/rewardCalculationService";

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

const CACHE_KEY = 'reward_calculation_cache_v3';

export function RewardCalculationExport() {
  const [users, setUsers] = useState<UserRewardCalculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    setUsers([]);
    setLastUpdated(null);
    toast.success('Đã xóa cache');
  };

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
      // Use centralized reward calculation service
      const results = await calculateAllUsersRewards();

      // Fetch additional profile data for wallet_address and is_verified
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, wallet_address, is_verified, camly_balance, welcome_bonus_claimed, wallet_bonus_claimed');

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Map results to component format
      const calculations: UserRewardCalculation[] = results.map((r: RewardCalculationResult) => {
        const profile = profileMap.get(r.userId);
        return {
          id: r.userId,
          display_name: r.displayName,
          wallet_address: profile?.wallet_address || '',
          pending_reward: r.currentPending,
          approved_reward: r.currentApproved,
          camly_balance: profile?.camly_balance || 0,
          current_total: r.currentTotal + (profile?.camly_balance || 0),
          welcome_bonus_claimed: profile?.welcome_bonus_claimed || false,
          wallet_bonus_claimed: profile?.wallet_bonus_claimed || false,
          is_verified: profile?.is_verified || false,
          quality_posts: r.qualityPosts,
          likes_received: r.likesReceived,
          quality_comments: r.qualityComments,
          shares_received: r.sharesReceived,
          friendships: r.friendships,
          welcome_bonus: r.welcomeBonus,
          wallet_bonus: r.walletBonus,
          post_reward: r.postReward,
          like_reward: r.likeReward,
          comment_reward: r.commentReward,
          share_reward: r.shareReward,
          friendship_reward: r.friendshipReward,
          daily_rewards_total: r.dailyRewardsTotal,
          calculated_total: r.calculatedTotal,
          created_at: r.createdAt
        };
      });

      setUsers(calculations);
      const now = new Date();
      setLastUpdated(now);
      
      // Save to cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: calculations,
        timestamp: now.toISOString()
      }));
      
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
    if (diff > 0) return 'text-red-400';
    if (diff < 0) return 'text-green-500';
    return 'text-muted-foreground';
  };

  const summary = getActionTypeSummary();
  const totalCalculated = users.reduce((sum, u) => sum + u.calculated_total, 0);
  const totalCurrent = users.reduce((sum, u) => sum + u.current_total, 0);

  // Find users with big discrepancies
  const bigDiscrepancies = users.filter(u => Math.abs(u.current_total - u.calculated_total) > 100000);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>📊 Reward System v3.0 - Tính toán chi tiết</span>
            {lastUpdated && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {lastUpdated.toLocaleString('vi-VN')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={fetchCalculations} disabled={loading} size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Tải dữ liệu
            </Button>
            <Button onClick={exportToCSV} disabled={users.length === 0} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Xuất CSV
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={resetting || users.length === 0} size="sm" variant="destructive">
                  {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                  Reset All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận Reset All Rewards?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Thao tác này sẽ tính lại TOÀN BỘ thưởng của tất cả users theo Reward System v3.0.
                    <br /><br />
                    <strong>Không thể hoàn tác!</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={resetAllRewards} className="bg-destructive text-destructive-foreground">
                    Xác nhận Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={clearCache} size="sm" variant="ghost">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {users.length > 0 && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Tổng users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Tổng v3.0 tính lại</p>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(totalCalculated)}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Tổng hiện tại (DB)</p>
                  <p className="text-2xl font-bold">{formatNumber(totalCurrent)}</p>
                </CardContent>
              </Card>
              <Card className={totalCurrent > totalCalculated ? "bg-red-50 dark:bg-red-950/30" : "bg-green-50 dark:bg-green-950/30"}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Chênh lệch</p>
                  <p className={`text-2xl font-bold ${totalCurrent > totalCalculated ? 'text-red-600' : 'text-green-600'}`}>
                    {formatNumber(totalCurrent - totalCalculated)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Action type breakdown */}
            <div className="grid grid-cols-3 md:grid-cols-7 gap-2 mb-6 text-center text-sm">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded">
                <p className="font-medium">Welcome</p>
                <p className="text-xs">{summary.welcome.count} users</p>
                <p className="text-amber-600 font-bold">{formatNumber(summary.welcome.amount)}</p>
              </div>
              <div className="p-2 bg-cyan-50 dark:bg-cyan-950/30 rounded">
                <p className="font-medium">Wallet</p>
                <p className="text-xs">{summary.wallet.count} users</p>
                <p className="text-cyan-600 font-bold">{formatNumber(summary.wallet.amount)}</p>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
                <p className="font-medium">Bài CL</p>
                <p className="text-xs">{summary.post.count} bài</p>
                <p className="text-blue-600 font-bold">{formatNumber(summary.post.amount)}</p>
              </div>
              <div className="p-2 bg-pink-50 dark:bg-pink-950/30 rounded">
                <p className="font-medium">Like nhận</p>
                <p className="text-xs">{summary.like.count} likes</p>
                <p className="text-pink-600 font-bold">{formatNumber(summary.like.amount)}</p>
              </div>
              <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded">
                <p className="font-medium">Cmt CL</p>
                <p className="text-xs">{summary.comment.count} cmts</p>
                <p className="text-green-600 font-bold">{formatNumber(summary.comment.amount)}</p>
              </div>
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded">
                <p className="font-medium">Share nhận</p>
                <p className="text-xs">{summary.share.count} shares</p>
                <p className="text-indigo-600 font-bold">{formatNumber(summary.share.amount)}</p>
              </div>
              <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded">
                <p className="font-medium">Kết bạn</p>
                <p className="text-xs">{summary.friendship.count} bạn</p>
                <p className="text-purple-600 font-bold">{formatNumber(summary.friendship.amount)}</p>
              </div>
            </div>

            {/* Big discrepancies warning */}
            {bigDiscrepancies.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-medium mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  {bigDiscrepancies.length} users có chênh lệch &gt; 100k CLC
                </div>
                <div className="flex flex-wrap gap-2">
                  {bigDiscrepancies.slice(0, 5).map(u => (
                    <Badge key={u.id} variant="secondary" className="text-xs">
                      {u.display_name}: {formatNumber(u.current_total - u.calculated_total)}
                    </Badge>
                  ))}
                  {bigDiscrepancies.length > 5 && (
                    <Badge variant="outline">+{bigDiscrepancies.length - 5} more</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Data table */}
            <div className="border rounded-lg overflow-auto max-h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[200px]">User</TableHead>
                    <TableHead className="text-center">Bài CL</TableHead>
                    <TableHead className="text-center">Like</TableHead>
                    <TableHead className="text-center">Cmt CL</TableHead>
                    <TableHead className="text-center">Share</TableHead>
                    <TableHead className="text-center">Bạn</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Approved</TableHead>
                    <TableHead className="text-right">V3.0</TableHead>
                    <TableHead className="text-right">Chênh lệch</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.is_verified && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          <span className="font-medium truncate max-w-[150px]">{user.display_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{user.quality_posts}</TableCell>
                      <TableCell className="text-center">{user.likes_received}</TableCell>
                      <TableCell className="text-center">{user.quality_comments}</TableCell>
                      <TableCell className="text-center">{user.shares_received}</TableCell>
                      <TableCell className="text-center">{user.friendships}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(user.pending_reward)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(user.approved_reward)}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-blue-600">
                        {formatNumber(user.calculated_total)}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${getDifferenceColor(user.current_total - user.calculated_total)}`}>
                        {formatNumber(user.current_total - user.calculated_total)}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.pending_reward !== user.calculated_total && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={resettingUserId === user.id}
                            onClick={() => resetSingleUser(user.id, user.calculated_total)}
                          >
                            {resettingUserId === user.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {users.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-8">
            Nhấn "Tải dữ liệu" để tính toán chi tiết theo Reward System v3.0
          </p>
        )}
      </CardContent>
    </Card>
  );
}
