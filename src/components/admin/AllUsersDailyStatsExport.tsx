import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, FileSpreadsheet, Loader2, CalendarIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
}

interface DailyStats {
  userId: string;
  displayName: string;
  email: string;
  date: string;
  postsCreated: number;
  reactionsGiven: number;
  reactionsReceived: number;
  commentsGiven: number;
  commentsReceived: number;
  sharesGiven: number;
  sharesReceived: number;
  friendsAdded: number;
}

export function AllUsersDailyStatsExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentUser, setCurrentUser] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const getValidUserIds = async (): Promise<string[]> => {
    // Lấy active profiles (không bị ban)
    const { data: activeProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('banned', false);
    
    // Lấy deleted users
    const { data: deletedUsers } = await supabase
      .from('deleted_users')
      .select('user_id');
    
    const deletedUserIds = new Set(deletedUsers?.map(d => d.user_id) || []);
    
    // Valid = active AND không trong deleted_users
    return activeProfiles
      ?.filter(p => !deletedUserIds.has(p.id))
      .map(p => p.id) || [];
  };

  const fetchUserDailyStats = async (
    user: UserProfile, 
    validUserIds: string[],
    filterStartDate?: Date,
    filterEndDate?: Date
  ): Promise<DailyStats[]> => {
    const userId = user.id;
    const stats: DailyStats[] = [];
    
    // Build date filter strings
    const startDateStr = filterStartDate ? format(filterStartDate, 'yyyy-MM-dd') : null;
    const endDateStr = filterEndDate ? format(filterEndDate, 'yyyy-MM-dd') + 'T23:59:59' : null;
    
    // Fetch user's posts (không phải share)
    let postsQuery = supabase
      .from('posts')
      .select('id, created_at')
      .eq('author_id', userId)
      .neq('post_type', 'share');
    
    if (startDateStr) postsQuery = postsQuery.gte('created_at', startDateStr);
    if (endDateStr) postsQuery = postsQuery.lte('created_at', endDateStr);
    
    const { data: userPosts } = await postsQuery;
    const userPostIds = userPosts?.map(p => p.id) || [];
    
    // Get all dates this user has activity
    const allDates = new Set<string>();
    
    // Posts created dates
    userPosts?.forEach(p => {
      allDates.add(format(new Date(p.created_at), 'yyyy-MM-dd'));
    });

    // Fetch reactions given
    let reactionsGivenQuery = supabase
      .from('post_likes')
      .select('created_at')
      .eq('user_id', userId);
    
    if (startDateStr) reactionsGivenQuery = reactionsGivenQuery.gte('created_at', startDateStr);
    if (endDateStr) reactionsGivenQuery = reactionsGivenQuery.lte('created_at', endDateStr);
    
    const { data: reactionsGiven } = await reactionsGivenQuery;
    
    reactionsGiven?.forEach(r => {
      allDates.add(format(new Date(r.created_at), 'yyyy-MM-dd'));
    });

    // Fetch comments given
    let commentsGivenQuery = supabase
      .from('comments')
      .select('created_at')
      .eq('author_id', userId);
    
    if (startDateStr) commentsGivenQuery = commentsGivenQuery.gte('created_at', startDateStr);
    if (endDateStr) commentsGivenQuery = commentsGivenQuery.lte('created_at', endDateStr);
    
    const { data: commentsGiven } = await commentsGivenQuery;
    
    commentsGiven?.forEach(c => {
      allDates.add(format(new Date(c.created_at), 'yyyy-MM-dd'));
    });

    // Fetch shares given
    let sharesGivenQuery = supabase
      .from('posts')
      .select('created_at')
      .eq('author_id', userId)
      .eq('post_type', 'share');
    
    if (startDateStr) sharesGivenQuery = sharesGivenQuery.gte('created_at', startDateStr);
    if (endDateStr) sharesGivenQuery = sharesGivenQuery.lte('created_at', endDateStr);
    
    const { data: sharesGiven } = await sharesGivenQuery;
    
    sharesGiven?.forEach(s => {
      allDates.add(format(new Date(s.created_at), 'yyyy-MM-dd'));
    });

    // Fetch friends added
    let friendsAddedQuery = supabase
      .from('followers')
      .select('created_at')
      .eq('follower_id', userId)
      .eq('status', 'accepted');
    
    if (startDateStr) friendsAddedQuery = friendsAddedQuery.gte('created_at', startDateStr);
    if (endDateStr) friendsAddedQuery = friendsAddedQuery.lte('created_at', endDateStr);
    
    const { data: friendsAdded } = await friendsAddedQuery;
    
    friendsAdded?.forEach(f => {
      allDates.add(format(new Date(f.created_at), 'yyyy-MM-dd'));
    });

    // Now fetch received metrics (excluding self and invalid users)
    let reactionsReceived: { created_at: string }[] = [];
    let commentsReceived: { created_at: string }[] = [];
    let sharesReceived: { created_at: string }[] = [];

    if (userPostIds.length > 0 && validUserIds.length > 0) {
      // Reactions received (exclude self + invalid users)
      let rrQuery = supabase
        .from('post_likes')
        .select('created_at')
        .in('post_id', userPostIds)
        .neq('user_id', userId)
        .in('user_id', validUserIds);
      
      if (startDateStr) rrQuery = rrQuery.gte('created_at', startDateStr);
      if (endDateStr) rrQuery = rrQuery.lte('created_at', endDateStr);
      
      const { data: rr } = await rrQuery;
      reactionsReceived = rr || [];
      
      // Comments received (exclude self + invalid users)
      let crQuery = supabase
        .from('comments')
        .select('created_at')
        .in('post_id', userPostIds)
        .neq('author_id', userId)
        .in('author_id', validUserIds);
      
      if (startDateStr) crQuery = crQuery.gte('created_at', startDateStr);
      if (endDateStr) crQuery = crQuery.lte('created_at', endDateStr);
      
      const { data: cr } = await crQuery;
      commentsReceived = cr || [];
      
      // Shares received (exclude self + invalid users)
      let srQuery = supabase
        .from('post_shares')
        .select('created_at')
        .in('post_id', userPostIds)
        .neq('user_id', userId)
        .in('user_id', validUserIds);
      
      if (startDateStr) srQuery = srQuery.gte('created_at', startDateStr);
      if (endDateStr) srQuery = srQuery.lte('created_at', endDateStr);
      
      const { data: sr } = await srQuery;
      sharesReceived = sr || [];
    }

    reactionsReceived.forEach(r => {
      allDates.add(format(new Date(r.created_at), 'yyyy-MM-dd'));
    });
    commentsReceived.forEach(c => {
      allDates.add(format(new Date(c.created_at), 'yyyy-MM-dd'));
    });
    sharesReceived.forEach(s => {
      allDates.add(format(new Date(s.created_at), 'yyyy-MM-dd'));
    });

    // Calculate stats per date
    const sortedDates = Array.from(allDates).sort();
    
    for (const date of sortedDates) {
      const dailyStat: DailyStats = {
        userId,
        displayName: user.display_name || 'Chưa đặt tên',
        email: user.email || '',
        date,
        postsCreated: userPosts?.filter(p => 
          format(new Date(p.created_at), 'yyyy-MM-dd') === date
        ).length || 0,
        reactionsGiven: reactionsGiven?.filter(r => 
          format(new Date(r.created_at), 'yyyy-MM-dd') === date
        ).length || 0,
        reactionsReceived: reactionsReceived.filter(r => 
          format(new Date(r.created_at), 'yyyy-MM-dd') === date
        ).length || 0,
        commentsGiven: commentsGiven?.filter(c => 
          format(new Date(c.created_at), 'yyyy-MM-dd') === date
        ).length || 0,
        commentsReceived: commentsReceived.filter(c => 
          format(new Date(c.created_at), 'yyyy-MM-dd') === date
        ).length || 0,
        sharesGiven: sharesGiven?.filter(s => 
          format(new Date(s.created_at), 'yyyy-MM-dd') === date
        ).length || 0,
        sharesReceived: sharesReceived.filter(s => 
          format(new Date(s.created_at), 'yyyy-MM-dd') === date
        ).length || 0,
        friendsAdded: friendsAdded?.filter(f => 
          format(new Date(f.created_at), 'yyyy-MM-dd') === date
        ).length || 0,
      };
      
      stats.push(dailyStat);
    }
    
    return stats;
  };

  const handleResetDates = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    
    try {
      // Get all users
      const { data: allUsers, error } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .eq('banned', false)
        .order('display_name');
      
      if (error) throw error;
      if (!allUsers || allUsers.length === 0) {
        toast.error('Không có user nào để export');
        return;
      }

      // Get valid user IDs for filtering received metrics
      const validUserIds = await getValidUserIds();
      
      const allStats: DailyStats[] = [];
      const totalUsers = allUsers.length;
      
      // Process users in batches of 3 for performance
      const batchSize = 3;
      for (let i = 0; i < allUsers.length; i += batchSize) {
        const batch = allUsers.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (user) => {
          setCurrentUser(user.display_name || user.id);
          return fetchUserDailyStats(user, validUserIds, startDate, endDate);
        });
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(stats => allStats.push(...stats));
        
        setProgress(Math.round(((i + batchSize) / totalUsers) * 100));
      }

      if (allStats.length === 0) {
        toast.error('Không có dữ liệu hoạt động nào trong khoảng thời gian đã chọn');
        return;
      }

      // Sort by date desc, then by user name
      allStats.sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return a.displayName.localeCompare(b.displayName);
      });

      // Build date range info for header
      const dateRangeInfo = startDate || endDate 
        ? `# Khoảng thời gian: ${startDate ? format(startDate, 'dd/MM/yyyy') : 'đầu'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'nay'}`
        : '# Khoảng thời gian: Toàn bộ';

      // Generate CSV
      const headers = [
        'User ID',
        'Tên hiển thị',
        'Email',
        'Ngày',
        'Bài đăng',
        'Reac cho',
        'Reac nhận*',
        'Cmt cho',
        'Cmt nhận*',
        'Share cho',
        'Share nhận*',
        'Bạn mới'
      ];

      const csvRows = [
        '# BÁO CÁO THỐNG KÊ CHI TIẾT THEO NGÀY - FUN FARM',
        `# Ngày xuất: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
        dateRangeInfo,
        `# Tổng users: ${totalUsers}`,
        `# Tổng dòng dữ liệu: ${allStats.length}`,
        '',
        '# * = Đã loại trừ: self-interactions, users đã bị xóa, users đã bị ban, users không tồn tại',
        '',
        headers.join(','),
        ...allStats.map(stat => [
          stat.userId,
          `"${stat.displayName.replace(/"/g, '""')}"`,
          `"${stat.email.replace(/"/g, '""')}"`,
          stat.date,
          stat.postsCreated,
          stat.reactionsGiven,
          stat.reactionsReceived,
          stat.commentsGiven,
          stat.commentsReceived,
          stat.sharesGiven,
          stat.sharesReceived,
          stat.friendsAdded
        ].join(','))
      ];

      // Add summary section
      csvRows.push('');
      csvRows.push('# === TỔNG HỢP THEO USER ===');
      
      // Group stats by user
      const userSummary = new Map<string, {
        displayName: string;
        email: string;
        totalPosts: number;
        totalReacGiven: number;
        totalReacReceived: number;
        totalCmtGiven: number;
        totalCmtReceived: number;
        totalShareGiven: number;
        totalShareReceived: number;
        totalFriends: number;
      }>();
      
      allStats.forEach(stat => {
        const existing = userSummary.get(stat.userId) || {
          displayName: stat.displayName,
          email: stat.email,
          totalPosts: 0,
          totalReacGiven: 0,
          totalReacReceived: 0,
          totalCmtGiven: 0,
          totalCmtReceived: 0,
          totalShareGiven: 0,
          totalShareReceived: 0,
          totalFriends: 0
        };
        
        existing.totalPosts += stat.postsCreated;
        existing.totalReacGiven += stat.reactionsGiven;
        existing.totalReacReceived += stat.reactionsReceived;
        existing.totalCmtGiven += stat.commentsGiven;
        existing.totalCmtReceived += stat.commentsReceived;
        existing.totalShareGiven += stat.sharesGiven;
        existing.totalShareReceived += stat.sharesReceived;
        existing.totalFriends += stat.friendsAdded;
        
        userSummary.set(stat.userId, existing);
      });
      
      csvRows.push('User ID,Tên hiển thị,Email,Tổng bài,Tổng Reac cho,Tổng Reac nhận*,Tổng Cmt cho,Tổng Cmt nhận*,Tổng Share cho,Tổng Share nhận*,Tổng bạn mới');
      
      userSummary.forEach((summary, id) => {
        csvRows.push([
          id,
          `"${summary.displayName.replace(/"/g, '""')}"`,
          `"${summary.email.replace(/"/g, '""')}"`,
          summary.totalPosts,
          summary.totalReacGiven,
          summary.totalReacReceived,
          summary.totalCmtGiven,
          summary.totalCmtReceived,
          summary.totalShareGiven,
          summary.totalShareReceived,
          summary.totalFriends
        ].join(','));
      });

      // Download file with date range in filename
      const filenameDatePart = startDate || endDate
        ? `${startDate ? format(startDate, 'yyyyMMdd') : 'start'}-${endDate ? format(endDate, 'yyyyMMdd') : 'now'}`
        : format(new Date(), 'yyyy-MM-dd-HHmm');
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fun-farm-daily-stats-${filenameDatePart}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`✅ Đã xuất ${allStats.length} dòng dữ liệu cho ${totalUsers} users!`);
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error('Lỗi xuất dữ liệu: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
      setProgress(0);
      setCurrentUser('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-green-500" />
          Xuất Thống Kê Chi Tiết Theo Ngày
        </CardTitle>
        <CardDescription>
          Export Excel thống kê hoạt động chi tiết theo ngày cho TẤT CẢ users.
          <br />
          <span className="text-amber-600 font-medium">
            Đã loại trừ: self-interactions, users bị xóa, users bị ban.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Khoảng thời gian:</label>
          <div className="flex flex-wrap gap-3 items-end">
            {/* Start Date Picker */}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Từ ngày</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[160px] justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd/MM/yyyy') : 'Chọn ngày'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date > new Date() || (endDate ? date > endDate : false)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date Picker */}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Đến ngày</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[160px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'dd/MM/yyyy') : 'Chọn ngày'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date > new Date() || (startDate ? date < startDate : false)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Reset Button */}
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetDates}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>
          
          {/* Selected Date Range Info */}
          {(startDate || endDate) && (
            <p className="text-sm text-green-600 font-medium">
              ✅ Đã chọn: {startDate ? format(startDate, 'dd/MM/yyyy') : 'đầu'} - {endDate ? format(endDate, 'dd/MM/yyyy') : 'nay'}
            </p>
          )}
        </div>

        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Đang xử lý: {currentUser}</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang xuất...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Xuất Excel Tất Cả Users
              </>
            )}
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-lg">
          <p className="font-medium text-foreground">Nội dung file xuất:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Thống kê chi tiết theo từng ngày cho mỗi user</li>
            <li>Bài đăng, Reactions (cho/nhận), Comments (cho/nhận), Shares (cho/nhận), Bạn mới</li>
            <li>Bảng tổng hợp theo user ở cuối file</li>
          </ul>
          <p className="mt-2 text-amber-600">
            ⚠️ Lưu ý: Metrics "nhận" đã loại trừ self-interactions và interactions từ users đã bị xóa/ban.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
