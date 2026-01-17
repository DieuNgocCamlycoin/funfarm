import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Search, User, Calendar as CalendarIcon, FileSpreadsheet, Download, X, Coins, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface UserSearchResult {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
}

interface DailyActivityRow {
  date: string;
  // Activity counts
  postsCreated: number;
  reactionsGiven: number;
  reactionsReceived: number;
  commentsGiven: number;
  commentsReceived: number;
  sharesGiven: number;
  sharesReceived: number;
  friendsAdded: number;
  // Rewards (after applying limits)
  postReward: number;
  reactGivenReward: number;
  reactReceivedReward: number;
  cmtGivenReward: number;
  cmtReceivedReward: number;
  shareGivenReward: number;
  shareReceivedReward: number;
  friendReward: number;
  // Daily totals
  dailyTotalBeforeCap: number;
  dailyTotal: number;
}

// Reward rates v3.0
const REWARD_RATES = {
  post: 10000,
  reaction: 1000,
  comment: 2000,
  share: 10000,
  friend: 10000
};

// Daily limits v3.0
const DAILY_LIMITS = {
  post: 10,
  reactionGiven: 50,
  reactionReceived: 50,
  commentGiven: 50,
  commentReceived: 50,
  shareGiven: 5,
  shareReceived: 5,
  friend: 10
};

const DAILY_CAP = 500000;

// Format CLC number
const formatCLC = (amount: number): string => {
  if (amount === 0) return '-';
  return amount.toLocaleString('vi-VN');
};

export function UserDailyActivityStats() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [activityData, setActivityData] = useState<DailyActivityRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTimestamp, setSearchTimestamp] = useState<Date | null>(null);
  
  // Date filter states
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Export all users states
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportCurrentUser, setExportCurrentUser] = useState('');

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

    try {
      // Search by ID (UUID) or by name
      let query = supabase
        .from('profiles')
        .select('id, display_name, avatar_url, email, created_at')
        .eq('banned', false)
        .limit(10);

      // Check if it's a UUID pattern
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

  // Get valid user IDs (not banned, not deleted)
  const getValidUserIds = async (): Promise<Set<string>> => {
    const { data: activeProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('banned', false);
    
    const { data: deletedUsers } = await supabase
      .from('deleted_users')
      .select('user_id');
    
    const deletedUserIds = new Set(deletedUsers?.map(d => d.user_id) || []);
    
    const validIds = new Set(
      activeProfiles
        ?.filter(p => !deletedUserIds.has(p.id))
        .map(p => p.id) || []
    );

    return validIds;
  };

  // Calculate reward with daily limit
  const calculateReward = (count: number, rate: number, limit: number): number => {
    return Math.min(count, limit) * rate;
  };

  // Fetch user stats with optional date filter
  const fetchUserStats = async (
    userId: string, 
    validUserIds: Set<string>,
    filterStartDate?: Date,
    filterEndDate?: Date
  ): Promise<DailyActivityRow[]> => {
    const validUserIdArray = Array.from(validUserIds);
    
    // Build date filter strings
    const startDateStr = filterStartDate ? format(filterStartDate, 'yyyy-MM-dd') : null;
    const endDateStr = filterEndDate ? format(filterEndDate, 'yyyy-MM-dd') + 'T23:59:59' : null;
    
    // Fetch user's posts (không phải share)
    let postsQuery = supabase
      .from('posts')
      .select('id, created_at')
      .eq('author_id', userId)
      .neq('post_type', 'share')
      .order('created_at', { ascending: true });
    
    if (startDateStr) postsQuery = postsQuery.gte('created_at', startDateStr);
    if (endDateStr) postsQuery = postsQuery.lte('created_at', endDateStr);

    const { data: userPosts } = await postsQuery;
    const userPostIds = userPosts?.map(p => p.id) || [];
    
    // Collect all dates
    const allDates = new Set<string>();
    
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

    // Fetch received metrics (excluding self and invalid users)
    let reactionsReceived: { created_at: string }[] = [];
    let commentsReceived: { created_at: string }[] = [];
    let sharesReceived: { created_at: string }[] = [];

    if (userPostIds.length > 0 && validUserIdArray.length > 0) {
      // Reactions received
      let rrQuery = supabase
        .from('post_likes')
        .select('created_at')
        .in('post_id', userPostIds)
        .neq('user_id', userId)
        .in('user_id', validUserIdArray);
      
      if (startDateStr) rrQuery = rrQuery.gte('created_at', startDateStr);
      if (endDateStr) rrQuery = rrQuery.lte('created_at', endDateStr);
      
      const { data: rr } = await rrQuery;
      reactionsReceived = rr || [];
      
      // Comments received
      let crQuery = supabase
        .from('comments')
        .select('created_at')
        .in('post_id', userPostIds)
        .neq('author_id', userId)
        .in('author_id', validUserIdArray);
      
      if (startDateStr) crQuery = crQuery.gte('created_at', startDateStr);
      if (endDateStr) crQuery = crQuery.lte('created_at', endDateStr);
      
      const { data: cr } = await crQuery;
      commentsReceived = cr || [];
      
      // Shares received
      let srQuery = supabase
        .from('post_shares')
        .select('created_at')
        .in('post_id', userPostIds)
        .neq('user_id', userId)
        .in('user_id', validUserIdArray);
      
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
    const sortedDates = Array.from(allDates).sort().reverse(); // Newest first
    
    const stats: DailyActivityRow[] = sortedDates.map(date => {
      // Count activities for this date
      const postsCreated = userPosts?.filter(p => 
        format(new Date(p.created_at), 'yyyy-MM-dd') === date
      ).length || 0;
      const rGiven = reactionsGiven?.filter(r => 
        format(new Date(r.created_at), 'yyyy-MM-dd') === date
      ).length || 0;
      const rReceived = reactionsReceived.filter(r => 
        format(new Date(r.created_at), 'yyyy-MM-dd') === date
      ).length || 0;
      const cGiven = commentsGiven?.filter(c => 
        format(new Date(c.created_at), 'yyyy-MM-dd') === date
      ).length || 0;
      const cReceived = commentsReceived.filter(c => 
        format(new Date(c.created_at), 'yyyy-MM-dd') === date
      ).length || 0;
      const sGiven = sharesGiven?.filter(s => 
        format(new Date(s.created_at), 'yyyy-MM-dd') === date
      ).length || 0;
      const sReceived = sharesReceived.filter(s => 
        format(new Date(s.created_at), 'yyyy-MM-dd') === date
      ).length || 0;
      const fAdded = friendsAdded?.filter(f => 
        format(new Date(f.created_at), 'yyyy-MM-dd') === date
      ).length || 0;

      // Calculate rewards with limits
      const postReward = calculateReward(postsCreated, REWARD_RATES.post, DAILY_LIMITS.post);
      const reactGivenReward = calculateReward(rGiven, REWARD_RATES.reaction, DAILY_LIMITS.reactionGiven);
      const reactReceivedReward = calculateReward(rReceived, REWARD_RATES.reaction, DAILY_LIMITS.reactionReceived);
      const cmtGivenReward = calculateReward(cGiven, REWARD_RATES.comment, DAILY_LIMITS.commentGiven);
      const cmtReceivedReward = calculateReward(cReceived, REWARD_RATES.comment, DAILY_LIMITS.commentReceived);
      const shareGivenReward = calculateReward(sGiven, REWARD_RATES.share, DAILY_LIMITS.shareGiven);
      const shareReceivedReward = calculateReward(sReceived, REWARD_RATES.share, DAILY_LIMITS.shareReceived);
      const friendReward = calculateReward(fAdded, REWARD_RATES.friend, DAILY_LIMITS.friend);

      // Calculate daily total with cap
      const dailyTotalBeforeCap = postReward + reactGivenReward + reactReceivedReward + 
        cmtGivenReward + cmtReceivedReward + shareGivenReward + shareReceivedReward + friendReward;
      const dailyTotal = Math.min(dailyTotalBeforeCap, DAILY_CAP);

      return {
        date,
        postsCreated,
        reactionsGiven: rGiven,
        reactionsReceived: rReceived,
        commentsGiven: cGiven,
        commentsReceived: cReceived,
        sharesGiven: sGiven,
        sharesReceived: sReceived,
        friendsAdded: fAdded,
        postReward,
        reactGivenReward,
        reactReceivedReward,
        cmtGivenReward,
        cmtReceivedReward,
        shareGivenReward,
        shareReceivedReward,
        friendReward,
        dailyTotalBeforeCap,
        dailyTotal
      };
    });

    return stats;
  };

  // Fetch daily stats for selected user
  const handleSelectUser = async (user: UserSearchResult) => {
    setSelectedUser(user);
    setIsLoading(true);
    setSearchTimestamp(new Date());
    setSearchResults([]);

    try {
      const validUserIds = await getValidUserIds();
      const stats = await fetchUserStats(user.id, validUserIds, startDate, endDate);
      setActivityData(stats);
      
      if (stats.length === 0) {
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
    posts: acc.posts + row.postsCreated,
    reactGiven: acc.reactGiven + row.reactionsGiven,
    reactReceived: acc.reactReceived + row.reactionsReceived,
    cmtGiven: acc.cmtGiven + row.commentsGiven,
    cmtReceived: acc.cmtReceived + row.commentsReceived,
    shareGiven: acc.shareGiven + row.sharesGiven,
    shareReceived: acc.shareReceived + row.sharesReceived,
    friends: acc.friends + row.friendsAdded,
    postReward: acc.postReward + row.postReward,
    reactGivenReward: acc.reactGivenReward + row.reactGivenReward,
    reactReceivedReward: acc.reactReceivedReward + row.reactReceivedReward,
    cmtGivenReward: acc.cmtGivenReward + row.cmtGivenReward,
    cmtReceivedReward: acc.cmtReceivedReward + row.cmtReceivedReward,
    shareGivenReward: acc.shareGivenReward + row.shareGivenReward,
    shareReceivedReward: acc.shareReceivedReward + row.shareReceivedReward,
    friendReward: acc.friendReward + row.friendReward,
    grandTotal: acc.grandTotal + row.dailyTotal,
    cappedDays: acc.cappedDays + (row.dailyTotalBeforeCap > DAILY_CAP ? 1 : 0)
  }), { 
    posts: 0, reactGiven: 0, reactReceived: 0, cmtGiven: 0, cmtReceived: 0, 
    shareGiven: 0, shareReceived: 0, friends: 0,
    postReward: 0, reactGivenReward: 0, reactReceivedReward: 0, 
    cmtGivenReward: 0, cmtReceivedReward: 0, shareGivenReward: 0, 
    shareReceivedReward: 0, friendReward: 0, grandTotal: 0, cappedDays: 0
  });

  // Export to CSV for single user
  const handleExportCSV = () => {
    if (!selectedUser || activityData.length === 0) return;

    const dateRangeStr = startDate || endDate 
      ? `${startDate ? format(startDate, 'yyyyMMdd') : 'start'}-${endDate ? format(endDate, 'yyyyMMdd') : 'now'}`
      : 'all';

    const headers = [
      'Ngày', 
      'Bài đăng', 'Thưởng bài đăng',
      'Like cho', 'Thưởng like cho',
      'Like nhận', 'Thưởng like nhận',
      'Cmt cho', 'Thưởng cmt cho',
      'Cmt nhận', 'Thưởng cmt nhận',
      'Share cho', 'Thưởng share cho',
      'Share nhận', 'Thưởng share nhận',
      'Bạn mới', 'Thưởng bạn mới',
      'Tổng thưởng ngày', 'Có bị CAP'
    ];
    
    const rows = [
      `# THỐNG KÊ HOẠT ĐỘNG VÀ THƯỞNG THEO NGÀY - ${selectedUser.display_name || 'Chưa đặt tên'}`,
      `# User ID: ${selectedUser.id}`,
      `# Email: ${selectedUser.email || 'N/A'}`,
      `# Khoảng thời gian: ${startDate ? format(startDate, 'dd/MM/yyyy') : 'đầu'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'nay'}`,
      `# Tính đến: ${searchTimestamp ? format(searchTimestamp, 'HH:mm:ss dd/MM/yyyy', { locale: vi }) : ''}`,
      `# Daily Cap: ${DAILY_CAP.toLocaleString()} CLC`,
      `# Số ngày bị CAP: ${totals.cappedDays}`,
      '',
      headers.join(','),
      ...activityData.map(row => [
        row.date,
        row.postsCreated, row.postReward,
        row.reactionsGiven, row.reactGivenReward,
        row.reactionsReceived, row.reactReceivedReward,
        row.commentsGiven, row.cmtGivenReward,
        row.commentsReceived, row.cmtReceivedReward,
        row.sharesGiven, row.shareGivenReward,
        row.sharesReceived, row.shareReceivedReward,
        row.friendsAdded, row.friendReward,
        row.dailyTotal, row.dailyTotalBeforeCap > DAILY_CAP ? 'YES' : 'NO'
      ].join(','))
    ];

    // Add totals row
    rows.push('');
    rows.push([
      'TỔNG',
      totals.posts, totals.postReward,
      totals.reactGiven, totals.reactGivenReward,
      totals.reactReceived, totals.reactReceivedReward,
      totals.cmtGiven, totals.cmtGivenReward,
      totals.cmtReceived, totals.cmtReceivedReward,
      totals.shareGiven, totals.shareGivenReward,
      totals.shareReceived, totals.shareReceivedReward,
      totals.friends, totals.friendReward,
      totals.grandTotal, ''
    ].join(','));

    const csvContent = rows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user-activity-reward-${selectedUser.id.slice(0, 8)}-${dateRangeStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Đã xuất file CSV!');
  };

  // Export all users
  const handleExportAllUsers = async () => {
    if (!startDate && !endDate) {
      toast.error('Vui lòng chọn ít nhất 1 mốc thời gian (Từ ngày hoặc Đến ngày)');
      return;
    }

    setIsExportingAll(true);
    setExportProgress(0);

    try {
      // Get all active users
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

      // Collect all user summaries
      interface UserSummary {
        userId: string;
        displayName: string;
        email: string;
        posts: number;
        reactGiven: number;
        reactReceived: number;
        cmtGiven: number;
        cmtReceived: number;
        shareGiven: number;
        shareReceived: number;
        friends: number;
        postReward: number;
        reactGivenReward: number;
        reactReceivedReward: number;
        cmtGivenReward: number;
        cmtReceivedReward: number;
        shareGivenReward: number;
        shareReceivedReward: number;
        friendReward: number;
        totalReward: number;
        cappedDays: number;
        activeDays: number;
      }

      const allUsersSummary: UserSummary[] = [];

      // Process users in batches
      const batchSize = 3;
      for (let i = 0; i < allUsers.length; i += batchSize) {
        const batch = allUsers.slice(i, i + batchSize);

        const batchPromises = batch.map(async (user) => {
          setExportCurrentUser(user.display_name || user.id.slice(0, 8));
          const stats = await fetchUserStats(user.id, validUserIds, startDate, endDate);

          // Calculate summary
          const summary = stats.reduce((acc, row) => ({
            posts: acc.posts + row.postsCreated,
            reactGiven: acc.reactGiven + row.reactionsGiven,
            reactReceived: acc.reactReceived + row.reactionsReceived,
            cmtGiven: acc.cmtGiven + row.commentsGiven,
            cmtReceived: acc.cmtReceived + row.commentsReceived,
            shareGiven: acc.shareGiven + row.sharesGiven,
            shareReceived: acc.shareReceived + row.sharesReceived,
            friends: acc.friends + row.friendsAdded,
            postReward: acc.postReward + row.postReward,
            reactGivenReward: acc.reactGivenReward + row.reactGivenReward,
            reactReceivedReward: acc.reactReceivedReward + row.reactReceivedReward,
            cmtGivenReward: acc.cmtGivenReward + row.cmtGivenReward,
            cmtReceivedReward: acc.cmtReceivedReward + row.cmtReceivedReward,
            shareGivenReward: acc.shareGivenReward + row.shareGivenReward,
            shareReceivedReward: acc.shareReceivedReward + row.shareReceivedReward,
            friendReward: acc.friendReward + row.friendReward,
            totalReward: acc.totalReward + row.dailyTotal,
            cappedDays: acc.cappedDays + (row.dailyTotalBeforeCap > DAILY_CAP ? 1 : 0),
            activeDays: acc.activeDays + 1
          }), {
            posts: 0, reactGiven: 0, reactReceived: 0, cmtGiven: 0, cmtReceived: 0,
            shareGiven: 0, shareReceived: 0, friends: 0,
            postReward: 0, reactGivenReward: 0, reactReceivedReward: 0,
            cmtGivenReward: 0, cmtReceivedReward: 0, shareGivenReward: 0,
            shareReceivedReward: 0, friendReward: 0, totalReward: 0, cappedDays: 0, activeDays: 0
          });

          return {
            userId: user.id,
            displayName: user.display_name || 'Chưa đặt tên',
            email: user.email || '',
            ...summary
          } as UserSummary;
        });

        const batchResults = await Promise.all(batchPromises);
        allUsersSummary.push(...batchResults);

        setExportProgress(Math.round(((i + batchSize) / totalUsers) * 100));
      }

      // Filter out users with no activity
      const activeUsersSummary = allUsersSummary.filter(u => u.activeDays > 0);

      if (activeUsersSummary.length === 0) {
        toast.error('Không có user nào có hoạt động trong khoảng thời gian đã chọn');
        return;
      }

      // Sort by total reward descending
      activeUsersSummary.sort((a, b) => b.totalReward - a.totalReward);

      // Generate CSV
      const dateRangeStr = `${startDate ? format(startDate, 'yyyyMMdd') : 'start'}-${endDate ? format(endDate, 'yyyyMMdd') : 'now'}`;

      const headers = [
        'User ID', 'Tên hiển thị', 'Email',
        'Bài đăng', 'Thưởng BD',
        'Like cho', 'Thưởng LC',
        'Like nhận', 'Thưởng LN',
        'Cmt cho', 'Thưởng CC',
        'Cmt nhận', 'Thưởng CN',
        'Share cho', 'Thưởng SC',
        'Share nhận', 'Thưởng SN',
        'Bạn mới', 'Thưởng BM',
        'TỔNG THƯỞNG', 'Số ngày CAP', 'Số ngày HĐ'
      ];

      const csvRows = [
        '# BÁO CÁO TỔNG HỢP THƯỞNG TẤT CẢ USERS - FUN FARM v3.0',
        `# Khoảng thời gian: ${startDate ? format(startDate, 'dd/MM/yyyy') : 'đầu'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'nay'}`,
        `# Ngày xuất: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
        `# Tổng users có hoạt động: ${activeUsersSummary.length}/${totalUsers}`,
        `# Daily Cap: ${DAILY_CAP.toLocaleString()} CLC`,
        '',
        '# * Đã loại trừ: self-interactions, users bị ban, users bị xóa',
        '',
        headers.join(','),
        ...activeUsersSummary.map(u => [
          u.userId,
          `"${u.displayName.replace(/"/g, '""')}"`,
          `"${u.email.replace(/"/g, '""')}"`,
          u.posts, u.postReward,
          u.reactGiven, u.reactGivenReward,
          u.reactReceived, u.reactReceivedReward,
          u.cmtGiven, u.cmtGivenReward,
          u.cmtReceived, u.cmtReceivedReward,
          u.shareGiven, u.shareGivenReward,
          u.shareReceived, u.shareReceivedReward,
          u.friends, u.friendReward,
          u.totalReward, u.cappedDays, u.activeDays
        ].join(','))
      ];

      // Add grand totals
      const grandTotals = activeUsersSummary.reduce((acc, u) => ({
        posts: acc.posts + u.posts,
        postReward: acc.postReward + u.postReward,
        reactGiven: acc.reactGiven + u.reactGiven,
        reactGivenReward: acc.reactGivenReward + u.reactGivenReward,
        reactReceived: acc.reactReceived + u.reactReceived,
        reactReceivedReward: acc.reactReceivedReward + u.reactReceivedReward,
        cmtGiven: acc.cmtGiven + u.cmtGiven,
        cmtGivenReward: acc.cmtGivenReward + u.cmtGivenReward,
        cmtReceived: acc.cmtReceived + u.cmtReceived,
        cmtReceivedReward: acc.cmtReceivedReward + u.cmtReceivedReward,
        shareGiven: acc.shareGiven + u.shareGiven,
        shareGivenReward: acc.shareGivenReward + u.shareGivenReward,
        shareReceived: acc.shareReceived + u.shareReceived,
        shareReceivedReward: acc.shareReceivedReward + u.shareReceivedReward,
        friends: acc.friends + u.friends,
        friendReward: acc.friendReward + u.friendReward,
        totalReward: acc.totalReward + u.totalReward,
        cappedDays: acc.cappedDays + u.cappedDays
      }), {
        posts: 0, postReward: 0, reactGiven: 0, reactGivenReward: 0,
        reactReceived: 0, reactReceivedReward: 0, cmtGiven: 0, cmtGivenReward: 0,
        cmtReceived: 0, cmtReceivedReward: 0, shareGiven: 0, shareGivenReward: 0,
        shareReceived: 0, shareReceivedReward: 0, friends: 0, friendReward: 0,
        totalReward: 0, cappedDays: 0
      });

      csvRows.push('');
      csvRows.push([
        'TỔNG CỘNG', '', '',
        grandTotals.posts, grandTotals.postReward,
        grandTotals.reactGiven, grandTotals.reactGivenReward,
        grandTotals.reactReceived, grandTotals.reactReceivedReward,
        grandTotals.cmtGiven, grandTotals.cmtGivenReward,
        grandTotals.cmtReceived, grandTotals.cmtReceivedReward,
        grandTotals.shareGiven, grandTotals.shareGivenReward,
        grandTotals.shareReceived, grandTotals.shareReceivedReward,
        grandTotals.friends, grandTotals.friendReward,
        grandTotals.totalReward, grandTotals.cappedDays, ''
      ].join(','));

      // Download
      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fun-farm-all-users-reward-${dateRangeStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`✅ Đã xuất báo cáo cho ${activeUsersSummary.length} users!`);
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
    setSearchQuery('');
  };

  const handleResetDates = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-cyan-500" />
          📊 Tra cứu & Báo cáo User
        </CardTitle>
        <CardDescription>
          Tìm kiếm user hoặc xuất báo cáo tất cả users với công thức Reward System v3.0.
          <br />
          <span className="text-amber-600 font-medium">
            Đã loại trừ: self-interactions, users bị ban, users bị xóa.
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

        {/* Search Bar */}
        <div className="flex gap-2">
          <Input
            placeholder="Nhập tên hoặc ID user để tra cứu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Tìm kiếm</span>
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="border rounded-lg p-2 space-y-1 bg-muted/30">
            <p className="text-sm text-muted-foreground px-2">Chọn user để xem thống kê:</p>
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors text-left"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.display_name || 'Chưa đặt tên'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email || user.id}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  Tham gia: {format(new Date(user.created_at), 'dd/MM/yyyy')}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-muted-foreground">Đang tải dữ liệu...</span>
          </div>
        )}

        {/* Stats Table */}
        {selectedUser && !isLoading && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-500" />
                    Bảng thống kê của "{selectedUser.display_name || 'Chưa đặt tên'}"
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    {startDate || endDate ? (
                      <>Từ {startDate ? format(startDate, 'dd/MM/yyyy') : 'đầu'} đến {endDate ? format(endDate, 'dd/MM/yyyy') : 'nay'}</>
                    ) : (
                      <>Tính đến {searchTimestamp && format(searchTimestamp, "HH'h'mm'p'ss's' 'ngày' dd/MM/yyyy", { locale: vi })}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {activityData.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="h-4 w-4 mr-1" />
                    Export CSV
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <X className="h-4 w-4 mr-1" />
                  Đóng
                </Button>
              </div>
            </div>

            {activityData.length > 0 ? (
              <>
                {/* Grand Total Banner */}
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Coins className="h-8 w-8 text-amber-500" />
                    <div>
                      <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">Tổng thưởng tích lũy</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-300">
                        {totals.grandTotal.toLocaleString('vi-VN')} CLC
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Từ {activityData.length} ngày hoạt động</p>
                    <p className="text-xs">
                      {totals.cappedDays > 0 && <span className="text-red-500">{totals.cappedDays} ngày bị CAP • </span>}
                      Daily cap: {DAILY_CAP.toLocaleString()} CLC
                    </p>
                  </div>
                </div>

                {/* Table with sticky header */}
                <div className="relative overflow-hidden rounded-md border">
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-20 bg-background">
                        {/* Header Row */}
                        <TableRow className="bg-slate-100 dark:bg-slate-800">
                          <TableHead className="w-[100px] font-bold">Ngày</TableHead>
                          <TableHead className="text-center font-bold">Bài đăng</TableHead>
                          <TableHead className="text-center font-bold text-blue-500">Like cho</TableHead>
                          <TableHead className="text-center font-bold text-blue-600">Like nhận</TableHead>
                          <TableHead className="text-center font-bold text-green-500">Cmt cho</TableHead>
                          <TableHead className="text-center font-bold text-green-600">Cmt nhận</TableHead>
                          <TableHead className="text-center font-bold text-purple-500">Share cho</TableHead>
                          <TableHead className="text-center font-bold text-purple-600">Share nhận</TableHead>
                          <TableHead className="text-center font-bold text-pink-500">Bạn mới</TableHead>
                          <TableHead className="text-center font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">Tổng thưởng</TableHead>
                        </TableRow>
                        {/* Totals Row (sticky) */}
                        <TableRow className="bg-blue-50 dark:bg-blue-900/30 border-b-2 border-blue-200 dark:border-blue-700">
                          <TableCell className="font-bold text-blue-700 dark:text-blue-300">TỔNG</TableCell>
                          <TableCell className="text-center">
                            <div className="font-bold">{totals.posts}</div>
                            <div className="text-xs text-green-600">{formatCLC(totals.postReward)}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="font-bold">{totals.reactGiven}</div>
                            <div className="text-xs text-green-600">{formatCLC(totals.reactGivenReward)}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="font-bold">{totals.reactReceived}</div>
                            <div className="text-xs text-green-600">{formatCLC(totals.reactReceivedReward)}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="font-bold">{totals.cmtGiven}</div>
                            <div className="text-xs text-green-600">{formatCLC(totals.cmtGivenReward)}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="font-bold">{totals.cmtReceived}</div>
                            <div className="text-xs text-green-600">{formatCLC(totals.cmtReceivedReward)}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="font-bold">{totals.shareGiven}</div>
                            <div className="text-xs text-green-600">{formatCLC(totals.shareGivenReward)}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="font-bold">{totals.shareReceived}</div>
                            <div className="text-xs text-green-600">{formatCLC(totals.shareReceivedReward)}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="font-bold">{totals.friends}</div>
                            <div className="text-xs text-green-600">{formatCLC(totals.friendReward)}</div>
                          </TableCell>
                          <TableCell className="text-center bg-amber-100 dark:bg-amber-900/50">
                            <div className="font-bold text-amber-700 dark:text-amber-300">
                              {formatCLC(totals.grandTotal)} CLC
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activityData.map((row) => (
                          <TableRow key={row.date} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {format(new Date(row.date), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="font-medium">{row.postsCreated || '-'}</div>
                              {row.postReward > 0 && (
                                <div className="text-xs text-green-600">{formatCLC(row.postReward)}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="font-medium">{row.reactionsGiven || '-'}</div>
                              {row.reactGivenReward > 0 && (
                                <div className="text-xs text-green-600">{formatCLC(row.reactGivenReward)}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="font-medium">{row.reactionsReceived || '-'}</div>
                              {row.reactReceivedReward > 0 && (
                                <div className="text-xs text-green-600">{formatCLC(row.reactReceivedReward)}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="font-medium">{row.commentsGiven || '-'}</div>
                              {row.cmtGivenReward > 0 && (
                                <div className="text-xs text-green-600">{formatCLC(row.cmtGivenReward)}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="font-medium">{row.commentsReceived || '-'}</div>
                              {row.cmtReceivedReward > 0 && (
                                <div className="text-xs text-green-600">{formatCLC(row.cmtReceivedReward)}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="font-medium">{row.sharesGiven || '-'}</div>
                              {row.shareGivenReward > 0 && (
                                <div className="text-xs text-green-600">{formatCLC(row.shareGivenReward)}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="font-medium">{row.sharesReceived || '-'}</div>
                              {row.shareReceivedReward > 0 && (
                                <div className="text-xs text-green-600">{formatCLC(row.shareReceivedReward)}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="font-medium">{row.friendsAdded || '-'}</div>
                              {row.friendReward > 0 && (
                                <div className="text-xs text-green-600">{formatCLC(row.friendReward)}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-center bg-amber-50 dark:bg-amber-900/20">
                              <div className="font-bold text-amber-700 dark:text-amber-300">
                                {formatCLC(row.dailyTotal)}
                              </div>
                              {row.dailyTotalBeforeCap > DAILY_CAP && (
                                <Badge variant="destructive" className="text-[10px] px-1 py-0 mt-0.5">
                                  CAP
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Hiển thị {activityData.length} ngày hoạt động • Đã loại trừ self-interactions và users không hợp lệ • Daily cap: {DAILY_CAP.toLocaleString()} CLC
                </p>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>User chưa có hoạt động nào trong khoảng thời gian đã chọn</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
