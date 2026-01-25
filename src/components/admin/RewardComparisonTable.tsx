import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RefreshCw, Loader2, ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRewardDetailModal } from "./UserRewardDetailModal";
import { 
  calculateAllUsersRewards, 
  RewardCalculationResult 
} from "@/lib/rewardCalculationService";

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
  
  // Snapshot timestamp for consistent data between table and modal
  const [cutoffTimestamp, setCutoffTimestamp] = useState<string | null>(null);

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

  const fetchComparison = async () => {
    setLoading(true);
    try {
      // Capture snapshot timestamp BEFORE fetching for data consistency
      const snapshotTime = new Date().toISOString();
      setCutoffTimestamp(snapshotTime);
      
      // Use centralized reward calculation service with consistent cutoff
      const results = await calculateAllUsersRewards({
        cutoffTimestamp: snapshotTime
      });

      // Map results to comparison data format
      const calculations: ComparisonData[] = results
        .filter(r => r.currentPending > 0 || r.calculatedTotal > 0)
        .map((r: RewardCalculationResult) => ({
          id: r.userId,
          display_name: r.displayName,
          avatar_url: r.avatarUrl,
          current_pending: r.currentPending,
          calculated_v3: r.calculatedTotal,
          difference: r.currentPending - r.calculatedTotal,
          welcome_bonus: r.welcomeBonus,
          wallet_bonus: r.walletBonus,
          quality_posts: r.qualityPosts,
          likes_received: r.likesReceived,
          quality_comments: r.qualityComments,
          shares_received: r.sharesReceived,
          friendships: r.friendships
        }));
      
      setUsers(calculations);
      const now = new Date();
      setLastUpdated(now);
      
      // Save to cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: calculations,
        timestamp: now.toISOString()
      }));
      
      toast.success(`Đã so sánh ${calculations.length} users với V3.0`);
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
        {users.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nhấn "Tải dữ liệu" để so sánh điểm Honor Board với V3.0
          </p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[250px]">User</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('current_pending')}
                  >
                    Honor Board {sortField === 'current_pending' && (sortDir === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('calculated_v3')}
                  >
                    V3.0 {sortField === 'calculated_v3' && (sortDir === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted"
                    onClick={() => handleSort('difference')}
                  >
                    Chênh lệch {sortField === 'difference' && (sortDir === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-center">Chi tiết V3.0</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.map((user) => (
                  <TableRow 
                    key={user.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedUserId(user.id);
                      setSelectedUserName(user.display_name);
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || ''} />
                          <AvatarFallback>{user.display_name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate max-w-[180px]">{user.display_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(user.current_pending)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(user.calculated_v3)}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.difference === 0 ? (
                        <Badge variant="secondary">Giống</Badge>
                      ) : user.difference > 0 ? (
                        <Badge variant="destructive">-{formatNumber(user.difference)}</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                          +{formatNumber(Math.abs(user.difference))}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center text-xs text-muted-foreground">
                        <span title="Bài CL">📝{user.quality_posts}</span>
                        <span title="Like">❤️{user.likes_received}</span>
                        <span title="Cmt CL">💬{user.quality_comments}</span>
                        <span title="Share">🔄{user.shares_received}</span>
                        <span title="Bạn bè">👥{user.friendships}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* User Detail Modal - uses same cutoff timestamp for data consistency */}
      <UserRewardDetailModal
        open={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
        userId={selectedUserId || ''}
        userName={selectedUserName}
        cutoffTimestamp={cutoffTimestamp}
      />
    </Card>
  );
}
