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
import { Loader2, Search, User, Calendar as CalendarIcon, FileSpreadsheet, Download, X, Users, Bug, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  // Activity counts - Posts
  totalPostsCreated: number;        // NEW: All posts (any type)
  qualityPostsCreated: number;      // Quality posts only
  
  // Activity counts - Reactions (Likes)
  reactionsGiven: number;           // Display only, no reward
  totalReactionsReceived: number;   // NEW: All likes received (from any post)
  reactionsReceived: number;        // From quality posts only
  
  // Activity counts - Comments  
  commentsGiven: number;            // Display only, no reward
  totalCommentsReceived: number;    // NEW: All comments received
  commentsFromQualityPosts: number; // NEW: Comments from quality posts (any length)
  qualityCommentsReceived: number;  // >20 chars from quality posts
  
  // Activity counts - Shares
  sharesGiven: number;              // Display only, no reward
  totalSharesReceived: number;      // NEW: All shares received
  sharesReceived: number;           // From quality posts
  
  // Activity counts - Friends
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

// Debug info for a single post
interface DebugPostInfo {
  id: string;
  created_at_raw: string;
  created_at_vn: string;
  post_type: string;
  content_length: number;
  hasImages: boolean;
  hasVideo: boolean;
  isQualityPost: boolean;
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

// Helper to check if images array has valid images
const hasValidImages = (images: string[] | null): boolean => {
  return images != null && Array.isArray(images) && 
    images.some(url => typeof url === 'string' && url.trim() !== '');
};

// Helper to check if video_url is valid
const hasValidVideo = (video_url: string | null): boolean => {
  return typeof video_url === 'string' && video_url.trim() !== '';
};

// Check if post is a quality post: >100 chars + has media + original content
const isQualityPost = (post: { content: string | null; images: string[] | null; video_url: string | null; post_type: string }): boolean => {
  const hasContent = (post.content?.length || 0) > 100;
  const hasImages = hasValidImages(post.images);
  const hasVideo = hasValidVideo(post.video_url);
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
  
  // Debug mode states
  const [debugMode, setDebugMode] = useState(false);
  const [debugDate, setDebugDate] = useState<string>('');
  const [debugPosts, setDebugPosts] = useState<DebugPostInfo[]>([]);
  const [debugQueryInfo, setDebugQueryInfo] = useState<{ startUTC: string; endUTC: string } | null>(null);
  const requestIdRef = useRef<number>(0);

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
  // CRITICAL: Must not use date-fns/format() as it applies browser timezone
  // Instead, manually extract UTC components after adding 7 hours
  const toVietnamDate = (utcTimestamp: string): string => {
    const date = new Date(utcTimestamp);
    // Add 7 hours to convert UTC to Vietnam time (UTC+7)
    const vnMs = date.getTime() + 7 * 60 * 60 * 1000;
    const vnDate = new Date(vnMs);
    // Use UTC getters to avoid browser timezone interference
    const year = vnDate.getUTCFullYear();
    const month = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(vnDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Convert Vietnam date (YYYY-MM-DD) to UTC range for database query
  // Vietnam day starts at 00:00 VN = 17:00 previous day UTC
  // Vietnam day ends at 23:59:59 VN = 16:59:59 same day UTC
  const vietnamDateToUTCRange = (vnDateStr: string, isStart: boolean): string => {
    // Parse the date string as YYYY-MM-DD
    const [year, month, day] = vnDateStr.split('-').map(Number);
    
    if (isStart) {
      // Start of Vietnam day (00:00:00 VN) = previous day 17:00:00 UTC
      const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      // Subtract 7 hours to get UTC equivalent
      return new Date(utcDate.getTime() - 7 * 60 * 60 * 1000).toISOString();
    } else {
      // End of Vietnam day (23:59:59.999 VN) = same day 16:59:59.999 UTC
      const utcDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      // Subtract 7 hours to get UTC equivalent
      return new Date(utcDate.getTime() - 7 * 60 * 60 * 1000).toISOString();
    }
  };

  // Fetch user stats with v3.0 logic
  const fetchUserStats = async (
    userId: string, 
    validUserIds: Set<string>,
    filterStartDate?: Date,
    filterEndDate?: Date,
    collectDebugInfo?: boolean
  ): Promise<{ stats: DailyActivityRow[]; debugPosts?: DebugPostInfo[]; queryInfo?: { startUTC: string; endUTC: string } }> => {
    const validUserIdArray = Array.from(validUserIds);
    
    // Build date filter strings - convert Vietnam date to UTC for database query
    // IMPORTANT: Calendar gives us Date object in local timezone
    // We need to extract the DATE PART only and treat it as Vietnam date
    let startDateStr: string | null = null;
    let endDateStr: string | null = null;
    
    if (filterStartDate) {
      // Extract year/month/day from the Date object (these represent Vietnam date selection)
      const vnDateStr = format(filterStartDate, 'yyyy-MM-dd');
      startDateStr = vietnamDateToUTCRange(vnDateStr, true);
    }
    
    if (filterEndDate) {
      // Extract year/month/day from the Date object (these represent Vietnam date selection)
      const vnDateStr = format(filterEndDate, 'yyyy-MM-dd');
      endDateStr = vietnamDateToUTCRange(vnDateStr, false);
    }
    
    const debugQueryInfo = startDateStr || endDateStr ? { startUTC: startDateStr || 'N/A', endUTC: endDateStr || 'N/A' } : undefined;
    
    // ========================================
    // STEP 1: Fetch ALL user's posts (NO date filter - we need all post IDs for received metrics)
    // ========================================
    const { data: allUserPosts } = await supabase
      .from('posts')
      .select('id, content, images, video_url, created_at, post_type')
      .eq('author_id', userId)
      .order('created_at', { ascending: true })
      .limit(50000);
    
    // All posts IDs (for querying received interactions on ALL posts)
    const allPostIds = (allUserPosts || []).map(p => p.id);
    
    // Filter quality posts only (from all user's posts)
    const allQualityPosts = (allUserPosts || []).filter(p => isQualityPost(p));
    const qualityPostIds = allQualityPosts.map(p => p.id);
    
    // Helper to check if timestamp is within date range
    const isInDateRange = (created_at: string): boolean => {
      if (!startDateStr && !endDateStr) return true;
      if (startDateStr && created_at < startDateStr) return false;
      if (endDateStr && created_at > endDateStr) return false;
      return true;
    };
    
    // Posts WITHIN the date range (for "Tổng bài" and "Bài CL" columns)
    const postsInDateRange = (allUserPosts || []).filter(p => isInDateRange(p.created_at));
    const qualityPostsInDateRange = postsInDateRange.filter(p => isQualityPost(p));
    
    // Collect all dates from posts in date range
    const allDates = new Set<string>();
    
    postsInDateRange.forEach(p => {
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
    // STEP 4: Fetch RECEIVED metrics
    // ========================================
    // NEW: Total received (from ALL posts)
    let totalReactionsReceived: { created_at: string }[] = [];
    let totalCommentsReceived: { created_at: string; content: string | null }[] = [];
    let totalSharesReceived: { created_at: string }[] = [];
    
    // Existing: From quality posts only
    let reactionsReceived: { created_at: string }[] = [];
    let commentsFromQualityPosts: { created_at: string; content: string | null }[] = [];
    let qualityCommentsReceived: { created_at: string; content: string | null }[] = [];
    let sharesReceived: { created_at: string }[] = [];

    // Fetch TOTAL received (from ALL posts)
    if (allPostIds.length > 0 && validUserIdArray.length > 0) {
      // Total reactions received from all posts
      let totalRrQuery = supabase
        .from('post_likes')
        .select('created_at')
        .in('post_id', allPostIds)
        .neq('user_id', userId)
        .in('user_id', validUserIdArray)
        .limit(50000);
      
      if (startDateStr) totalRrQuery = totalRrQuery.gte('created_at', startDateStr);
      if (endDateStr) totalRrQuery = totalRrQuery.lte('created_at', endDateStr);
      
      const { data: totalRr } = await totalRrQuery;
      totalReactionsReceived = totalRr || [];
      
      // Total comments received from all posts
      let totalCrQuery = supabase
        .from('comments')
        .select('created_at, content')
        .in('post_id', allPostIds)
        .neq('author_id', userId)
        .in('author_id', validUserIdArray)
        .limit(50000);
      
      if (startDateStr) totalCrQuery = totalCrQuery.gte('created_at', startDateStr);
      if (endDateStr) totalCrQuery = totalCrQuery.lte('created_at', endDateStr);
      
      const { data: totalCr } = await totalCrQuery;
      totalCommentsReceived = totalCr || [];
      
      // Total shares received from all posts
      let totalSrQuery = supabase
        .from('post_shares')
        .select('created_at')
        .in('post_id', allPostIds)
        .neq('user_id', userId)
        .in('user_id', validUserIdArray)
        .limit(50000);
      
      if (startDateStr) totalSrQuery = totalSrQuery.gte('created_at', startDateStr);
      if (endDateStr) totalSrQuery = totalSrQuery.lte('created_at', endDateStr);
      
      const { data: totalSr } = await totalSrQuery;
      totalSharesReceived = totalSr || [];
    }

    // Fetch from QUALITY posts only
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
      commentsFromQualityPosts = cr || [];
      // Filter only quality comments (>20 chars)
      qualityCommentsReceived = commentsFromQualityPosts.filter(c => isQualityComment(c));
      
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

    // Add all dates from received metrics
    totalReactionsReceived.forEach(r => {
      allDates.add(toVietnamDate(r.created_at));
    });
    totalCommentsReceived.forEach(c => {
      allDates.add(toVietnamDate(c.created_at));
    });
    totalSharesReceived.forEach(s => {
      allDates.add(toVietnamDate(s.created_at));
    });
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
      // Posts
      const totalPosts = postsInDateRange.filter(p => toVietnamDate(p.created_at) === date).length;
      const qPosts = qualityPostsInDateRange.filter(p => toVietnamDate(p.created_at) === date).length;
      
      // Given
      const rGiven = reactionsGiven?.filter(r => toVietnamDate(r.created_at) === date).length || 0;
      const cGiven = commentsGiven?.filter(c => toVietnamDate(c.created_at) === date).length || 0;
      const sGiven = sharesGiven?.filter(s => toVietnamDate(s.created_at) === date).length || 0;
      
      // Received - Total (from all posts)
      const totalRReceived = totalReactionsReceived.filter(r => toVietnamDate(r.created_at) === date).length;
      const totalCReceived = totalCommentsReceived.filter(c => toVietnamDate(c.created_at) === date).length;
      const totalSReceived = totalSharesReceived.filter(s => toVietnamDate(s.created_at) === date).length;
      
      // Received - From quality posts
      const rReceived = reactionsReceived.filter(r => toVietnamDate(r.created_at) === date).length;
      const cFromQualityPosts = commentsFromQualityPosts.filter(c => toVietnamDate(c.created_at) === date).length;
      const qcReceived = qualityCommentsReceived.filter(c => toVietnamDate(c.created_at) === date).length;
      const sReceived = sharesReceived.filter(s => toVietnamDate(s.created_at) === date).length;
      
      // Friends
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
        // Posts
        totalPostsCreated: totalPosts,
        qualityPostsCreated: qPosts,
        // Reactions
        reactionsGiven: rGiven,
        totalReactionsReceived: totalRReceived,
        reactionsReceived: rReceived,
        // Comments
        commentsGiven: cGiven,
        totalCommentsReceived: totalCReceived,
        commentsFromQualityPosts: cFromQualityPosts,
        qualityCommentsReceived: qcReceived,
        // Shares
        sharesGiven: sGiven,
        totalSharesReceived: totalSReceived,
        sharesReceived: sReceived,
        // Friends
        friendsAdded: fAdded,
        // Rewards
        postReward,
        reactReceivedReward,
        cmtReceivedReward,
        shareReceivedReward,
        friendReward,
        dailyTotalBeforeCap,
        dailyTotal
      };
    });
    
    // Build debug info if requested
    let debugPostsInfo: DebugPostInfo[] | undefined;
    if (collectDebugInfo) {
      debugPostsInfo = postsInDateRange.map(p => ({
        id: p.id,
        created_at_raw: p.created_at,
        created_at_vn: toVietnamDate(p.created_at),
        post_type: p.post_type,
        content_length: p.content?.length || 0,
        hasImages: hasValidImages(p.images),
        hasVideo: hasValidVideo(p.video_url),
        isQualityPost: isQualityPost(p)
      }));
    }

    return { stats, debugPosts: debugPostsInfo, queryInfo: debugQueryInfo };
  };

  // Fetch daily stats for selected user
  const handleSelectUser = async (user: UserSearchResult) => {
    setSelectedUser(user);
    setIsLoading(true);
    setSearchTimestamp(new Date());
    setSearchResults([]);
    setDebugPosts([]);
    setDebugQueryInfo(null);
    
    // Increment request ID to handle race conditions
    const currentRequestId = ++requestIdRef.current;

    try {
      const validUserIds = await getValidUserIds();
      const result = await fetchUserStats(user.id, validUserIds, startDate, endDate, debugMode);
      
      // Check if this is still the current request (handle race conditions)
      if (currentRequestId !== requestIdRef.current) {
        return;
      }
      
      setActivityData(result.stats);
      
      if (debugMode && result.debugPosts) {
        setDebugPosts(result.debugPosts);
        setDebugQueryInfo(result.queryInfo || null);
      }
      
      if (result.stats.length === 0) {
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
    cappedDays: acc.cappedDays + (row.dailyTotalBeforeCap > DAILY_CAP ? 1 : 0)
  }), { 
    totalPosts: 0, qualityPosts: 0,
    reactGiven: 0, totalReactReceived: 0, reactReceived: 0, 
    cmtGiven: 0, totalCmtReceived: 0, cmtFromQualityPosts: 0, qualityCmtReceived: 0, 
    shareGiven: 0, totalShareReceived: 0, shareReceived: 0, 
    friends: 0,
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
      `# REWARD SYSTEM v3.0 - Chỉ tính thưởng NHẬN (không tính cho)`,
      `# Daily Cap: ${DAILY_CAP.toLocaleString()} CLC`,
      `# Số ngày bị CAP: ${totals.cappedDays}`,
      '',
      headers.join(','),
      ...activityData.map(row => [
        row.date,
        row.totalPostsCreated, row.qualityPostsCreated, row.postReward,
        row.reactionsGiven, row.totalReactionsReceived, row.reactionsReceived, row.reactReceivedReward,
        row.commentsGiven, row.totalCommentsReceived, row.commentsFromQualityPosts, row.qualityCommentsReceived, row.cmtReceivedReward,
        row.sharesGiven, row.totalSharesReceived, row.sharesReceived, row.shareReceivedReward,
        row.friendsAdded, row.friendReward,
        row.dailyTotal, row.dailyTotalBeforeCap > DAILY_CAP ? 'YES' : 'NO'
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
          const result = await fetchUserStats(user.id, validUserIds, startDate, endDate, false);

          const summary = result.stats.reduce((acc, row) => ({
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
    setDebugPosts([]);
    setDebugQueryInfo(null);
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-center">
                  <p className="text-2xl font-bold text-amber-600">{formatCLC(totals.grandTotal)}</p>
                  <p className="text-xs text-muted-foreground">Tổng CLC</p>
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
                    {activityData.map((row) => (
                      <TableRow key={row.date} className={row.dailyTotalBeforeCap > DAILY_CAP ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                        <TableCell className="sticky left-0 bg-background font-medium">
                          {format(new Date(row.date), 'dd/MM/yyyy')}
                          {row.dailyTotalBeforeCap > DAILY_CAP && (
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
                    {/* Totals Row */}
                    <TableRow className="bg-muted/50 font-semibold sticky bottom-0">
                      <TableCell className="sticky left-0 bg-muted/50">TỔNG</TableCell>
                      {/* Posts */}
                      <TableCell className="text-center text-muted-foreground">{totals.totalPosts}</TableCell>
                      <TableCell className="text-center">{totals.qualityPosts}</TableCell>
                      <TableCell className="text-right text-blue-600">{formatCLC(totals.postReward)}</TableCell>
                      {/* Likes */}
                      <TableCell className="text-center text-muted-foreground">{totals.reactGiven}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{totals.totalReactReceived}</TableCell>
                      <TableCell className="text-center">{totals.reactReceived}</TableCell>
                      <TableCell className="text-right text-pink-600">{formatCLC(totals.reactReceivedReward)}</TableCell>
                      {/* Comments */}
                      <TableCell className="text-center text-muted-foreground">{totals.cmtGiven}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{totals.totalCmtReceived}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{totals.cmtFromQualityPosts}</TableCell>
                      <TableCell className="text-center">{totals.qualityCmtReceived}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCLC(totals.cmtReceivedReward)}</TableCell>
                      {/* Shares */}
                      <TableCell className="text-center text-muted-foreground">{totals.shareGiven}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{totals.totalShareReceived}</TableCell>
                      <TableCell className="text-center">{totals.shareReceived}</TableCell>
                      <TableCell className="text-right text-purple-600">{formatCLC(totals.shareReceivedReward)}</TableCell>
                      {/* Friends */}
                      <TableCell className="text-center">{totals.friends}</TableCell>
                      <TableCell className="text-right text-orange-600">{formatCLC(totals.friendReward)}</TableCell>
                      {/* Total */}
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

