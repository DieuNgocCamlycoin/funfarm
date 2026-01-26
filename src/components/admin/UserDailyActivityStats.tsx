import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Search, User, Calendar as CalendarIcon, FileSpreadsheet, Download, X, Users, Bug, Copy, RefreshCw, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// === IMPORT FROM SINGLE SOURCE OF TRUTH ===
import {
  calculateUserReward,
  getValidUserIds,
  REWARD_RATES,
  DAILY_LIMITS,
  DAILY_REWARD_CAP,
  DailyRewardStats,
  RewardCalculationResult,
  DebugPostInfo
} from '@/lib/rewardCalculationService';

interface UserSearchResult {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
}

// Mapped type for table display (derived from DailyRewardStats)
interface DailyActivityRow {
  date: string;
  // Posts
  totalPostsCreated: number;
  qualityPostsCreated: number;
  // Reactions (Likes)
  reactionsGiven: number;
  totalReactionsReceived: number;
  reactionsReceived: number;
  // Comments
  commentsGiven: number;
  totalCommentsReceived: number;
  commentsFromQualityPosts: number;
  qualityCommentsReceived: number;
  // Shares
  sharesGiven: number;
  totalSharesReceived: number;
  sharesReceived: number;
  // Friends
  friendsAdded: number;
  // Rewards
  postReward: number;
  reactReceivedReward: number;
  cmtReceivedReward: number;
  shareReceivedReward: number;
  friendReward: number;
  dailyTotalBeforeCap: number;
  dailyTotal: number;
}

// Format CLC number
const formatCLC = (amount: number): string => {
  if (amount === 0) return '-';
  return amount.toLocaleString('vi-VN');
};

// Convert DailyRewardStats from service to DailyActivityRow for display
const mapToActivityRow = (stats: DailyRewardStats): DailyActivityRow => ({
  date: stats.date,
  totalPostsCreated: stats.totalPostsCreated,
  qualityPostsCreated: stats.qualityPosts,
  reactionsGiven: stats.likesGiven,
  totalReactionsReceived: stats.totalLikesReceived,
  reactionsReceived: stats.likesReceived,
  commentsGiven: stats.commentsGiven,
  totalCommentsReceived: stats.totalCommentsReceived,
  commentsFromQualityPosts: stats.commentsFromQualityPosts,
  qualityCommentsReceived: stats.qualityComments,
  sharesGiven: stats.sharesGiven,
  totalSharesReceived: stats.totalSharesReceived,
  sharesReceived: stats.sharesReceived,
  friendsAdded: stats.friendsMade,
  postReward: stats.postReward,
  reactReceivedReward: stats.likeReward,
  cmtReceivedReward: stats.commentReward,
  shareReceivedReward: stats.shareReward,
  friendReward: stats.friendReward,
  dailyTotalBeforeCap: stats.rawReward,
  dailyTotal: stats.cappedReward
});

export function UserDailyActivityStats() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [activityData, setActivityData] = useState<DailyActivityRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTimestamp, setSearchTimestamp] = useState<Date | null>(null);
  
  // Data cutoff state - rounds to nearest 5 minutes for stability
  const [dataCutoffTime, setDataCutoffTime] = useState<Date | null>(null);
  
  // Date filter states
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Export all users states
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportCurrentUser, setExportCurrentUser] = useState('');
  
  // Debug mode states
  const [debugMode, setDebugMode] = useState(false);
  const [debugPosts, setDebugPosts] = useState<DebugPostInfo[]>([]);
  const [debugQueryInfo, setDebugQueryInfo] = useState<{ startUTC: string; endUTC: string } | null>(null);
  const requestIdRef = useRef<number>(0);
  
  // Bonuses state (from service)
  const [userBonuses, setUserBonuses] = useState<{ welcomeBonus: number; walletBonus: number } | null>(null);
  
  // Calculate cutoff timestamp - round down to nearest 5 minutes
  const calculateCutoffTimestamp = (): Date => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.floor(minutes / 5) * 5;
    now.setMinutes(roundedMinutes, 0, 0);
    return now;
  };

  // Search users by name or ID
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Vui lòng nhập tên hoặc ID user');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSelectedUser(null);
    setActivityData([]);
    setUserBonuses(null);

    try {
      let query = supabase
        .from('profiles')
        .select('id, display_name, avatar_url, email, created_at')
        .eq('banned', false)
        .limit(10);

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchQuery.trim());

      if (isUUID) {
        query = query.eq('id', searchQuery.trim());
      } else {
        query = query.ilike('display_name', `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info('Không tìm thấy user nào');
        return;
      }

      setSearchResults(data);
    } catch (err: any) {
      console.error('Search error:', err);
      toast.error('Lỗi tìm kiếm: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch daily stats for selected user - NOW CALLS SERVICE
  const handleSelectUser = async (user: UserSearchResult) => {
    setSelectedUser(user);
    setIsLoading(true);
    setSearchTimestamp(new Date());
    setSearchResults([]);
    setDebugPosts([]);
    setDebugQueryInfo(null);
    setUserBonuses(null);
    
    // Increment request ID to handle race conditions
    const currentRequestId = ++requestIdRef.current;

    try {
      // Get valid user IDs from service
      const validUserIds = await getValidUserIds();
      
      // Calculate 5-minute cutoff for data stability
      const cutoff = calculateCutoffTimestamp();
      const cutoffTimestamp = cutoff.toISOString();
      
      // === CALL SERVICE INSTEAD OF LOCAL fetchUserStats ===
      const result: RewardCalculationResult = await calculateUserReward({
        userId: user.id,
        validUserIds,
        cutoffTimestamp,
        includeDailyBreakdown: true,
        filterStartDate: startDate,
        filterEndDate: endDate,
        includeDebugInfo: debugMode
      });
      
      // Check if this is still the current request (handle race conditions)
      if (currentRequestId !== requestIdRef.current) {
        return;
      }
      
      // Map service result to display rows
      const activityRows = (result.dailyStats || []).map(mapToActivityRow);
      setActivityData(activityRows);
      setDataCutoffTime(cutoff);
      
      // Save bonuses for display
      setUserBonuses({
        welcomeBonus: result.welcomeBonus,
        walletBonus: result.walletBonus
      });
      
      // Handle debug info
      if (debugMode && result.debugPosts) {
        setDebugPosts(result.debugPosts);
        setDebugQueryInfo(result.debugQueryInfo || null);
      }
      
      if (activityRows.length === 0) {
        toast.info('User chưa có hoạt động nào trong khoảng thời gian đã chọn');
      }
    } catch (err: any) {
      console.error('Load stats error:', err);
      toast.error('Lỗi tải dữ liệu: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate totals
  const totals = activityData.reduce((acc, row) => ({
    // Posts
    totalPosts: acc.totalPosts + row.totalPostsCreated,
    qualityPosts: acc.qualityPosts + row.qualityPostsCreated,
    // Reactions
    reactGiven: acc.reactGiven + row.reactionsGiven,
    totalReactReceived: acc.totalReactReceived + row.totalReactionsReceived,
    reactReceived: acc.reactReceived + row.reactionsReceived,
    // Comments
    cmtGiven: acc.cmtGiven + row.commentsGiven,
    totalCmtReceived: acc.totalCmtReceived + row.totalCommentsReceived,
    cmtFromQualityPosts: acc.cmtFromQualityPosts + row.commentsFromQualityPosts,
    qualityCmtReceived: acc.qualityCmtReceived + row.qualityCommentsReceived,
    // Shares
    shareGiven: acc.shareGiven + row.sharesGiven,
    totalShareReceived: acc.totalShareReceived + row.totalSharesReceived,
    shareReceived: acc.shareReceived + row.sharesReceived,
    // Friends
    friends: acc.friends + row.friendsAdded,
    // Rewards
    postReward: acc.postReward + row.postReward,
    reactReceivedReward: acc.reactReceivedReward + row.reactReceivedReward,
    cmtReceivedReward: acc.cmtReceivedReward + row.cmtReceivedReward,
    shareReceivedReward: acc.shareReceivedReward + row.shareReceivedReward,
    friendReward: acc.friendReward + row.friendReward,
    grandTotal: acc.grandTotal + row.dailyTotal,
    cappedDays: acc.cappedDays + (row.dailyTotalBeforeCap > DAILY_REWARD_CAP ? 1 : 0)
  }), { 
    totalPosts: 0, qualityPosts: 0,
    reactGiven: 0, totalReactReceived: 0, reactReceived: 0, 
    cmtGiven: 0, totalCmtReceived: 0, cmtFromQualityPosts: 0, qualityCmtReceived: 0, 
    shareGiven: 0, totalShareReceived: 0, shareReceived: 0, 
    friends: 0,
    postReward: 0, reactReceivedReward: 0, cmtReceivedReward: 0, 
    shareReceivedReward: 0, friendReward: 0, grandTotal: 0, cappedDays: 0
  });

  // Total with bonuses
  const grandTotalWithBonuses = totals.grandTotal + (userBonuses?.welcomeBonus || 0) + (userBonuses?.walletBonus || 0);

  // Export to CSV for single user
  const handleExportCSV = () => {
    if (!selectedUser || activityData.length === 0) return;

    const dateRangeStr = startDate || endDate 
      ? `${startDate ? format(startDate, 'yyyyMMdd') : 'start'}-${endDate ? format(endDate, 'yyyyMMdd') : 'now'}`
      : 'all';

    const headers = [
      'Ngày', 
      'Tổng bài', 'Bài CL', 'Thưởng bài CL',
      'Like cho', 'Tổng Like nhận', 'Like từ bài CL', 'Thưởng LN',
      'Cmt cho', 'Tổng Cmt nhận', 'Cmt từ bài CL', 'Cmt CL nhận', 'Thưởng CmtCL',
      'Share cho', 'Tổng Share nhận', 'Share từ bài CL', 'Thưởng SN',
      'Bạn mới', 'Thưởng BM',
      'Tổng thưởng ngày', 'Có bị CAP'
    ];
    
    const rows = [
      `# THỐNG KÊ HOẠT ĐỘNG VÀ THƯỞNG THEO NGÀY - ${selectedUser.display_name || 'Chưa đặt tên'}`,
      `# User ID: ${selectedUser.id}`,
      `# Email: ${selectedUser.email || 'N/A'}`,
      `# Khoảng thời gian: ${startDate ? format(startDate, 'dd/MM/yyyy') : 'đầu'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'nay'}`,
      `# Tính đến: ${searchTimestamp ? format(searchTimestamp, 'HH:mm:ss dd/MM/yyyy', { locale: vi }) : ''}`,
      `# REWARD SYSTEM v3.1 - Chỉ tính thưởng NHẬN (không tính cho)`,
      `# Daily Cap: ${DAILY_REWARD_CAP.toLocaleString()} CLC`,
      `# Số ngày bị CAP: ${totals.cappedDays}`,
      `# Welcome Bonus: ${userBonuses?.welcomeBonus?.toLocaleString() || '0'} CLC`,
      `# Wallet Bonus: ${userBonuses?.walletBonus?.toLocaleString() || '0'} CLC`,
      '',
      headers.join(','),
      ...activityData.map(row => [
        row.date,
        row.totalPostsCreated, row.qualityPostsCreated, row.postReward,
        row.reactionsGiven, row.totalReactionsReceived, row.reactionsReceived, row.reactReceivedReward,
        row.commentsGiven, row.totalCommentsReceived, row.commentsFromQualityPosts, row.qualityCommentsReceived, row.cmtReceivedReward,
        row.sharesGiven, row.totalSharesReceived, row.sharesReceived, row.shareReceivedReward,
        row.friendsAdded, row.friendReward,
        row.dailyTotal, row.dailyTotalBeforeCap > DAILY_REWARD_CAP ? 'YES' : 'NO'
      ].join(','))
    ];

    // Add totals row
    rows.push('');
    rows.push([
      'TỔNG',
      totals.totalPosts, totals.qualityPosts, totals.postReward,
      totals.reactGiven, totals.totalReactReceived, totals.reactReceived, totals.reactReceivedReward,
      totals.cmtGiven, totals.totalCmtReceived, totals.cmtFromQualityPosts, totals.qualityCmtReceived, totals.cmtReceivedReward,
      totals.shareGiven, totals.totalShareReceived, totals.shareReceived, totals.shareReceivedReward,
      totals.friends, totals.friendReward,
      totals.grandTotal, ''
    ].join(','));
    
    // Add grand total with bonuses
    rows.push('');
    rows.push(`# TỔNG CỘNG (bao gồm Bonus): ${grandTotalWithBonuses.toLocaleString()} CLC`);

    const csvContent = rows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user-activity-reward-v3.1-${selectedUser.id.slice(0, 8)}-${dateRangeStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Đã xuất file CSV!');
  };

  // Export all users - NOW CALLS SERVICE
  const handleExportAllUsers = async () => {
    if (!startDate && !endDate) {
      toast.error('Vui lòng chọn ít nhất 1 mốc thời gian (Từ ngày hoặc Đến ngày)');
      return;
    }

    setIsExportingAll(true);
    setExportProgress(0);

    try {
      const { data: allUsers, error } = await supabase
        .from('profiles')
        .select('id, display_name, email, created_at')
        .eq('banned', false)
        .order('display_name');

      if (error) throw error;
      if (!allUsers || allUsers.length === 0) {
        toast.error('Không có user nào để export');
        return;
      }

      const validUserIds = await getValidUserIds();
      const totalUsers = allUsers.length;

      interface UserSummary {
        userId: string;
        displayName: string;
        email: string;
        qualityPosts: number;
        reactGiven: number;
        reactReceived: number;
        cmtGiven: number;
        qualityCmtReceived: number;
        shareGiven: number;
        shareReceived: number;
        friends: number;
        postReward: number;
        reactReceivedReward: number;
        cmtReceivedReward: number;
        shareReceivedReward: number;
        friendReward: number;
        welcomeBonus: number;
        walletBonus: number;
        totalReward: number;
        cappedDays: number;
        activeDays: number;
      }

      const allUsersSummary: UserSummary[] = [];

      // Calculate shared cutoff timestamp for all users
      const exportCutoff = calculateCutoffTimestamp();
      const exportCutoffTimestamp = exportCutoff.toISOString();

      const batchSize = 3;
      for (let i = 0; i < allUsers.length; i += batchSize) {
        const batch = allUsers.slice(i, i + batchSize);

        const batchPromises = batch.map(async (user) => {
          setExportCurrentUser(user.display_name || user.id.slice(0, 8));
          
          // === CALL SERVICE ===
          const result = await calculateUserReward({
            userId: user.id,
            validUserIds,
            cutoffTimestamp: exportCutoffTimestamp,
            includeDailyBreakdown: true,
            filterStartDate: startDate,
            filterEndDate: endDate
          });

          const dailyStats = result.dailyStats || [];
          const cappedDays = dailyStats.filter(s => s.rawReward > DAILY_REWARD_CAP).length;

          return {
            userId: user.id,
            displayName: user.display_name || 'Chưa đặt tên',
            email: user.email || '',
            qualityPosts: result.qualityPosts,
            reactGiven: result.likesGiven,
            reactReceived: result.likesReceived,
            cmtGiven: result.commentsGiven,
            qualityCmtReceived: result.qualityComments,
            shareGiven: result.sharesGiven,
            shareReceived: result.sharesReceived,
            friends: result.friendships,
            postReward: result.postReward,
            reactReceivedReward: result.likeReward,
            cmtReceivedReward: result.commentReward,
            shareReceivedReward: result.shareReward,
            friendReward: result.friendshipReward,
            welcomeBonus: result.welcomeBonus,
            walletBonus: result.walletBonus,
            totalReward: result.calculatedTotal,
            cappedDays,
            activeDays: dailyStats.length
          };
        });

        const batchResults = await Promise.all(batchPromises);
        allUsersSummary.push(...batchResults);
        
        setExportProgress(Math.round(((i + batch.length) / totalUsers) * 100));
      }

      // Filter users with activity
      const activeUsersSummary = allUsersSummary.filter(u => u.activeDays > 0);

      const dateRangeStr = startDate && endDate
        ? `${format(startDate, 'yyyyMMdd')}-${format(endDate, 'yyyyMMdd')}`
        : startDate
          ? `from-${format(startDate, 'yyyyMMdd')}`
          : `to-${format(endDate!, 'yyyyMMdd')}`;

      const headers = [
        'User ID', 'Tên', 'Email',
        'Bài CL', 'Thưởng BD',
        'Like cho', 'Like nhận (CL)', 'Thưởng LN',
        'Cmt cho', 'Cmt CL nhận', 'Thưởng CmtCL',
        'Share cho', 'Share nhận (CL)', 'Thưởng SN',
        'Bạn mới', 'Thưởng BM',
        'Welcome Bonus', 'Wallet Bonus',
        'Tổng thưởng', 'Ngày CAP', 'Ngày HĐ'
      ];

      const csvRows = [
        `# BÁO CÁO THƯỞNG TẤT CẢ USERS - REWARD SYSTEM v3.1`,
        `# Khoảng thời gian: ${startDate ? format(startDate, 'dd/MM/yyyy') : 'đầu'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'nay'}`,
        `# Tính đến: ${format(exportCutoff, 'HH:mm:ss dd/MM/yyyy', { locale: vi })}`,
        `# Tổng số users có hoạt động: ${activeUsersSummary.length}`,
        `# Daily Cap: ${DAILY_REWARD_CAP.toLocaleString()} CLC`,
        '',
        headers.join(','),
        ...activeUsersSummary.map(u => [
          u.userId,
          `"${u.displayName.replace(/"/g, '""')}"`,
          `"${u.email.replace(/"/g, '""')}"`,
          u.qualityPosts, u.postReward,
          u.reactGiven,
          u.reactReceived, u.reactReceivedReward,
          u.cmtGiven,
          u.qualityCmtReceived, u.cmtReceivedReward,
          u.shareGiven,
          u.shareReceived, u.shareReceivedReward,
          u.friends, u.friendReward,
          u.welcomeBonus, u.walletBonus,
          u.totalReward, u.cappedDays, u.activeDays
        ].join(','))
      ];

      // Add grand totals
      const grandTotals = activeUsersSummary.reduce((acc, u) => ({
        qualityPosts: acc.qualityPosts + u.qualityPosts,
        postReward: acc.postReward + u.postReward,
        reactGiven: acc.reactGiven + u.reactGiven,
        reactReceived: acc.reactReceived + u.reactReceived,
        reactReceivedReward: acc.reactReceivedReward + u.reactReceivedReward,
        cmtGiven: acc.cmtGiven + u.cmtGiven,
        qualityCmtReceived: acc.qualityCmtReceived + u.qualityCmtReceived,
        cmtReceivedReward: acc.cmtReceivedReward + u.cmtReceivedReward,
        shareGiven: acc.shareGiven + u.shareGiven,
        shareReceived: acc.shareReceived + u.shareReceived,
        shareReceivedReward: acc.shareReceivedReward + u.shareReceivedReward,
        friends: acc.friends + u.friends,
        friendReward: acc.friendReward + u.friendReward,
        welcomeBonus: acc.welcomeBonus + u.welcomeBonus,
        walletBonus: acc.walletBonus + u.walletBonus,
        totalReward: acc.totalReward + u.totalReward,
        cappedDays: acc.cappedDays + u.cappedDays
      }), {
        qualityPosts: 0, postReward: 0, reactGiven: 0,
        reactReceived: 0, reactReceivedReward: 0, cmtGiven: 0,
        qualityCmtReceived: 0, cmtReceivedReward: 0, shareGiven: 0,
        shareReceived: 0, shareReceivedReward: 0, friends: 0, friendReward: 0,
        welcomeBonus: 0, walletBonus: 0,
        totalReward: 0, cappedDays: 0
      });

      csvRows.push('');
      csvRows.push([
        'TỔNG CỘNG', '', '',
        grandTotals.qualityPosts, grandTotals.postReward,
        grandTotals.reactGiven,
        grandTotals.reactReceived, grandTotals.reactReceivedReward,
        grandTotals.cmtGiven,
        grandTotals.qualityCmtReceived, grandTotals.cmtReceivedReward,
        grandTotals.shareGiven,
        grandTotals.shareReceived, grandTotals.shareReceivedReward,
        grandTotals.friends, grandTotals.friendReward,
        grandTotals.welcomeBonus, grandTotals.walletBonus,
        grandTotals.totalReward, grandTotals.cappedDays, ''
      ].join(','));

      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fun-farm-all-users-reward-v3.1-${dateRangeStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`✅ Đã xuất báo cáo v3.1 cho ${activeUsersSummary.length} users!`);
    } catch (err: any) {
      console.error('Export all error:', err);
      toast.error('Lỗi xuất dữ liệu: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExportingAll(false);
      setExportProgress(0);
      setExportCurrentUser('');
    }
  };

  const handleClear = () => {
    setSelectedUser(null);
    setActivityData([]);
    setSearchTimestamp(null);
    setDataCutoffTime(null);
    setSearchQuery('');
    setDebugPosts([]);
    setDebugQueryInfo(null);
    setUserBonuses(null);
  };

  const handleResetDates = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };
  
  // Copy debug IDs to clipboard
  const handleCopyDebugIds = (date: string) => {
    const postsForDate = debugPosts.filter(p => p.created_at_vn === date && p.isQualityPost);
    const ids = postsForDate.map(p => `'${p.id}'`).join(',\n');
    navigator.clipboard.writeText(ids);
    toast.success(`Đã copy ${postsForDate.length} Post IDs cho ngày ${date}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-cyan-500" />
          📊 Tra cứu & Báo cáo User
        </CardTitle>
        <CardDescription>
          Tìm kiếm user hoặc xuất báo cáo tất cả users với công thức <strong>Reward System v3.1</strong>.
          <br />
          <span className="text-amber-600 font-medium">
            V3.1: Chỉ tính thưởng NHẬN • Bài CL &gt;100 ký tự + media • Cmt CL &gt;20 ký tự • Bạn bè 2 chiều
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Filter */}
        <div className="flex flex-wrap gap-3 items-end p-3 bg-muted/30 rounded-lg border">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Từ ngày</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[140px] justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'dd/MM/yyyy') : 'Chọn'}
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

          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Đến ngày</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[140px] justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'dd/MM/yyyy') : 'Chọn'}
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

          {(startDate || endDate) && (
            <Button variant="ghost" size="sm" onClick={handleResetDates}>
              <X className="h-4 w-4 mr-1" />
              Xóa filter
            </Button>
          )}

          <div className="flex-1" />
          
          {/* Debug Mode Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="debug-mode"
              checked={debugMode}
              onCheckedChange={setDebugMode}
            />
            <Label htmlFor="debug-mode" className="flex items-center gap-1 text-xs cursor-pointer">
              <Bug className="h-3 w-3" />
              Debug
            </Label>
          </div>

          <Button 
            onClick={handleExportAllUsers} 
            disabled={isExportingAll}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            {isExportingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Users className="h-4 w-4 mr-2" />
            )}
            {isExportingAll ? 'Đang xuất...' : 'Xuất Excel tất cả users'}
          </Button>
        </div>

        {/* Export Progress */}
        {isExportingAll && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Đang xử lý: {exportCurrentUser}
              </span>
              <span className="text-sm text-blue-600 dark:text-blue-400">{exportProgress}%</span>
            </div>
            <Progress value={exportProgress} className="h-2" />
          </div>
        )}

        {/* Search Section */}
        <div className="flex gap-2">
          <Input
            placeholder="Nhập tên hoặc ID user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="border rounded-lg p-2 space-y-1">
            <p className="text-xs text-muted-foreground px-2">Chọn user để xem chi tiết:</p>
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-md transition-colors text-left"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url || ''} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.display_name || 'Chưa đặt tên'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Đang tải dữ liệu...</span>
          </div>
        )}

        {/* Selected User Info */}
        {selectedUser && !isLoading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedUser.avatar_url || ''} />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedUser.display_name || 'Chưa đặt tên'}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  <p className="text-xs text-muted-foreground">ID: {selectedUser.id.slice(0, 8)}...</p>
                  {/* Cutoff Time Display */}
                  {dataCutoffTime && (
                    <p className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      Dữ liệu cập nhật lúc: {format(dataCutoffTime, 'HH:mm:ss', { locale: vi })} 
                      <span className="text-muted-foreground">(mỗi 5 phút)</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {/* Refresh Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleSelectUser(selectedUser)}
                  disabled={isLoading}
                  title="Làm mới dữ liệu"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
                  Làm mới
                </Button>
                {activityData.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="h-4 w-4 mr-1" />
                    Xuất CSV
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Snapshot Indicator Banner */}
            {dataCutoffTime && (
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Dữ liệu snapshot:</span>
                  <span>{format(dataCutoffTime, "HH:mm:ss 'ngày' dd/MM/yyyy", { locale: vi })}</span>
                  <span className="text-amber-600/70 dark:text-amber-400/70 text-xs">(làm tròn 5 phút)</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectedUser && handleSelectUser(selectedUser)}
                  disabled={isLoading}
                  className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/50"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
                  Làm mới
                </Button>
              </div>
            )}

            {/* Summary Stats */}
            {activityData.length > 0 && (
              <div className="space-y-3">
                {/* Bonuses Row */}
                {userBonuses && (userBonuses.welcomeBonus > 0 || userBonuses.walletBonus > 0) && (
                  <div className="flex gap-3 flex-wrap">
                    {userBonuses.welcomeBonus > 0 && (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
                        🎁 Welcome Bonus: {formatCLC(userBonuses.welcomeBonus)} CLC
                      </Badge>
                    )}
                    {userBonuses.walletBonus > 0 && (
                      <Badge variant="outline" className="text-violet-600 border-violet-300 bg-violet-50 dark:bg-violet-950/30">
                        💳 Wallet Bonus: {formatCLC(userBonuses.walletBonus)} CLC
                      </Badge>
                    )}
                  </div>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{totals.totalPosts}</p>
                    <p className="text-xs text-muted-foreground">Tổng bài / <span className="font-semibold">{totals.qualityPosts} CL</span></p>
                  </div>
                  <div className="p-3 bg-pink-50 dark:bg-pink-950/30 rounded-lg text-center">
                    <p className="text-2xl font-bold text-pink-600">{totals.totalReactReceived}</p>
                    <p className="text-xs text-muted-foreground">Like nhận / <span className="font-semibold">{totals.reactReceived} từ bài CL</span></p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{totals.totalCmtReceived}</p>
                    <p className="text-xs text-muted-foreground">Cmt nhận / <span className="font-semibold">{totals.qualityCmtReceived} CL</span></p>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-600">{totals.totalShareReceived}</p>
                    <p className="text-xs text-muted-foreground">Share nhận / <span className="font-semibold">{totals.shareReceived} từ bài CL</span></p>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg text-center">
                    <p className="text-2xl font-bold text-orange-600">{totals.friends}</p>
                    <p className="text-xs text-muted-foreground">Bạn bè (2 chiều)</p>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-center">
                    <p className="text-2xl font-bold text-amber-600">{formatCLC(grandTotalWithBonuses)}</p>
                    <p className="text-xs text-muted-foreground">Tổng CLC (+ Bonus)</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Debug Panel */}
            {debugMode && debugPosts.length > 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    🔍 Debug Mode - Chi tiết Posts
                  </h4>
                  {debugQueryInfo && (
                    <span className="text-xs text-yellow-700 dark:text-yellow-300">
                      Query range: {debugQueryInfo.startUTC} → {debugQueryInfo.endUTC}
                    </span>
                  )}
                </div>
                
                <div className="grid gap-2 text-sm">
                  <div className="flex gap-4">
                    <span>📄 Tổng posts trong range: <strong>{debugPosts.length}</strong></span>
                    <span>✅ Quality posts: <strong>{debugPosts.filter(p => p.isQualityPost).length}</strong></span>
                  </div>
                  
                  {/* Group by date */}
                  {Array.from(new Set(debugPosts.map(p => p.created_at_vn))).sort().reverse().map(date => {
                    const postsForDate = debugPosts.filter(p => p.created_at_vn === date);
                    const qualityPostsForDate = postsForDate.filter(p => p.isQualityPost);
                    
                    return (
                      <div key={date} className="p-2 bg-white dark:bg-muted/30 rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            📅 {date} - {qualityPostsForDate.length} Bài CL / {postsForDate.length} tổng
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyDebugIds(date)}
                            className="h-6 text-xs"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy {qualityPostsForDate.length} IDs
                          </Button>
                        </div>
                        <div className="max-h-32 overflow-auto text-xs space-y-1">
                          {postsForDate.map(p => (
                            <div 
                              key={p.id} 
                              className={cn(
                                "flex gap-2 p-1 rounded",
                                p.isQualityPost 
                                  ? "bg-green-100 dark:bg-green-900/30" 
                                  : "bg-red-100 dark:bg-red-900/30 opacity-60"
                              )}
                            >
                              <span className="font-mono">{p.id.slice(0, 8)}...</span>
                              <span>|</span>
                              <span>type: {p.post_type}</span>
                              <span>|</span>
                              <span>chars: {p.content_length}</span>
                              <span>|</span>
                              <span>img: {p.hasImages ? '✓' : '✗'}</span>
                              <span>|</span>
                              <span>vid: {p.hasVideo ? '✓' : '✗'}</span>
                              <span>|</span>
                              <span className={p.isQualityPost ? 'text-green-700' : 'text-red-700'}>
                                {p.isQualityPost ? '✅ Quality' : '❌ Not quality'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Timestamp and Cap info */}
            {searchTimestamp && activityData.length > 0 && (
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>
                  📅 Dữ liệu tính đến: {format(searchTimestamp, 'HH:mm:ss dd/MM/yyyy', { locale: vi })}
                </span>
                <span>
                  🏆 Daily Cap: {DAILY_REWARD_CAP.toLocaleString()} CLC
                </span>
                {totals.cappedDays > 0 && (
                  <Badge variant="destructive">
                    {totals.cappedDays} ngày bị CAP
                  </Badge>
                )}
              </div>
            )}

            {/* Activity Table */}
            {activityData.length > 0 && (
              <div className="border rounded-lg overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-20 min-w-[100px]">Ngày</TableHead>
                      {/* Posts */}
                      <TableHead className="text-center text-muted-foreground text-xs">Tổng bài</TableHead>
                      <TableHead className="text-center">Bài CL</TableHead>
                      <TableHead className="text-right text-blue-600">Thưởng BD</TableHead>
                      {/* Likes */}
                      <TableHead className="text-center text-muted-foreground text-xs">Like cho</TableHead>
                      <TableHead className="text-center text-muted-foreground text-xs">Tổng Like</TableHead>
                      <TableHead className="text-center">Like bài CL</TableHead>
                      <TableHead className="text-right text-pink-600">Thưởng LN</TableHead>
                      {/* Comments */}
                      <TableHead className="text-center text-muted-foreground text-xs">Cmt cho</TableHead>
                      <TableHead className="text-center text-muted-foreground text-xs">Tổng Cmt</TableHead>
                      <TableHead className="text-center text-muted-foreground text-xs">Cmt bài CL</TableHead>
                      <TableHead className="text-center">CmtCL bài CL</TableHead>
                      <TableHead className="text-right text-green-600">Thưởng CmtCL</TableHead>
                      {/* Shares */}
                      <TableHead className="text-center text-muted-foreground text-xs">Share cho</TableHead>
                      <TableHead className="text-center text-muted-foreground text-xs">Tổng Share</TableHead>
                      <TableHead className="text-center">Share bài CL</TableHead>
                      <TableHead className="text-right text-purple-600">Thưởng SN</TableHead>
                      {/* Friends */}
                      <TableHead className="text-center">Bạn mới</TableHead>
                      <TableHead className="text-right text-orange-600">Thưởng BM</TableHead>
                      {/* Total */}
                      <TableHead className="text-right font-bold">Tổng ngày</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* TỔNG Row - Sticky ngay dưới Header */}
                    <TableRow className="bg-muted/80 font-semibold sticky top-[41px] z-10 border-b-2 border-primary/30 shadow-sm">
                      <TableCell className="sticky left-0 bg-muted/80 z-20 font-bold text-primary">TỔNG</TableCell>
                      {/* Posts */}
                      <TableCell className="text-center text-muted-foreground">{totals.totalPosts}</TableCell>
                      <TableCell className="text-center font-semibold">{totals.qualityPosts}</TableCell>
                      <TableCell className="text-right text-blue-600 font-semibold">{formatCLC(totals.postReward)}</TableCell>
                      {/* Likes */}
                      <TableCell className="text-center text-muted-foreground">{totals.reactGiven}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{totals.totalReactReceived}</TableCell>
                      <TableCell className="text-center font-semibold">{totals.reactReceived}</TableCell>
                      <TableCell className="text-right text-pink-600 font-semibold">{formatCLC(totals.reactReceivedReward)}</TableCell>
                      {/* Comments */}
                      <TableCell className="text-center text-muted-foreground">{totals.cmtGiven}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{totals.totalCmtReceived}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{totals.cmtFromQualityPosts}</TableCell>
                      <TableCell className="text-center font-semibold">{totals.qualityCmtReceived}</TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">{formatCLC(totals.cmtReceivedReward)}</TableCell>
                      {/* Shares */}
                      <TableCell className="text-center text-muted-foreground">{totals.shareGiven}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{totals.totalShareReceived}</TableCell>
                      <TableCell className="text-center font-semibold">{totals.shareReceived}</TableCell>
                      <TableCell className="text-right text-purple-600 font-semibold">{formatCLC(totals.shareReceivedReward)}</TableCell>
                      {/* Friends */}
                      <TableCell className="text-center font-semibold">{totals.friends}</TableCell>
                      <TableCell className="text-right text-orange-600 font-semibold">{formatCLC(totals.friendReward)}</TableCell>
                      {/* Total */}
                      <TableCell className="text-right font-bold text-primary text-base">{formatCLC(totals.grandTotal)}</TableCell>
                    </TableRow>
                    
                    {/* Data Rows */}
                    {activityData.map((row) => (
                      <TableRow key={row.date} className={row.dailyTotalBeforeCap > DAILY_REWARD_CAP ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                        <TableCell className="sticky left-0 bg-background font-medium">
                          {format(new Date(row.date), 'dd/MM/yyyy')}
                          {row.dailyTotalBeforeCap > DAILY_REWARD_CAP && (
                            <Badge variant="outline" className="ml-1 text-xs">CAP</Badge>
                          )}
                        </TableCell>
                        {/* Posts */}
                        <TableCell className="text-center text-muted-foreground">{row.totalPostsCreated || '-'}</TableCell>
                        <TableCell className="text-center">{row.qualityPostsCreated || '-'}</TableCell>
                        <TableCell className="text-right text-blue-600">{formatCLC(row.postReward)}</TableCell>
                        {/* Likes */}
                        <TableCell className="text-center text-muted-foreground">{row.reactionsGiven || '-'}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{row.totalReactionsReceived || '-'}</TableCell>
                        <TableCell className="text-center">{row.reactionsReceived || '-'}</TableCell>
                        <TableCell className="text-right text-pink-600">{formatCLC(row.reactReceivedReward)}</TableCell>
                        {/* Comments */}
                        <TableCell className="text-center text-muted-foreground">{row.commentsGiven || '-'}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{row.totalCommentsReceived || '-'}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{row.commentsFromQualityPosts || '-'}</TableCell>
                        <TableCell className="text-center">{row.qualityCommentsReceived || '-'}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCLC(row.cmtReceivedReward)}</TableCell>
                        {/* Shares */}
                        <TableCell className="text-center text-muted-foreground">{row.sharesGiven || '-'}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{row.totalSharesReceived || '-'}</TableCell>
                        <TableCell className="text-center">{row.sharesReceived || '-'}</TableCell>
                        <TableCell className="text-right text-purple-600">{formatCLC(row.shareReceivedReward)}</TableCell>
                        {/* Friends */}
                        <TableCell className="text-center">{row.friendsAdded || '-'}</TableCell>
                        <TableCell className="text-right text-orange-600">{formatCLC(row.friendReward)}</TableCell>
                        {/* Total */}
                        <TableCell className="text-right font-bold">{formatCLC(row.dailyTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {activityData.length === 0 && !isLoading && (
              <p className="text-center py-8 text-muted-foreground">
                User chưa có hoạt động nào trong khoảng thời gian đã chọn
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
