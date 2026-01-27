/**
 * ============================================
 * REWARD CALCULATION SERVICE V3.1
 * ============================================
 * 
 * SOURCE OF TRUTH for all reward calculation logic.
 * 
 * This module centralizes:
 * - Quality post validation
 * - Quality comment validation
 * - Valid livestream validation (≥15 min)
 * - Daily limit application (FCFS)
 * - UNIFIED POOLS for likes/comments/shares (posts + products + livestreams)
 * - Daily cap enforcement (500k CLC)
 * - User reward calculation
 * - Display-only metrics for admin reporting
 * 
 * V3.1 UNIFIED POOLS:
 * - Likes: 50/day from (Quality Posts + Quality Products + Valid Livestreams ≥15 min)
 * - Comments: 50/day from (Quality Posts + Quality Products + Valid Livestreams ≥15 min)
 * - Shares: 5/day from (Quality Posts + Quality Products + Valid Livestreams ≥15 min)
 * 
 * Used by:
 * - RewardComparisonTable.tsx
 * - RewardCalculationExport.tsx
 * - UserDailyActivityStats.tsx (primary consumer)
 * - UserRewardDetailModal.tsx
 * - reset-all-rewards Edge Function (must be manually synced)
 * 
 * Last updated: 2026-01-27 (V3.1 Unified Daily Limits)
 * ============================================
 */

import { supabase } from '@/integrations/supabase/client';
import {
  QUALITY_POST_REWARD,
  LIKE_REWARD,
  QUALITY_COMMENT_REWARD,
  SHARE_REWARD,
  FRIENDSHIP_REWARD,
  LIVESTREAM_REWARD,
  LIVESTREAM_MIN_DURATION,
  WELCOME_BONUS,
  WALLET_CONNECT_BONUS,
  DAILY_REWARD_CAP,
  MAX_POSTS_PER_DAY,
  MAX_LIKES_PER_DAY,
  MAX_COMMENTS_PER_DAY,
  MAX_SHARES_PER_DAY,
  MAX_FRIENDSHIPS_PER_DAY,
  MAX_LIVESTREAMS_PER_DAY
} from './constants';
import { toVietnamDate, applyDailyLimit, applyDailyCap } from './dateUtils';
import { format } from 'date-fns';

// ============================================
// INTERFACES
// ============================================

export interface Post {
  id: string;
  content: string | null;
  images: string[] | null;
  video_url: string | null;
  post_type: string;
  created_at: string;
}

export interface Like {
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Comment {
  author_id: string;
  post_id: string;
  content: string | null;
  created_at: string;
}

export interface Share {
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Friendship {
  follower_id: string;
  following_id: string;
  created_at: string;
}

// V3.1: Livestream interfaces
export interface Livestream {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
}

export interface LivestreamLike {
  livestream_id: string;
  user_id: string;
  created_at: string;
}

export interface LivestreamComment {
  livestream_id: string;
  author_id: string;
  content: string | null;
  created_at: string;
}

export interface LivestreamShare {
  livestream_id: string;
  user_id: string;
  created_at: string;
}

// V3.1: Unified interaction for pooling
interface UnifiedInteraction {
  user_id: string;
  source_id: string;
  source_type: 'post' | 'livestream';
  created_at: string;
  content?: string;
}

/**
 * Extended DailyRewardStats with display-only fields for admin reporting
 */
export interface DailyRewardStats {
  date: string;
  
  // === POSTS ===
  totalPostsCreated: number;       // All posts (any type) - display only
  qualityPosts: number;            // Quality posts (has reward)
  
  // === LIKES ===
  likesGiven: number;              // Likes given to others - display only
  totalLikesReceived: number;      // Total likes from ALL posts - display only
  likesReceived: number;           // Likes from quality posts + valid livestreams (has reward)
  
  // === COMMENTS ===
  commentsGiven: number;           // Comments given to others - display only
  totalCommentsReceived: number;   // Total comments from ALL posts - display only
  commentsFromQualityPosts: number;// Comments from quality posts (any length) - display only
  qualityComments: number;         // Quality comments >20 chars (has reward)
  
  // === SHARES ===
  sharesGiven: number;             // Shares given - display only
  totalSharesReceived: number;     // Total shares from ALL posts - display only
  sharesReceived: number;          // Shares from quality posts + valid livestreams (has reward)
  
  // === FRIENDS ===
  friendsMade: number;             // Friends made (2-way) (has reward)
  
  // === LIVESTREAM ===
  livestreamsCompleted: number;    // Livestreams ≥15 min (has reward)
  
  // === REWARDS ===
  postReward: number;
  likeReward: number;
  commentReward: number;
  shareReward: number;
  friendReward: number;
  livestreamReward: number;
  rawReward: number;               // Before daily cap
  cappedReward: number;            // After daily cap
}

/**
 * Debug info for a single post (admin debugging)
 */
export interface DebugPostInfo {
  id: string;
  created_at_raw: string;
  created_at_vn: string;
  post_type: string;
  content_length: number;
  hasImages: boolean;
  hasVideo: boolean;
  isQualityPost: boolean;
}

export interface RewardCalculationResult {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  
  // Counts (after daily limits applied) - FOR REWARD CALCULATION
  qualityPosts: number;
  likesReceived: number;
  qualityComments: number;
  sharesReceived: number;
  friendships: number;
  livestreamsCompleted: number;
  
  // === NEW DISPLAY-ONLY COUNTS (for admin reporting) ===
  totalPostsCreated: number;        // All posts (any type)
  likesGiven: number;               // Likes given to others
  totalLikesReceived: number;       // Likes from ALL posts
  commentsGiven: number;            // Comments given to others
  totalCommentsReceived: number;    // Comments from ALL posts
  commentsFromQualityPosts: number; // Comments from quality posts (any length)
  sharesGiven: number;              // Shares given to others
  totalSharesReceived: number;      // Shares from ALL posts
  
  // V3.1: Source breakdown for likes/comments/shares
  likesFromPosts: number;
  likesFromLivestreams: number;
  commentsFromPosts: number;
  commentsFromLivestreams: number;
  sharesFromPosts: number;
  sharesFromLivestreams: number;
  
  // Bonuses
  welcomeBonus: number;
  walletBonus: number;
  
  // Rewards
  postReward: number;
  likeReward: number;
  commentReward: number;
  shareReward: number;
  friendshipReward: number;
  livestreamReward: number;
  dailyRewardsTotal: number;
  calculatedTotal: number;
  
  // Current values (from database)
  currentPending: number;
  currentApproved: number;
  currentTotal: number;
  difference: number;
  
  // Optional daily breakdown
  dailyStats?: DailyRewardStats[];
  
  // === NEW DEBUG INFO ===
  debugPosts?: DebugPostInfo[];
  debugQueryInfo?: { startUTC: string; endUTC: string };
}

export interface CalculateUserRewardOptions {
  userId: string;
  validUserIds: Set<string>;
  cutoffTimestamp?: string;
  includeDailyBreakdown?: boolean;
  
  // === NEW: Date filter options (Vietnam dates) ===
  filterStartDate?: Date;
  filterEndDate?: Date;
  
  // === NEW: Debug mode ===
  includeDebugInfo?: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if images array has valid images
 */
export const hasValidImages = (images: string[] | null): boolean => {
  return images != null && Array.isArray(images) && 
    images.some(url => typeof url === 'string' && url.trim() !== '');
};

/**
 * Check if video_url is valid
 */
export const hasValidVideo = (video_url: string | null): boolean => {
  return typeof video_url === 'string' && video_url.trim() !== '';
};

/**
 * Check if post is a quality post: >100 chars + has media + original content (post/product)
 */
export const isQualityPost = (post: {
  content: string | null;
  images: string[] | null;
  video_url: string | null;
  post_type: string;
}): boolean => {
  const hasContent = (post.content?.length || 0) > 100;
  const hasImages = hasValidImages(post.images);
  const hasVideo = hasValidVideo(post.video_url);
  const hasMedia = hasImages || hasVideo;
  const isOriginalContent = post.post_type === 'post' || post.post_type === 'product';
  return hasContent && hasMedia && isOriginalContent;
};

/**
 * Check if comment is quality: >20 chars
 */
export const isQualityComment = (content: string | null): boolean => {
  return (content?.length || 0) > 20;
};

/**
 * Check if livestream is valid for interaction rewards: ≥15 min duration
 */
export const isValidLivestream = (livestream: {
  ended_at: string | null;
  duration_minutes: number | null;
}): boolean => {
  return livestream.ended_at != null && (livestream.duration_minutes || 0) >= LIVESTREAM_MIN_DURATION;
};

/**
 * Get valid user IDs (not banned, not deleted)
 */
export const getValidUserIds = async (): Promise<Set<string>> => {
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

/**
 * Convert Vietnam date (Date object) to UTC range for database query
 * Vietnam day starts at 00:00 VN = 17:00 previous day UTC
 * Vietnam day ends at 23:59:59 VN = 16:59:59 same day UTC
 */
export const vietnamDateToUTCRange = (vnDate: Date, isStart: boolean): string => {
  // Extract year/month/day from the Date object (these represent Vietnam date selection)
  const vnDateStr = format(vnDate, 'yyyy-MM-dd');
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

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

/**
 * Calculate rewards for a single user using V3.1 logic
 * 
 * V3.1 Rules:
 * - Posts: First 10 quality posts/day receive rewards
 * - Interactions: Rewarded on ALL quality posts AND valid livestreams (≥15 min)
 * - UNIFIED pools: 50 likes/day + 50 comments/day + 5 shares/day (from posts + livestreams)
 * - Livestream completion: 20k/livestream ≥15 min, max 5/day
 * - Daily cap: 500k CLC (excludes welcome + wallet bonuses)
 */
export async function calculateUserReward(
  options: CalculateUserRewardOptions
): Promise<RewardCalculationResult> {
  const { 
    userId, 
    validUserIds, 
    cutoffTimestamp, 
    includeDailyBreakdown = false,
    filterStartDate,
    filterEndDate,
    includeDebugInfo = false
  } = options;
  const validUserIdArray = Array.from(validUserIds);
  const cutoff = cutoffTimestamp || new Date().toISOString();

  // Build date filter strings for queries
  let startDateStr: string | null = null;
  let endDateStr: string | null = null;
  
  if (filterStartDate) {
    startDateStr = vietnamDateToUTCRange(filterStartDate, true);
  }
  if (filterEndDate) {
    endDateStr = vietnamDateToUTCRange(filterEndDate, false);
  }
  
  const debugQueryInfo = (startDateStr || endDateStr) 
    ? { startUTC: startDateStr || 'N/A', endUTC: endDateStr || 'N/A' } 
    : undefined;

  // Track rewards by date for daily cap
  const rewardsByDate = new Map<string, number>();
  const addRewardForDate = (date: string, amount: number) => {
    rewardsByDate.set(date, (rewardsByDate.get(date) || 0) + amount);
  };

  // Daily stats tracking
  const dailyStats = new Map<string, DailyRewardStats>();
  const getOrCreateDailyStats = (date: string): DailyRewardStats => {
    if (!dailyStats.has(date)) {
      dailyStats.set(date, {
        date,
        totalPostsCreated: 0,
        qualityPosts: 0,
        likesGiven: 0,
        totalLikesReceived: 0,
        likesReceived: 0,
        commentsGiven: 0,
        totalCommentsReceived: 0,
        commentsFromQualityPosts: 0,
        qualityComments: 0,
        sharesGiven: 0,
        totalSharesReceived: 0,
        sharesReceived: 0,
        friendsMade: 0,
        livestreamsCompleted: 0,
        postReward: 0,
        likeReward: 0,
        commentReward: 0,
        shareReward: 0,
        friendReward: 0,
        livestreamReward: 0,
        rawReward: 0,
        cappedReward: 0
      });
    }
    return dailyStats.get(date)!;
  };

  // 1. Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, created_at, pending_reward, approved_reward, camly_balance, welcome_bonus_claimed, wallet_bonus_claimed')
    .eq('id', userId)
    .single();

  // 2. Fetch ALL user's posts (no date filter - we need all post IDs for received metrics)
  const allPostsQuery = supabase
    .from('posts')
    .select('id, content, images, video_url, created_at, post_type')
    .eq('author_id', userId)
    .lte('created_at', cutoff)
    .order('created_at', { ascending: true });

  const { data: allUserPosts } = await allPostsQuery;
  
  // All posts IDs (for querying received interactions)
  const allPostIds = (allUserPosts || []).map(p => p.id);
  
  // Filter quality posts
  const allQualityPosts = (allUserPosts || []).filter(isQualityPost);
  const qualityPostIds = allQualityPosts.map(p => p.id);

  // Helper to check if timestamp is within date range
  const isInDateRange = (created_at: string): boolean => {
    if (!startDateStr && !endDateStr) return true;
    if (startDateStr && created_at < startDateStr) return false;
    if (endDateStr && created_at > endDateStr) return false;
    return true;
  };

  // Posts within date range (for display columns)
  const postsInDateRange = (allUserPosts || []).filter(p => isInDateRange(p.created_at));
  const qualityPostsInDateRange = postsInDateRange.filter(isQualityPost);
  
  // Track total posts created (display only)
  let totalPostsCreatedCount = 0;
  postsInDateRange.forEach(p => {
    const vnDate = toVietnamDate(p.created_at);
    const stats = getOrCreateDailyStats(vnDate);
    stats.totalPostsCreated++;
    totalPostsCreatedCount++;
  });

  // Apply 10/day limit for POST REWARDS
  const rewardableQualityPosts = applyDailyLimit(qualityPostsInDateRange, p => p.created_at, MAX_POSTS_PER_DAY);

  // Add post rewards and track quality posts count
  for (const post of rewardableQualityPosts) {
    const vnDate = toVietnamDate(post.created_at);
    addRewardForDate(vnDate, QUALITY_POST_REWARD);
    const stats = getOrCreateDailyStats(vnDate);
    stats.qualityPosts++;
    stats.postReward += QUALITY_POST_REWARD;
  }

  // ========================================
  // 3. V3.1: Fetch valid livestreams (≥15 min)
  // ========================================
  
  let livestreamsQuery = supabase
    .from('livestreams')
    .select('id, user_id, started_at, ended_at, duration_minutes')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .gte('duration_minutes', LIVESTREAM_MIN_DURATION)
    .lte('created_at', cutoff)
    .order('started_at', { ascending: true })
    .limit(100000);

  if (startDateStr) livestreamsQuery = livestreamsQuery.gte('created_at', startDateStr);
  if (endDateStr) livestreamsQuery = livestreamsQuery.lte('created_at', endDateStr);

  const { data: validLivestreamsData } = await livestreamsQuery;
  const validLivestreams = validLivestreamsData || [];
  const validLivestreamIds = validLivestreams.map(l => l.id);

  // Apply limit 5/day for livestream completion rewards
  const rewardableLivestreams = applyDailyLimit(
    validLivestreams, 
    l => l.started_at, 
    MAX_LIVESTREAMS_PER_DAY
  );

  for (const livestream of rewardableLivestreams) {
    const vnDate = toVietnamDate(livestream.started_at);
    addRewardForDate(vnDate, LIVESTREAM_REWARD);
    const stats = getOrCreateDailyStats(vnDate);
    stats.livestreamsCompleted++;
    stats.livestreamReward += LIVESTREAM_REWARD;
  }

  // ========================================
  // 4. Fetch "Given" activities (display only, no reward)
  // ========================================
  
  // Likes given
  let likesGivenQuery = supabase
    .from('post_likes')
    .select('created_at')
    .eq('user_id', userId)
    .lte('created_at', cutoff)
    .limit(100000);
  
  if (startDateStr) likesGivenQuery = likesGivenQuery.gte('created_at', startDateStr);
  if (endDateStr) likesGivenQuery = likesGivenQuery.lte('created_at', endDateStr);
  
  const { data: likesGivenData } = await likesGivenQuery;
  
  let likesGivenCount = 0;
  (likesGivenData || []).forEach(l => {
    const vnDate = toVietnamDate(l.created_at);
    const stats = getOrCreateDailyStats(vnDate);
    stats.likesGiven++;
    likesGivenCount++;
  });

  // Comments given
  let commentsGivenQuery = supabase
    .from('comments')
    .select('created_at')
    .eq('author_id', userId)
    .lte('created_at', cutoff)
    .limit(100000);
  
  if (startDateStr) commentsGivenQuery = commentsGivenQuery.gte('created_at', startDateStr);
  if (endDateStr) commentsGivenQuery = commentsGivenQuery.lte('created_at', endDateStr);
  
  const { data: commentsGivenData } = await commentsGivenQuery;
  
  let commentsGivenCount = 0;
  (commentsGivenData || []).forEach(c => {
    const vnDate = toVietnamDate(c.created_at);
    const stats = getOrCreateDailyStats(vnDate);
    stats.commentsGiven++;
    commentsGivenCount++;
  });

  // Shares given (posts with post_type='share')
  let sharesGivenQuery = supabase
    .from('posts')
    .select('created_at')
    .eq('author_id', userId)
    .eq('post_type', 'share')
    .lte('created_at', cutoff)
    .limit(100000);
  
  if (startDateStr) sharesGivenQuery = sharesGivenQuery.gte('created_at', startDateStr);
  if (endDateStr) sharesGivenQuery = sharesGivenQuery.lte('created_at', endDateStr);
  
  const { data: sharesGivenData } = await sharesGivenQuery;
  
  let sharesGivenCount = 0;
  (sharesGivenData || []).forEach(s => {
    const vnDate = toVietnamDate(s.created_at);
    const stats = getOrCreateDailyStats(vnDate);
    stats.sharesGiven++;
    sharesGivenCount++;
  });

  // ========================================
  // 5. Fetch "Total Received" from ALL posts (display only)
  // ========================================
  
  let totalLikesReceivedCount = 0;
  let totalCommentsReceivedCount = 0;
  let totalSharesReceivedCount = 0;
  
  if (allPostIds.length > 0 && validUserIdArray.length > 0) {
    // Total likes received from ALL posts
    let totalLikesQuery = supabase
      .from('post_likes')
      .select('created_at')
      .in('post_id', allPostIds)
      .neq('user_id', userId)
      .in('user_id', validUserIdArray)
      .lte('created_at', cutoff)
      .limit(100000);
    
    if (startDateStr) totalLikesQuery = totalLikesQuery.gte('created_at', startDateStr);
    if (endDateStr) totalLikesQuery = totalLikesQuery.lte('created_at', endDateStr);
    
    const { data: totalLikesData } = await totalLikesQuery;
    
    (totalLikesData || []).forEach(l => {
      const vnDate = toVietnamDate(l.created_at);
      const stats = getOrCreateDailyStats(vnDate);
      stats.totalLikesReceived++;
      totalLikesReceivedCount++;
    });

    // Total comments received from ALL posts
    let totalCommentsQuery = supabase
      .from('comments')
      .select('created_at, content')
      .in('post_id', allPostIds)
      .neq('author_id', userId)
      .in('author_id', validUserIdArray)
      .lte('created_at', cutoff)
      .limit(100000);
    
    if (startDateStr) totalCommentsQuery = totalCommentsQuery.gte('created_at', startDateStr);
    if (endDateStr) totalCommentsQuery = totalCommentsQuery.lte('created_at', endDateStr);
    
    const { data: totalCommentsData } = await totalCommentsQuery;
    
    (totalCommentsData || []).forEach(c => {
      const vnDate = toVietnamDate(c.created_at);
      const stats = getOrCreateDailyStats(vnDate);
      stats.totalCommentsReceived++;
      totalCommentsReceivedCount++;
    });

    // Total shares received from ALL posts
    let totalSharesQuery = supabase
      .from('post_shares')
      .select('created_at')
      .in('post_id', allPostIds)
      .neq('user_id', userId)
      .in('user_id', validUserIdArray)
      .lte('created_at', cutoff)
      .limit(100000);
    
    if (startDateStr) totalSharesQuery = totalSharesQuery.gte('created_at', startDateStr);
    if (endDateStr) totalSharesQuery = totalSharesQuery.lte('created_at', endDateStr);
    
    const { data: totalSharesData } = await totalSharesQuery;
    
    (totalSharesData || []).forEach(s => {
      const vnDate = toVietnamDate(s.created_at);
      const stats = getOrCreateDailyStats(vnDate);
      stats.totalSharesReceived++;
      totalSharesReceivedCount++;
    });
  }

  // ========================================
  // 6. V3.1 UNIFIED POOLS: Interactions from Quality Posts + Valid Livestreams
  // ========================================
  
  // Unified pools for likes/comments/shares
  const allLikesPool: UnifiedInteraction[] = [];
  const allQualityCommentsPool: UnifiedInteraction[] = [];
  const allSharesPool: UnifiedInteraction[] = [];
  let commentsFromQualityPostsCount = 0;

  // 6a. Likes from quality posts
  if (qualityPostIds.length > 0 && validUserIdArray.length > 0) {
    let likesQuery = supabase
      .from('post_likes')
      .select('user_id, post_id, created_at')
      .in('post_id', qualityPostIds)
      .neq('user_id', userId)
      .in('user_id', validUserIdArray)
      .lte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(100000);
    
    if (startDateStr) likesQuery = likesQuery.gte('created_at', startDateStr);
    if (endDateStr) likesQuery = likesQuery.lte('created_at', endDateStr);

    const { data: likesData } = await likesQuery;
    (likesData || []).forEach(l => {
      allLikesPool.push({
        user_id: l.user_id,
        source_id: l.post_id,
        source_type: 'post',
        created_at: l.created_at
      });
    });

    // Comments from quality posts
    let commentsQuery = supabase
      .from('comments')
      .select('author_id, post_id, content, created_at')
      .in('post_id', qualityPostIds)
      .neq('author_id', userId)
      .in('author_id', validUserIdArray)
      .lte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(100000);
    
    if (startDateStr) commentsQuery = commentsQuery.gte('created_at', startDateStr);
    if (endDateStr) commentsQuery = commentsQuery.lte('created_at', endDateStr);

    const { data: commentsData } = await commentsQuery;
    
    // Track ALL comments from quality posts (any length) - display only
    (commentsData || []).forEach(c => {
      const vnDate = toVietnamDate(c.created_at);
      const stats = getOrCreateDailyStats(vnDate);
      stats.commentsFromQualityPosts++;
      commentsFromQualityPostsCount++;
      
      // Add quality comments (>20 chars) to pool
      if (isQualityComment(c.content)) {
        allQualityCommentsPool.push({
          user_id: c.author_id,
          source_id: c.post_id,
          source_type: 'post',
          created_at: c.created_at,
          content: c.content || undefined
        });
      }
    });

    // Shares from quality posts
    let sharesQuery = supabase
      .from('post_shares')
      .select('user_id, post_id, created_at')
      .in('post_id', qualityPostIds)
      .neq('user_id', userId)
      .in('user_id', validUserIdArray)
      .lte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(100000);
    
    if (startDateStr) sharesQuery = sharesQuery.gte('created_at', startDateStr);
    if (endDateStr) sharesQuery = sharesQuery.lte('created_at', endDateStr);

    const { data: sharesData } = await sharesQuery;
    (sharesData || []).forEach(s => {
      allSharesPool.push({
        user_id: s.user_id,
        source_id: s.post_id,
        source_type: 'post',
        created_at: s.created_at
      });
    });
  }

  // 6b. Likes from valid livestreams
  if (validLivestreamIds.length > 0 && validUserIdArray.length > 0) {
    let lsLikesQuery = supabase
      .from('livestream_likes')
      .select('livestream_id, user_id, created_at')
      .in('livestream_id', validLivestreamIds)
      .neq('user_id', userId)
      .in('user_id', validUserIdArray)
      .lte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(100000);

    if (startDateStr) lsLikesQuery = lsLikesQuery.gte('created_at', startDateStr);
    if (endDateStr) lsLikesQuery = lsLikesQuery.lte('created_at', endDateStr);

    const { data: lsLikesData } = await lsLikesQuery;
    (lsLikesData || []).forEach(l => {
      allLikesPool.push({
        user_id: l.user_id,
        source_id: l.livestream_id,
        source_type: 'livestream',
        created_at: l.created_at
      });
    });

    // Comments from valid livestreams (quality only: >20 chars)
    let lsCommentsQuery = supabase
      .from('livestream_comments')
      .select('livestream_id, author_id, content, created_at')
      .in('livestream_id', validLivestreamIds)
      .neq('author_id', userId)
      .in('author_id', validUserIdArray)
      .lte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(100000);

    if (startDateStr) lsCommentsQuery = lsCommentsQuery.gte('created_at', startDateStr);
    if (endDateStr) lsCommentsQuery = lsCommentsQuery.lte('created_at', endDateStr);

    const { data: lsCommentsData } = await lsCommentsQuery;
    (lsCommentsData || []).filter(c => isQualityComment(c.content)).forEach(c => {
      allQualityCommentsPool.push({
        user_id: c.author_id,
        source_id: c.livestream_id,
        source_type: 'livestream',
        created_at: c.created_at,
        content: c.content || undefined
      });
    });

    // Shares from valid livestreams
    let lsSharesQuery = supabase
      .from('livestream_shares')
      .select('livestream_id, user_id, created_at')
      .in('livestream_id', validLivestreamIds)
      .neq('user_id', userId)
      .in('user_id', validUserIdArray)
      .lte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(100000);

    if (startDateStr) lsSharesQuery = lsSharesQuery.gte('created_at', startDateStr);
    if (endDateStr) lsSharesQuery = lsSharesQuery.lte('created_at', endDateStr);

    const { data: lsSharesData } = await lsSharesQuery;
    (lsSharesData || []).forEach(s => {
      allSharesPool.push({
        user_id: s.user_id,
        source_id: s.livestream_id,
        source_type: 'livestream',
        created_at: s.created_at
      });
    });
  }

  // ========================================
  // 7. V3.1: Sort by created_at (FCFS) and apply UNIFIED daily limits
  // ========================================

  // Likes: Sort and apply 50/day limit
  allLikesPool.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const rewardableLikes = applyDailyLimit(allLikesPool, l => l.created_at, MAX_LIKES_PER_DAY);

  for (const like of rewardableLikes) {
    const vnDate = toVietnamDate(like.created_at);
    addRewardForDate(vnDate, LIKE_REWARD);
    const stats = getOrCreateDailyStats(vnDate);
    stats.likesReceived++;
    stats.likeReward += LIKE_REWARD;
  }

  // Comments: Sort and apply 50/day limit
  allQualityCommentsPool.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const rewardableComments = applyDailyLimit(allQualityCommentsPool, c => c.created_at, MAX_COMMENTS_PER_DAY);

  for (const comment of rewardableComments) {
    const vnDate = toVietnamDate(comment.created_at);
    addRewardForDate(vnDate, QUALITY_COMMENT_REWARD);
    const stats = getOrCreateDailyStats(vnDate);
    stats.qualityComments++;
    stats.commentReward += QUALITY_COMMENT_REWARD;
  }

  // Shares: Sort and apply 5/day limit
  allSharesPool.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const rewardableShares = applyDailyLimit(allSharesPool, s => s.created_at, MAX_SHARES_PER_DAY);

  for (const share of rewardableShares) {
    const vnDate = toVietnamDate(share.created_at);
    addRewardForDate(vnDate, SHARE_REWARD);
    const stats = getOrCreateDailyStats(vnDate);
    stats.sharesReceived++;
    stats.shareReward += SHARE_REWARD;
  }

  // ========================================
  // 8. Friendships - 10k each, limit 10/day (2-WAY counting)
  // ========================================
  
  let friendshipsQuery = supabase
    .from('followers')
    .select('follower_id, following_id, created_at')
    .or(`follower_id.eq.${userId},following_id.eq.${userId}`)
    .eq('status', 'accepted')
    .lte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(100000);
  
  if (startDateStr) friendshipsQuery = friendshipsQuery.gte('created_at', startDateStr);
  if (endDateStr) friendshipsQuery = friendshipsQuery.lte('created_at', endDateStr);

  const { data: friendshipsData } = await friendshipsQuery;

  const validFriendships = (friendshipsData || []).filter(f => {
    const friendId = f.follower_id === userId ? f.following_id : f.follower_id;
    return validUserIds.has(friendId);
  });

  const rewardableFriendships = applyDailyLimit(validFriendships, f => f.created_at, MAX_FRIENDSHIPS_PER_DAY);

  for (const friendship of rewardableFriendships) {
    const vnDate = toVietnamDate(friendship.created_at);
    addRewardForDate(vnDate, FRIENDSHIP_REWARD);
    const stats = getOrCreateDailyStats(vnDate);
    stats.friendsMade++;
    stats.friendReward += FRIENDSHIP_REWARD;
  }

  // ========================================
  // 9. Calculate final rewards
  // ========================================
  
  const welcomeBonus = profile?.welcome_bonus_claimed ? WELCOME_BONUS : 0;
  const walletBonus = profile?.wallet_bonus_claimed ? WALLET_CONNECT_BONUS : 0;
  const dailyRewardsTotal = applyDailyCap(rewardsByDate, DAILY_REWARD_CAP);

  const qualityPostsCount = rewardableQualityPosts.length;
  const likesReceivedCount = rewardableLikes.length;
  const qualityCommentsCount = rewardableComments.length;
  const sharesReceivedCount = rewardableShares.length;
  const friendshipsCount = rewardableFriendships.length;
  const livestreamsCount = rewardableLivestreams.length;

  // V3.1: Source breakdown
  const likesFromPosts = rewardableLikes.filter(l => l.source_type === 'post').length;
  const likesFromLivestreams = rewardableLikes.filter(l => l.source_type === 'livestream').length;
  const commentsFromPosts = rewardableComments.filter(c => c.source_type === 'post').length;
  const commentsFromLivestreams = rewardableComments.filter(c => c.source_type === 'livestream').length;
  const sharesFromPosts = rewardableShares.filter(s => s.source_type === 'post').length;
  const sharesFromLivestreams = rewardableShares.filter(s => s.source_type === 'livestream').length;

  const postReward = qualityPostsCount * QUALITY_POST_REWARD;
  const likeReward = likesReceivedCount * LIKE_REWARD;
  const commentReward = qualityCommentsCount * QUALITY_COMMENT_REWARD;
  const shareReward = sharesReceivedCount * SHARE_REWARD;
  const friendshipReward = friendshipsCount * FRIENDSHIP_REWARD;
  const livestreamReward = livestreamsCount * LIVESTREAM_REWARD;

  const calculatedTotal = welcomeBonus + walletBonus + dailyRewardsTotal;
  const currentPending = profile?.pending_reward || 0;
  const currentApproved = profile?.approved_reward || 0;
  const currentTotal = currentPending + currentApproved;

  // Build daily stats array if requested
  let dailyStatsArray: DailyRewardStats[] | undefined;
  if (includeDailyBreakdown) {
    // Calculate raw and capped rewards for each day
    for (const [date, stats] of dailyStats) {
      stats.rawReward = stats.postReward + stats.likeReward + stats.commentReward + 
        stats.shareReward + stats.friendReward + stats.livestreamReward;
      stats.cappedReward = Math.min(stats.rawReward, DAILY_REWARD_CAP);
    }
    
    dailyStatsArray = Array.from(dailyStats.values()).sort((a, b) => b.date.localeCompare(a.date));
  }

  // Build debug info if requested
  let debugPosts: DebugPostInfo[] | undefined;
  if (includeDebugInfo) {
    debugPosts = postsInDateRange.map(p => ({
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

  return {
    userId,
    displayName: profile?.display_name || 'N/A',
    avatarUrl: profile?.avatar_url || null,
    createdAt: profile?.created_at || '',
    
    // Reward counts
    qualityPosts: qualityPostsCount,
    likesReceived: likesReceivedCount,
    qualityComments: qualityCommentsCount,
    sharesReceived: sharesReceivedCount,
    friendships: friendshipsCount,
    livestreamsCompleted: livestreamsCount,
    
    // Display-only counts
    totalPostsCreated: totalPostsCreatedCount,
    likesGiven: likesGivenCount,
    totalLikesReceived: totalLikesReceivedCount,
    commentsGiven: commentsGivenCount,
    totalCommentsReceived: totalCommentsReceivedCount,
    commentsFromQualityPosts: commentsFromQualityPostsCount,
    sharesGiven: sharesGivenCount,
    totalSharesReceived: totalSharesReceivedCount,
    
    // V3.1: Source breakdown
    likesFromPosts,
    likesFromLivestreams,
    commentsFromPosts,
    commentsFromLivestreams,
    sharesFromPosts,
    sharesFromLivestreams,
    
    // Bonuses
    welcomeBonus,
    walletBonus,
    
    // Rewards
    postReward,
    likeReward,
    commentReward,
    shareReward,
    friendshipReward,
    livestreamReward,
    dailyRewardsTotal,
    calculatedTotal,
    
    // Current values
    currentPending,
    currentApproved,
    currentTotal,
    difference: currentPending - calculatedTotal,
    
    // Optional breakdowns
    dailyStats: dailyStatsArray,
    debugPosts,
    debugQueryInfo
  };
}

// ============================================
// BATCH CALCULATION
// ============================================

export interface CalculateAllUsersOptions {
  onProgress?: (current: number, total: number) => void;
  filterStartDate?: Date;
  filterEndDate?: Date;
  cutoffTimestamp?: string;
}

/**
 * Calculate rewards for all users
 */
export async function calculateAllUsersRewards(
  options?: CalculateAllUsersOptions
): Promise<RewardCalculationResult[]> {
  const { onProgress, filterStartDate, filterEndDate, cutoffTimestamp } = options || {};

  // Use provided cutoff or generate new one (for snapshot consistency)
  const cutoff = cutoffTimestamp || new Date().toISOString();

  // Fetch all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, created_at, pending_reward, approved_reward, camly_balance, welcome_bonus_claimed, wallet_bonus_claimed, banned')
    .eq('banned', false)
    .order('pending_reward', { ascending: false });

  if (error) throw error;

  // Get valid user IDs
  const validUserIds = await getValidUserIds();

  const results: RewardCalculationResult[] = [];
  const total = (profiles || []).length;

  for (let i = 0; i < total; i++) {
    const profile = profiles![i];
    
    const result = await calculateUserReward({
      userId: profile.id,
      validUserIds,
      cutoffTimestamp: cutoff,
      includeDailyBreakdown: false,
      filterStartDate,
      filterEndDate
    });

    results.push(result);

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return results;
}

// ============================================
// EXPORT CONSTANTS (for components that need them)
// ============================================

export const REWARD_RATES = {
  qualityPost: QUALITY_POST_REWARD,
  likeReceived: LIKE_REWARD,
  qualityCommentReceived: QUALITY_COMMENT_REWARD,
  shareReceived: SHARE_REWARD,
  friend: FRIENDSHIP_REWARD,
  livestream: LIVESTREAM_REWARD,
  welcomeBonus: WELCOME_BONUS,
  walletBonus: WALLET_CONNECT_BONUS
};

export const DAILY_LIMITS = {
  qualityPost: MAX_POSTS_PER_DAY,
  likesReceived: MAX_LIKES_PER_DAY,
  commentsReceived: MAX_COMMENTS_PER_DAY,
  shareReceived: MAX_SHARES_PER_DAY,
  friend: MAX_FRIENDSHIPS_PER_DAY,
  livestream: MAX_LIVESTREAMS_PER_DAY
};

export { DAILY_REWARD_CAP };
