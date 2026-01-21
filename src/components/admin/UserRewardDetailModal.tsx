import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileText, Heart, MessageSquare, Share2, Users, Wallet, Gift, Calendar, Trophy } from 'lucide-react';
import { 
  calculateUserReward, 
  getValidUserIds,
  RewardCalculationResult,
  DailyRewardStats,
  DAILY_REWARD_CAP
} from '@/lib/rewardCalculationService';

interface UserRewardDetailModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const formatNumber = (num: number) => num.toLocaleString('vi-VN');

export function UserRewardDetailModal({ open, onClose, userId, userName }: UserRewardDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<RewardCalculationResult | null>(null);

  useEffect(() => {
    if (open && userId) {
      loadUserDetails();
    }
  }, [open, userId]);

  const loadUserDetails = async () => {
    setLoading(true);
    try {
      const validUserIds = await getValidUserIds();
      
      const calculationResult = await calculateUserReward({
        userId,
        validUserIds,
        includeDailyBreakdown: true
      });

      setResult(calculationResult);
    } catch (error) {
      console.error('Error loading user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!result || !result.dailyStats) return;

    const headers = ['Ngày', 'Bài CL', 'Like nhận', 'Cmt CL nhận', 'Share nhận', 'Bạn bè', 'Thưởng (trước cap)', 'Thưởng (sau cap)'];
    const rows = result.dailyStats.map((d: DailyRewardStats) => [
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
      result.qualityPosts,
      result.likesReceived,
      result.qualityComments,
      result.sharesReceived,
      result.friendships,
      result.dailyStats.reduce((sum: number, d: DailyRewardStats) => sum + d.rawReward, 0),
      result.dailyStats.reduce((sum: number, d: DailyRewardStats) => sum + d.cappedReward, 0)
    ]);

    // Add bonus rows
    rows.push(['Welcome Bonus', '', '', '', '', '', '', result.welcomeBonus]);
    rows.push(['Wallet Bonus', '', '', '', '', '', '', result.walletBonus]);
    rows.push(['TỔNG V3.0', '', '', '', '', '', '', result.calculatedTotal]);

    const csvContent = [
      `Chi tiết thưởng: ${userName}`,
      `Tham gia: ${result.createdAt ? new Date(result.createdAt).toLocaleDateString('vi-VN') : 'N/A'}`,
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
                <AvatarImage src={result?.avatarUrl || ''} />
                <AvatarFallback>{userName?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <div className="text-lg font-semibold">{userName}</div>
              {result && (
                <div className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Tham gia: {new Date(result.createdAt).toLocaleDateString('vi-VN')}
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
        ) : result ? (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
              <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
                <CardContent className="p-3 text-center">
                  <FileText className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                  <div className="text-lg font-bold text-blue-700">{formatNumber(result.qualityPosts)}</div>
                  <div className="text-xs text-blue-600">Bài CL</div>
                </CardContent>
              </Card>
              <Card className="bg-pink-50 dark:bg-pink-950/30 border-pink-200">
                <CardContent className="p-3 text-center">
                  <Heart className="h-5 w-5 mx-auto text-pink-600 mb-1" />
                  <div className="text-lg font-bold text-pink-700">{formatNumber(result.likesReceived)}</div>
                  <div className="text-xs text-pink-600">Like nhận</div>
                </CardContent>
              </Card>
              <Card className="bg-green-50 dark:bg-green-950/30 border-green-200">
                <CardContent className="p-3 text-center">
                  <MessageSquare className="h-5 w-5 mx-auto text-green-600 mb-1" />
                  <div className="text-lg font-bold text-green-700">{formatNumber(result.qualityComments)}</div>
                  <div className="text-xs text-green-600">Cmt CL nhận</div>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200">
                <CardContent className="p-3 text-center">
                  <Users className="h-5 w-5 mx-auto text-purple-600 mb-1" />
                  <div className="text-lg font-bold text-purple-700">{formatNumber(result.friendships)}</div>
                  <div className="text-xs text-purple-600">Bạn bè</div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200">
                <CardContent className="p-3 text-center">
                  <Gift className="h-5 w-5 mx-auto text-orange-600 mb-1" />
                  <div className="text-lg font-bold text-orange-700">{formatNumber(result.welcomeBonus)}</div>
                  <div className="text-xs text-orange-600">Welcome</div>
                </CardContent>
              </Card>
              <Card className="bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200">
                <CardContent className="p-3 text-center">
                  <Wallet className="h-5 w-5 mx-auto text-cyan-600 mb-1" />
                  <div className="text-lg font-bold text-cyan-700">{formatNumber(result.walletBonus)}</div>
                  <div className="text-xs text-cyan-600">Wallet</div>
                </CardContent>
              </Card>
              <Card className="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200">
                <CardContent className="p-3 text-center">
                  <Share2 className="h-5 w-5 mx-auto text-indigo-600 mb-1" />
                  <div className="text-lg font-bold text-indigo-700">{formatNumber(result.sharesReceived)}</div>
                  <div className="text-xs text-indigo-600">Share nhận</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-950/50 dark:to-amber-950/50 border-yellow-300">
                <CardContent className="p-3 text-center">
                  <Trophy className="h-5 w-5 mx-auto text-yellow-600 mb-1" />
                  <div className="text-lg font-bold text-yellow-700">{formatNumber(result.calculatedTotal)}</div>
                  <div className="text-xs text-yellow-600">Tổng V3.0</div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Stats Table */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Chi tiết theo ngày (Vietnam Time)</h3>
              <Button size="sm" variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Xuất CSV
              </Button>
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead className="text-center">Bài CL</TableHead>
                    <TableHead className="text-center">Like nhận</TableHead>
                    <TableHead className="text-center">Cmt CL</TableHead>
                    <TableHead className="text-center">Share nhận</TableHead>
                    <TableHead className="text-center">Bạn bè</TableHead>
                    <TableHead className="text-right">Thưởng (trước cap)</TableHead>
                    <TableHead className="text-right">Thưởng (sau cap)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.dailyStats?.map((day) => (
                    <TableRow key={day.date} className={day.rawReward > DAILY_REWARD_CAP ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                      <TableCell className="font-medium">{day.date}</TableCell>
                      <TableCell className="text-center">{day.qualityPosts || '-'}</TableCell>
                      <TableCell className="text-center">{day.likesReceived || '-'}</TableCell>
                      <TableCell className="text-center">{day.qualityComments || '-'}</TableCell>
                      <TableCell className="text-center">{day.sharesReceived || '-'}</TableCell>
                      <TableCell className="text-center">{day.friendsMade || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(day.rawReward)}
                        {day.rawReward > DAILY_REWARD_CAP && (
                          <span className="text-yellow-600 ml-1">⚠️</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatNumber(day.cappedReward)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Summary Row */}
                  <TableRow className="bg-muted/50 font-bold sticky bottom-0">
                    <TableCell>TỔNG</TableCell>
                    <TableCell className="text-center">{result.qualityPosts}</TableCell>
                    <TableCell className="text-center">{result.likesReceived}</TableCell>
                    <TableCell className="text-center">{result.qualityComments}</TableCell>
                    <TableCell className="text-center">{result.sharesReceived}</TableCell>
                    <TableCell className="text-center">{result.friendships}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(result.dailyStats?.reduce((sum, d) => sum + d.rawReward, 0) || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-yellow-700">
                      {formatNumber(result.dailyStats?.reduce((sum, d) => sum + d.cappedReward, 0) || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Final calculation note */}
            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
              <p>
                <strong>Công thức:</strong> Tổng V3.0 = Welcome ({formatNumber(result.welcomeBonus)}) + Wallet ({formatNumber(result.walletBonus)}) + Daily rewards sau cap ({formatNumber(result.dailyStats?.reduce((sum, d) => sum + d.cappedReward, 0) || 0)}) = <strong className="text-foreground">{formatNumber(result.calculatedTotal)} CLC</strong>
              </p>
              <p className="mt-1 text-xs">
                ⚠️ Các ngày có thưởng vượt 500k CLC sẽ bị cap về 500k. V3.1: Like và Comment có giới hạn riêng biệt (50/ngày mỗi loại).
              </p>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Không tìm thấy dữ liệu user
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
