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
import { 
  QUALITY_POST_REWARD, 
  LIKE_REWARD, 
  QUALITY_COMMENT_REWARD, 
  SHARE_REWARD, 
  FRIENDSHIP_REWARD,
  MAX_POSTS_PER_DAY,
  MAX_INTERACTIONS_PER_DAY,
  MAX_SHARES_PER_DAY,
  MAX_FRIENDSHIPS_PER_DAY,
  DAILY_REWARD_CAP
} from '@/lib/constants';

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
  qualityPostsCreated: number;      // Quality posts only
  reactionsGiven: number;           // Display only, no reward
  reactionsReceived: number;        // From quality posts
  commentsGiven: number;            // Display only, no reward
  qualityCommentsReceived: number;  // >20 chars from quality posts
  sharesGiven: number;              // Display only, no reward
  sharesReceived: number;           // From quality posts
  friendsAdded: number;
  // Rewards (only received, no given rewards in v3.0)
  postReward: number;
  reactReceivedReward: number;
  cmtReceivedReward: number;
  shareReceivedReward: number;
  friendReward: number;
  // Daily totals
  dailyTotalBeforeCap: number;
  dailyTotal: number;
}

// Reward rates v3.0 - Only "received" interactions
const REWARD_RATES = {
  qualityPost: QUALITY_POST_REWARD,      // 10,000 CLC - >100 chars + media
  likeReceived: LIKE_REWARD,             // 1,000 CLC
  qualityCommentReceived: QUALITY_COMMENT_REWARD, // 2,000 CLC - >20 chars
  shareReceived: SHARE_REWARD,           // 10,000 CLC
  friend: FRIENDSHIP_REWARD              // 10,000 CLC
};

// Daily limits v3.0
const DAILY_LIMITS = {
  qualityPost: MAX_POSTS_PER_DAY,           // 10
  interactionsReceived: MAX_INTERACTIONS_PER_DAY, // 50 (likes + comments combined)
  shareReceived: MAX_SHARES_PER_DAY,        // 5
  friend: MAX_FRIENDSHIPS_PER_DAY           // 10
};

const DAILY_CAP = DAILY_REWARD_CAP; // 500,000 CLC

// Format CLC number
const formatCLC = (amount: number): string => {
  if (amount === 0) return '-';
  return amount.toLocaleString('vi-VN');
};

// Check if post is a quality post: >100 chars + has media + original content
const isQualityPost = (post: { content: string | null; images: string[] | null; video_url: string | null; post_type: string }): boolean => {
  const hasContent = (post.content?.length || 0) > 100;
  // Fix: video_url could be empty string '', must check for non-empty
  const hasImages = post.images && Array.isArray(post.images) && post.images.length > 0;
  const hasVideo = post.video_url !== null && post.video_url !== undefined && post.video_url.trim() !== '';
  const hasMedia = hasImages || hasVideo;
  const isOriginalContent = post.post_type === 'post' || post.post_type === 'product';
  return hasContent && hasMedia && isOriginalContent;
};

// Check if comment is quality: >20 chars
const isQualityComment = (comment: { content: string | null }): boolean => {
  return (comment.content?.length || 0) > 20;
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

  // Convert UTC timestamp to Vietnam date string (YYYY-MM-DD)
  const toVietnamDate = (utcTimestamp: string): string => {
    const date = new Date(utcTimestamp);
    const vietnamTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return format(vietnamTime, 'yyyy-MM-dd');
  };

  // Fetch user stats with v3.0 logic
  const fetchUserStats = async (
    userId: string, 
    validUserIds: Set<string>,
    filterStartDate?: Date,
    filterEndDate?: Date
  ): Promise<DailyActivityRow[]> => {
    const validUserIdArray = Array.from(validUserIds);
    
    // Build date filter strings - convert Vietnam date to UTC for database query
    let startDateStr: string | null = null;
    let endDateStr: string | null = null;
    
    if (filterStartDate) {
      const startUTC = new Date(filterStartDate.getTime() - 7 * 60 * 60 * 1000);
      startDateStr = startUTC.toISOString();
    }
    
    if (filterEndDate) {
      const endVN = new Date(filterEndDate);
      endVN.setHours(23, 59, 59, 999);
      const endUTC = new Date(endVN.getTime() - 7 * 60 * 60 * 1000);
      endDateStr = endUTC.toISOString();
    }
    
    // ========================================
    // STEP 1: Fetch ALL posts (with content info for quality check)
    // ========================================
    let allPostsQuery = supabase
      .from('posts')
      .select('id, content, images, video_url, created_at, post_type')
      .eq('author_id', userId)
      .order('created_at', { ascending: true })
      .limit(50000);
    
    if (startDateStr) allPostsQuery = allPostsQuery.gte('created_at', startDateStr);
    if (endDateStr) allPostsQuery = allPostsQuery.lte('created_at', endDateStr);

    const { data: allPosts } = await allPostsQuery;
    
    // Filter quality posts only
    const qualityPosts = (allPosts || []).filter(p => isQualityPost(p));
    const qualityPostIds = qualityPosts.map(p => p.id);
    
    // Collect all dates
    const allDates = new Set<string>();
    
    qualityPosts.forEach(p => {
      allDates.add(toVietnamDate(p.created_at));
    });

    // ========================================
    // STEP 2: Fetch reactions/comments/shares GIVEN (for display only, no reward)
    // ========================================
    let reactionsGivenQuery = supabase
      .from('post_likes')
      .select('created_at')
      .eq('user_id', userId)
      .limit(50000);
    
    if (startDateStr) reactionsGivenQuery = reactionsGivenQuery.gte('created_at', startDateStr);
    if (endDateStr) reactionsGivenQuery = reactionsGivenQuery.lte('created_at', endDateStr);
    
    const { data: reactionsGiven } = await reactionsGivenQuery;
    
    reactionsGiven?.forEach(r => {
      allDates.add(toVietnamDate(r.created_at));
    });

    let commentsGivenQuery = supabase
      .from('comments')
      .select('created_at')
      .eq('author_id', userId)
      .limit(50000);
    
    if (startDateStr) commentsGivenQuery = commentsGivenQuery.gte('created_at', startDateStr);
    if (endDateStr) commentsGivenQuery = commentsGivenQuery.lte('created_at', endDateStr);
    
    const { data: commentsGiven } = await commentsGivenQuery;
    
    commentsGiven?.forEach(c => {
      allDates.add(toVietnamDate(c.created_at));
    });

    let sharesGivenQuery = supabase
      .from('posts')
      .select('created_at')
      .eq('author_id', userId)
      .eq('post_type', 'share')
      .limit(50000);
    
    if (startDateStr) sharesGivenQuery = sharesGivenQuery.gte('created_at', startDateStr);
    if (endDateStr) sharesGivenQuery = sharesGivenQuery.lte('created_at', endDateStr);
    
    const { data: sharesGiven } = await sharesGivenQuery;
    
    sharesGiven?.forEach(s => {
      allDates.add(toVietnamDate(s.created_at));
    });

    // ========================================
    // STEP 3: Fetch friends added
    // ========================================
    let friendsAddedQuery = supabase
      .from('followers')
      .select('created_at')
      .eq('follower_id', userId)
      .eq('status', 'accepted')
      .limit(50000);
    
    if (startDateStr) friendsAddedQuery = friendsAddedQuery.gte('created_at', startDateStr);
    if (endDateStr) friendsAddedQuery = friendsAddedQuery.lte('created_at', endDateStr);
    
    const { data: friendsAdded } = await friendsAddedQuery;
    
    friendsAdded?.forEach(f => {
      allDates.add(toVietnamDate(f.created_at));
    });

    // ========================================
    // STEP 4: Fetch RECEIVED metrics (ONLY from quality posts)
    // ========================================
    let reactionsReceived: { created_at: string }[] = [];
    let qualityCommentsReceived: { created_at: string; content: string | null }[] = [];
    let sharesReceived: { created_at: string }[] = [];

    if (qualityPostIds.length > 0 && validUserIdArray.length > 0) {
      // Reactions received from quality posts
      let rrQuery = supabase
        .from('post_likes')
        .select('created_at')
        .in('post_id', qualityPostIds)
        .neq('user_id', userId)
        .in('user_id', validUserIdArray)
        .limit(50000);
      
      if (startDateStr) rrQuery = rrQuery.gte('created_at', startDateStr);
      if (endDateStr) rrQuery = rrQuery.lte('created_at', endDateStr);
      
      const { data: rr } = await rrQuery;
      reactionsReceived = rr || [];
      
      // Comments received from quality posts - fetch with content for quality check
      let crQuery = supabase
        .from('comments')
        .select('created_at, content')
        .in('post_id', qualityPostIds)
        .neq('author_id', userId)
        .in('author_id', validUserIdArray)
        .limit(50000);
      
      if (startDateStr) crQuery = crQuery.gte('created_at', startDateStr);
      if (endDateStr) crQuery = crQuery.lte('created_at', endDateStr);
      
      const { data: cr } = await crQuery;
      // Filter only quality comments (>20 chars)
      qualityCommentsReceived = (cr || []).filter(c => isQualityComment(c));
      
      // Shares received from quality posts
      let srQuery = supabase
        .from('post_shares')
        .select('created_at')
        .in('post_id', qualityPostIds)
        .neq('user_id', userId)
        .in('user_id', validUserIdArray)
        .limit(50000);
      
      if (startDateStr) srQuery = srQuery.gte('created_at', startDateStr);
      if (endDateStr) srQuery = srQuery.lte('created_at', endDateStr);
      
      const { data: sr } = await srQuery;
      sharesReceived = sr || [];
    }

    reactionsReceived.forEach(r => {
      allDates.add(toVietnamDate(r.created_at));
    });
    qualityCommentsReceived.forEach(c => {
      allDates.add(toVietnamDate(c.created_at));
    });
    sharesReceived.forEach(s => {
      allDates.add(toVietnamDate(s.created_at));
    });

    // ========================================
    // STEP 5: Calculate stats per date with v3.0 rules
    // ========================================
    const sortedDates = Array.from(allDates).sort().reverse();
    
    const stats: DailyActivityRow[] = sortedDates.map(date => {
      // Count activities for this date
      const qPosts = qualityPosts.filter(p => toVietnamDate(p.created_at) === date).length;
      const rGiven = reactionsGiven?.filter(r => toVietnamDate(r.created_at) === date).length || 0;
      const rReceived = reactionsReceived.filter(r => toVietnamDate(r.created_at) === date).length;
      const cGiven = commentsGiven?.filter(c => toVietnamDate(c.created_at) === date).length || 0;
      const qcReceived = qualityCommentsReceived.filter(c => toVietnamDate(c.created_at) === date).length;
      const sGiven = sharesGiven?.filter(s => toVietnamDate(s.created_at) === date).length || 0;
      const sReceived = sharesReceived.filter(s => toVietnamDate(s.created_at) === date).length;
      const fAdded = friendsAdded?.filter(f => toVietnamDate(f.created_at) === date).length || 0;

      // ========================================
      // V3.0 REWARD CALCULATION
      // ========================================
      
      // Quality Post reward: 10,000 * min(count, 10)
      const postReward = Math.min(qPosts, DAILY_LIMITS.qualityPost) * REWARD_RATES.qualityPost;
      
      // Interactions received: Likes + Quality Comments share limit of 50
      const totalInteractionsReceived = rReceived + qcReceived;
      const cappedInteractions = Math.min(totalInteractionsReceived, DAILY_LIMITS.interactionsReceived);
      
      // Distribute capped interactions proportionally to likes and comments
      let reactReceivedReward = 0;
      let cmtReceivedReward = 0;
      
      if (totalInteractionsReceived > 0) {
        const likeRatio = rReceived / totalInteractionsReceived;
        const commentRatio = qcReceived / totalInteractionsReceived;
        
        const cappedLikes = Math.floor(cappedInteractions * likeRatio);
        const cappedComments = Math.ceil(cappedInteractions * commentRatio);
        
        reactReceivedReward = cappedLikes * REWARD_RATES.likeReceived;
        cmtReceivedReward = cappedComments * REWARD_RATES.qualityCommentReceived;
      }
      
      // Share received reward: 10,000 * min(count, 5)
      const shareReceivedReward = Math.min(sReceived, DAILY_LIMITS.shareReceived) * REWARD_RATES.shareReceived;
      
      // Friend reward: 10,000 * min(count, 10)
      const friendReward = Math.min(fAdded, DAILY_LIMITS.friend) * REWARD_RATES.friend;

      // Daily total with cap
      const dailyTotalBeforeCap = postReward + reactReceivedReward + cmtReceivedReward + shareReceivedReward + friendReward;
      const dailyTotal = Math.min(dailyTotalBeforeCap, DAILY_CAP);

      return {
        date,
        qualityPostsCreated: qPosts,
        reactionsGiven: rGiven,
        reactionsReceived: rReceived,
        commentsGiven: cGiven,
        qualityCommentsReceived: qcReceived,
        sharesGiven: sGiven,
        sharesReceived: sReceived,
        friendsAdded: fAdded,
        postReward,
        reactReceivedReward,
        cmtReceivedReward,
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
    posts: acc.posts + row.qualityPostsCreated,
    reactGiven: acc.reactGiven + row.reactionsGiven,
    reactReceived: acc.reactReceived + row.reactionsReceived,
    cmtGiven: acc.cmtGiven + row.commentsGiven,
    cmtReceived: acc.cmtReceived + row.qualityCommentsReceived,
    shareGiven: acc.shareGiven + row.sharesGiven,
    shareReceived: acc.shareReceived + row.sharesReceived,
    friends: acc.friends + row.friendsAdded,
    postReward: acc.postReward + row.postReward,
    reactReceivedReward: acc.reactReceivedReward + row.reactReceivedReward,
    cmtReceivedReward: acc.cmtReceivedReward + row.cmtReceivedReward,
    shareReceivedReward: acc.shareReceivedReward + row.shareReceivedReward,
    friendReward: acc.friendReward + row.friendReward,
    grandTotal: acc.grandTotal + row.dailyTotal,
    cappedDays: acc.cappedDays + (row.dailyTotalBeforeCap > DAILY_CAP ? 1 : 0)
  }), { 
    posts: 0, reactGiven: 0, reactReceived: 0, cmtGiven: 0, cmtReceived: 0, 
    shareGiven: 0, shareReceived: 0, friends: 0,
    postReward: 0, reactReceivedReward: 0, cmtReceivedReward: 0, 
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
      'Bài CL', 'Thưởng bài CL',
      'Like cho', // No reward
      'Like nhận', 'Thưởng like nhận',
      'Cmt cho', // No reward
      'Cmt CL nhận', 'Thưởng cmt CL nhận',
      'Share cho', // No reward
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
      `# REWARD SYSTEM v3.0 - Chỉ tính thưởng NHẬN (không tính cho)`,
      `# Daily Cap: ${DAILY_CAP.toLocaleString()} CLC`,
      `# Số ngày bị CAP: ${totals.cappedDays}`,
      '',
      headers.join(','),
      ...activityData.map(row => [
        row.date,
        row.qualityPostsCreated, row.postReward,
        row.reactionsGiven, // No reward column
        row.reactionsReceived, row.reactReceivedReward,
        row.commentsGiven, // No reward column
        row.qualityCommentsReceived, row.cmtReceivedReward,
        row.sharesGiven, // No reward column
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
      totals.reactGiven,
      totals.reactReceived, totals.reactReceivedReward,
      totals.cmtGiven,
      totals.cmtReceived, totals.cmtReceivedReward,
      totals.shareGiven,
      totals.shareReceived, totals.shareReceivedReward,
      totals.friends, totals.friendReward,
      totals.grandTotal, ''
    ].join(','));

    const csvContent = rows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user-activity-reward-v3-${selectedUser.id.slice(0, 8)}-${dateRangeStr}.csv`;
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
        totalReward: number;
        cappedDays: number;
        activeDays: number;
      }

      const allUsersSummary: UserSummary[] = [];

      const batchSize = 3;
      for (let i = 0; i < allUsers.length; i += batchSize) {
        const batch = allUsers.slice(i, i + batchSize);

        const batchPromises = batch.map(async (user) => {
          setExportCurrentUser(user.display_name || user.id.slice(0, 8));
          const stats = await fetchUserStats(user.id, validUserIds, startDate, endDate);

          const summary = stats.reduce((acc, row) => ({
            qualityPosts: acc.qualityPosts + row.qualityPostsCreated,
            reactGiven: acc.reactGiven + row.reactionsGiven,
            reactReceived: acc.reactReceived + row.reactionsReceived,
            cmtGiven: acc.cmtGiven + row.commentsGiven,
            qualityCmtReceived: acc.qualityCmtReceived + row.qualityCommentsReceived,
            shareGiven: acc.shareGiven + row.sharesGiven,
            shareReceived: acc.shareReceived + row.sharesReceived,
            friends: acc.friends + row.friendsAdded,
            postReward: acc.postReward + row.postReward,
            reactReceivedReward: acc.reactReceivedReward + row.reactReceivedReward,
            cmtReceivedReward: acc.cmtReceivedReward + row.cmtReceivedReward,
            shareReceivedReward: acc.shareReceivedReward + row.shareReceivedReward,
            friendReward: acc.friendReward + row.friendReward,
            totalReward: acc.totalReward + row.dailyTotal,
            cappedDays: acc.cappedDays + (row.dailyTotalBeforeCap > DAILY_CAP ? 1 : 0),
            activeDays: acc.activeDays + 1
          }), {
            qualityPosts: 0, reactGiven: 0, reactReceived: 0, cmtGiven: 0, qualityCmtReceived: 0,
            shareGiven: 0, shareReceived: 0, friends: 0,
            postReward: 0, reactReceivedReward: 0, cmtReceivedReward: 0,
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

      const activeUsersSummary = allUsersSummary.filter(u => u.activeDays > 0);

      if (activeUsersSummary.length === 0) {
        toast.error('Không có user nào có hoạt động trong khoảng thời gian đã chọn');
        return;
      }

      activeUsersSummary.sort((a, b) => b.totalReward - a.totalReward);

      const dateRangeStr = `${startDate ? format(startDate, 'yyyyMMdd') : 'start'}-${endDate ? format(endDate, 'yyyyMMdd') : 'now'}`;

      const headers = [
        'User ID', 'Tên hiển thị', 'Email',
        'Bài CL', 'Thưởng bài CL',
        'Like cho', // No reward
        'Like nhận', 'Thưởng LN',
        'Cmt cho', // No reward
        'Cmt CL nhận', 'Thưởng CmtCL',
        'Share cho', // No reward
        'Share nhận', 'Thưởng SN',
        'Bạn mới', 'Thưởng BM',
        'TỔNG THƯỞNG', 'Số ngày CAP', 'Số ngày HĐ'
      ];

      const csvRows = [
        '# BÁO CÁO TỔNG HỢP THƯỞNG TẤT CẢ USERS - FUN FARM REWARD SYSTEM v3.0',
        `# Khoảng thời gian: ${startDate ? format(startDate, 'dd/MM/yyyy') : 'đầu'} - ${endDate ? format(endDate, 'dd/MM/yyyy') : 'nay'}`,
        `# Ngày xuất: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
        `# Tổng users có hoạt động: ${activeUsersSummary.length}/${totalUsers}`,
        `# Daily Cap: ${DAILY_CAP.toLocaleString()} CLC`,
        '',
        '# * V3.0: Chỉ tính thưởng NHẬN (không tính cho)',
        '# * Bài CL = Bài chất lượng (>100 ký tự + media)',
        '# * Cmt CL = Comment chất lượng (>20 ký tự)',
        '# * Đã loại trừ: self-interactions, users bị ban, users bị xóa',
        '',
        headers.join(','),
        ...activeUsersSummary.map(u => [
          u.userId,
          `"${u.displayName.replace(/"/g, '""')}"`,
          `"${u.email.replace(/"/g, '""')}"`,
          u.qualityPosts, u.postReward,
          u.reactGiven, // No reward
          u.reactReceived, u.reactReceivedReward,
          u.cmtGiven, // No reward
          u.qualityCmtReceived, u.cmtReceivedReward,
          u.shareGiven, // No reward
          u.shareReceived, u.shareReceivedReward,
          u.friends, u.friendReward,
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
        totalReward: acc.totalReward + u.totalReward,
        cappedDays: acc.cappedDays + u.cappedDays
      }), {
        qualityPosts: 0, postReward: 0, reactGiven: 0,
        reactReceived: 0, reactReceivedReward: 0, cmtGiven: 0,
        qualityCmtReceived: 0, cmtReceivedReward: 0, shareGiven: 0,
        shareReceived: 0, shareReceivedReward: 0, friends: 0, friendReward: 0,
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
        grandTotals.totalReward, grandTotals.cappedDays, ''
      ].join(','));

      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fun-farm-all-users-reward-v3-${dateRangeStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`✅ Đã xuất báo cáo v3.0 cho ${activeUsersSummary.length} users!`);
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
          Tìm kiếm user hoặc xuất báo cáo tất cả users với công thức <strong>Reward System v3.0</strong>.
          <br />
          <span className="text-amber-600 font-medium">
            V3.0: Chỉ tính thưởng NHẬN • Bài CL &gt;100 ký tự + media • Cmt CL &gt;20 ký tự
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
                </div>
              </div>
              <div className="flex gap-2">
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

            {/* Summary Stats */}
            {activityData.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{totals.posts}</p>
                  <p className="text-xs text-muted-foreground">Bài CL</p>
                </div>
                <div className="p-3 bg-pink-50 dark:bg-pink-950/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-pink-600">{totals.reactReceived}</p>
                  <p className="text-xs text-muted-foreground">Like nhận</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{totals.cmtReceived}</p>
                  <p className="text-xs text-muted-foreground">Cmt CL nhận</p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-amber-600">{formatCLC(totals.grandTotal)}</p>
                  <p className="text-xs text-muted-foreground">Tổng CLC</p>
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
                  🏆 Daily Cap: {DAILY_CAP.toLocaleString()} CLC
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
                      <TableHead className="text-center">Bài CL</TableHead>
                      <TableHead className="text-right text-blue-600">Thưởng BD</TableHead>
                      <TableHead className="text-center text-muted-foreground">Like cho</TableHead>
                      <TableHead className="text-center">Like nhận</TableHead>
                      <TableHead className="text-right text-pink-600">Thưởng LN</TableHead>
                      <TableHead className="text-center text-muted-foreground">Cmt cho</TableHead>
                      <TableHead className="text-center">Cmt CL nhận</TableHead>
                      <TableHead className="text-right text-green-600">Thưởng CmtCL</TableHead>
                      <TableHead className="text-center text-muted-foreground">Share cho</TableHead>
                      <TableHead className="text-center">Share nhận</TableHead>
                      <TableHead className="text-right text-purple-600">Thưởng SN</TableHead>
                      <TableHead className="text-center">Bạn mới</TableHead>
                      <TableHead className="text-right text-orange-600">Thưởng BM</TableHead>
                      <TableHead className="text-right font-bold">Tổng ngày</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityData.map((row) => (
                      <TableRow key={row.date} className={row.dailyTotalBeforeCap > DAILY_CAP ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                        <TableCell className="sticky left-0 bg-background font-medium">
                          {format(new Date(row.date), 'dd/MM/yyyy')}
                          {row.dailyTotalBeforeCap > DAILY_CAP && (
                            <Badge variant="outline" className="ml-1 text-xs">CAP</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{row.qualityPostsCreated || '-'}</TableCell>
                        <TableCell className="text-right text-blue-600">{formatCLC(row.postReward)}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{row.reactionsGiven || '-'}</TableCell>
                        <TableCell className="text-center">{row.reactionsReceived || '-'}</TableCell>
                        <TableCell className="text-right text-pink-600">{formatCLC(row.reactReceivedReward)}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{row.commentsGiven || '-'}</TableCell>
                        <TableCell className="text-center">{row.qualityCommentsReceived || '-'}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCLC(row.cmtReceivedReward)}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{row.sharesGiven || '-'}</TableCell>
                        <TableCell className="text-center">{row.sharesReceived || '-'}</TableCell>
                        <TableCell className="text-right text-purple-600">{formatCLC(row.shareReceivedReward)}</TableCell>
                        <TableCell className="text-center">{row.friendsAdded || '-'}</TableCell>
                        <TableCell className="text-right text-orange-600">{formatCLC(row.friendReward)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCLC(row.dailyTotal)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-muted/50 font-semibold sticky bottom-0">
                      <TableCell className="sticky left-0 bg-muted/50">TỔNG</TableCell>
                      <TableCell className="text-center">{totals.posts}</TableCell>
                      <TableCell className="text-right text-blue-600">{formatCLC(totals.postReward)}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{totals.reactGiven}</TableCell>
                      <TableCell className="text-center">{totals.reactReceived}</TableCell>
                      <TableCell className="text-right text-pink-600">{formatCLC(totals.reactReceivedReward)}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{totals.cmtGiven}</TableCell>
                      <TableCell className="text-center">{totals.cmtReceived}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCLC(totals.cmtReceivedReward)}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{totals.shareGiven}</TableCell>
                      <TableCell className="text-center">{totals.shareReceived}</TableCell>
                      <TableCell className="text-right text-purple-600">{formatCLC(totals.shareReceivedReward)}</TableCell>
                      <TableCell className="text-center">{totals.friends}</TableCell>
                      <TableCell className="text-right text-orange-600">{formatCLC(totals.friendReward)}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCLC(totals.grandTotal)}</TableCell>
                    </TableRow>
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
