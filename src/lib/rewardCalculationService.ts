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
 * - Daily limit application (FCFS)
 * - Daily cap enforcement (500k CLC)
 * - User reward calculation
 * 
 * Used by:
 * - RewardComparisonTable.tsx
 * - RewardCalculationExport.tsx
 * - UserDailyActivityStats.tsx
 * - UserRewardDetailModal.tsx
 * - reset-all-rewards Edge Function (must be manually synced)
 * 
 * Last updated: 2026-01-21
 * ============================================
 */

import { supabase } from '@/integrations/supabase/client';
import {
  QUALITY_POST_REWARD,
  LIKE_REWARD,
  QUALITY_COMMENT_REWARD,
  SHARE_REWARD,
  FRIENDSHIP_REWARD,
  WELCOME_BONUS,
  WALLET_CONNECT_BONUS,
  DAILY_REWARD_CAP,
  MAX_POSTS_PER_DAY,
  MAX_LIKES_PER_DAY,
  MAX_COMMENTS_PER_DAY,
  MAX_SHARES_PER_DAY,
  MAX_FRIENDSHIPS_PER_DAY
} from './constants';
import { toVietnamDate, applyDailyLimit, applyDailyCap } from './dateUtils';

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

export interface DailyRewardStats {
  date: string;
  qualityPosts: number;
  likesReceived: number;
  qualityComments: number;
  sharesReceived: number;
  friendsMade: number;
  rawReward: number;
  cappedReward: number;
}

export interface RewardCalculationResult {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  
  // Counts (after daily limits applied)
  qualityPosts: number;
  likesReceived: number;
  qualityComments: number;
  sharesReceived: number;
  friendships: number;
  
  // Bonuses
  welcomeBonus: number;
  walletBonus: number;
  
  // Rewards
  postReward: number;
  likeReward: number;
  commentReward: number;
  shareReward: number;
  friendshipReward: number;
  dailyRewardsTotal: number;
  calculatedTotal: number;
  
  // Current values (from database)
  currentPending: number;
  currentApproved: number;
  currentTotal: number;
  difference: number;
  
  // Optional daily breakdown
  dailyStats?: DailyRewardStats[];
}

export interface CalculateUserRewardOptions {
  userId: string;
  validUserIds: Set<string>;
  cutoffTimestamp?: string;
  includeDailyBreakdown?: boolean;
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

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

/**
 * Calculate rewards for a single user using V3.1 logic
 * 
 * V3.1 Rules:
 * - Posts: First 10 quality posts/day receive rewards
 * - Interactions: Rewarded on ALL quality posts (not just first 10)
 * - Separate limits: 50 likes/day + 50 comments/day (independent pools)
 * - Daily cap: 500k CLC (excludes welcome + wallet bonuses)
 */
export async function calculateUserReward(
  options: CalculateUserRewardOptions
): Promise<RewardCalculationResult> {
  const { userId, validUserIds, cutoffTimestamp, includeDailyBreakdown = false } = options;
  const validUserIdArray = Array.from(validUserIds);
  const cutoff = cutoffTimestamp || new Date().toISOString();

  // Track rewards by date for daily cap
  const rewardsByDate = new Map<string, number>();
  const addRewardForDate = (date: string, amount: number) => {
    rewardsByDate.set(date, (rewardsByDate.get(date) || 0) + amount);
  };

  // Daily stats tracking (if needed)
  const dailyPostsCount = new Map<string, number>();
  const dailyLikesCount = new Map<string, number>();
  const dailyCommentsCount = new Map<string, number>();
  const dailySharesCount = new Map<string, number>();
  const dailyFriendsCount = new Map<string, number>();

  // 1. Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, created_at, pending_reward, approved_reward, camly_balance, welcome_bonus_claimed, wallet_bonus_claimed')
    .eq('id', userId)
    .single();

  // 2. Fetch ALL user's posts
  const { data: allUserPosts } = await supabase
    .from('posts')
    .select('id, content, images, video_url, created_at, post_type')
    .eq('author_id', userId)
    .lte('created_at', cutoff)
    .order('created_at', { ascending: true });

  // Filter quality posts
  const qualityPostsData = (allUserPosts || []).filter(isQualityPost);
  const qualityPostIds = qualityPostsData.map(p => p.id);

  // Apply 10/day limit for POST REWARDS
  const rewardableQualityPosts = applyDailyLimit(qualityPostsData, p => p.created_at, MAX_POSTS_PER_DAY);

  // Add post rewards
  for (const post of rewardableQualityPosts) {
    const vnDate = toVietnamDate(post.created_at);
    addRewardForDate(vnDate, QUALITY_POST_REWARD);
    dailyPostsCount.set(vnDate, (dailyPostsCount.get(vnDate) || 0) + 1);
  }

  // 3. V3.1: Interactions on ALL quality posts (not just first 10)
  let rewardableLikes: Like[] = [];
  let rewardableComments: { author_id: string; post_id: string; content: string | null; created_at: string }[] = [];
  let rewardableShares: Share[] = [];

  if (qualityPostIds.length > 0) {
    // Fetch likes on quality posts
    const { data: likesData } = await supabase
      .from('post_likes')
      .select('user_id, post_id, created_at')
      .in('post_id', qualityPostIds)
      .neq('user_id', userId)
      .lte('created_at', cutoff)
      .order('created_at', { ascending: true });

    const validLikes = (likesData || []).filter(l => validUserIds.has(l.user_id));

    // Fetch quality comments on quality posts
    const { data: commentsData } = await supabase
      .from('comments')
      .select('author_id, post_id, content, created_at')
      .in('post_id', qualityPostIds)
      .neq('author_id', userId)
      .lte('created_at', cutoff)
      .order('created_at', { ascending: true });

    const validQualityComments = (commentsData || []).filter(c => 
      validUserIds.has(c.author_id) && isQualityComment(c.content)
    );

    // V3.1: Apply SEPARATE daily limits - 50 likes/day AND 50 comments/day
    rewardableLikes = applyDailyLimit(validLikes, l => l.created_at, MAX_LIKES_PER_DAY);
    rewardableComments = applyDailyLimit(validQualityComments, c => c.created_at, MAX_COMMENTS_PER_DAY);

    // Add likes rewards
    for (const like of rewardableLikes) {
      const vnDate = toVietnamDate(like.created_at);
      addRewardForDate(vnDate, LIKE_REWARD);
      dailyLikesCount.set(vnDate, (dailyLikesCount.get(vnDate) || 0) + 1);
    }

    // Add comments rewards
    for (const comment of rewardableComments) {
      const vnDate = toVietnamDate(comment.created_at);
      addRewardForDate(vnDate, QUALITY_COMMENT_REWARD);
      dailyCommentsCount.set(vnDate, (dailyCommentsCount.get(vnDate) || 0) + 1);
    }

    // Shares on quality posts - limit 5/day
    const { data: sharesData } = await supabase
      .from('post_shares')
      .select('user_id, post_id, created_at')
      .in('post_id', qualityPostIds)
      .neq('user_id', userId)
      .lte('created_at', cutoff)
      .order('created_at', { ascending: true });

    const validShares = (sharesData || []).filter(s => validUserIds.has(s.user_id));
    rewardableShares = applyDailyLimit(validShares, s => s.created_at, MAX_SHARES_PER_DAY);

    for (const share of rewardableShares) {
      const vnDate = toVietnamDate(share.created_at);
      addRewardForDate(vnDate, SHARE_REWARD);
      dailySharesCount.set(vnDate, (dailySharesCount.get(vnDate) || 0) + 1);
    }
  }

  // 4. Friendships - 10k each, limit 10/day
  const { data: friendshipsData } = await supabase
    .from('followers')
    .select('follower_id, following_id, created_at')
    .or(`follower_id.eq.${userId},following_id.eq.${userId}`)
    .eq('status', 'accepted')
    .lte('created_at', cutoff)
    .order('created_at', { ascending: true });

  const validFriendships = (friendshipsData || []).filter(f => {
    const friendId = f.follower_id === userId ? f.following_id : f.follower_id;
    return validUserIds.has(friendId);
  });

  const rewardableFriendships = applyDailyLimit(validFriendships, f => f.created_at, MAX_FRIENDSHIPS_PER_DAY);

  for (const friendship of rewardableFriendships) {
    const vnDate = toVietnamDate(friendship.created_at);
    addRewardForDate(vnDate, FRIENDSHIP_REWARD);
    dailyFriendsCount.set(vnDate, (dailyFriendsCount.get(vnDate) || 0) + 1);
  }

  // 5. Calculate final rewards
  const welcomeBonus = profile?.welcome_bonus_claimed ? WELCOME_BONUS : 0;
  const walletBonus = profile?.wallet_bonus_claimed ? WALLET_CONNECT_BONUS : 0;
  const dailyRewardsTotal = applyDailyCap(rewardsByDate, DAILY_REWARD_CAP);

  const qualityPosts = rewardableQualityPosts.length;
  const likesReceived = rewardableLikes.length;
  const qualityComments = rewardableComments.length;
  const sharesReceived = rewardableShares.length;
  const friendships = rewardableFriendships.length;

  const postReward = qualityPosts * QUALITY_POST_REWARD;
  const likeReward = likesReceived * LIKE_REWARD;
  const commentReward = qualityComments * QUALITY_COMMENT_REWARD;
  const shareReward = sharesReceived * SHARE_REWARD;
  const friendshipReward = friendships * FRIENDSHIP_REWARD;

  const calculatedTotal = welcomeBonus + walletBonus + dailyRewardsTotal;
  const currentPending = profile?.pending_reward || 0;
  const currentApproved = profile?.approved_reward || 0;
  const currentTotal = currentPending + currentApproved;

  // Build daily stats if requested
  let dailyStats: DailyRewardStats[] | undefined;
  if (includeDailyBreakdown) {
    const allDates = new Set(rewardsByDate.keys());
    dailyStats = Array.from(allDates).sort().reverse().map(date => {
      const rawReward = rewardsByDate.get(date) || 0;
      return {
        date,
        qualityPosts: dailyPostsCount.get(date) || 0,
        likesReceived: dailyLikesCount.get(date) || 0,
        qualityComments: dailyCommentsCount.get(date) || 0,
        sharesReceived: dailySharesCount.get(date) || 0,
        friendsMade: dailyFriendsCount.get(date) || 0,
        rawReward,
        cappedReward: Math.min(rawReward, DAILY_REWARD_CAP)
      };
    });
  }

  return {
    userId,
    displayName: profile?.display_name || 'N/A',
    avatarUrl: profile?.avatar_url || null,
    createdAt: profile?.created_at || '',
    qualityPosts,
    likesReceived,
    qualityComments,
    sharesReceived,
    friendships,
    welcomeBonus,
    walletBonus,
    postReward,
    likeReward,
    commentReward,
    shareReward,
    friendshipReward,
    dailyRewardsTotal,
    calculatedTotal,
    currentPending,
    currentApproved,
    currentTotal,
    difference: currentPending - calculatedTotal,
    dailyStats
  };
}

// ============================================
// BATCH CALCULATION
// ============================================

export interface CalculateAllUsersOptions {
  onProgress?: (current: number, total: number) => void;
}

/**
 * Calculate rewards for all users
 */
export async function calculateAllUsersRewards(
  options?: CalculateAllUsersOptions
): Promise<RewardCalculationResult[]> {
  const { onProgress } = options || {};

  // Fetch all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, created_at, pending_reward, approved_reward, camly_balance, welcome_bonus_claimed, wallet_bonus_claimed, banned')
    .eq('banned', false)
    .order('pending_reward', { ascending: false });

  if (error) throw error;

  // Get valid user IDs
  const validUserIds = await getValidUserIds();
  const cutoff = new Date().toISOString();

  const results: RewardCalculationResult[] = [];
  const total = (profiles || []).length;

  for (let i = 0; i < total; i++) {
    const profile = profiles![i];
    
    const result = await calculateUserReward({
      userId: profile.id,
      validUserIds,
      cutoffTimestamp: cutoff,
      includeDailyBreakdown: false
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
  welcomeBonus: WELCOME_BONUS,
  walletBonus: WALLET_CONNECT_BONUS
};

export const DAILY_LIMITS = {
  qualityPost: MAX_POSTS_PER_DAY,
  likesReceived: MAX_LIKES_PER_DAY,
  commentsReceived: MAX_COMMENTS_PER_DAY,
  shareReceived: MAX_SHARES_PER_DAY,
  friend: MAX_FRIENDSHIPS_PER_DAY
};

export { DAILY_REWARD_CAP };
