/**
 * ============================================
 * REWARD SYSTEM V3.1 - EDGE FUNCTION
 * ============================================
 * 
 * SOURCE OF TRUTH: src/lib/rewardCalculationService.ts
 * 
 * This Edge Function MUST stay in sync with the frontend service.
 * If you update logic here, update the service file as well.
 * 
 * V3.1 UNIFIED POOLS:
 * - Likes: 50/day from (Quality Posts + Quality Products + Valid Livestreams ≥15 min)
 * - Comments: 50/day from (Quality Posts + Quality Products + Valid Livestreams ≥15 min)
 * - Shares: 5/day from (Quality Posts + Quality Products + Valid Livestreams ≥15 min)
 * 
 * Last synced: 2026-01-27 (V3.1 Unified Daily Limits)
 * ============================================
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Reward System v3.1 Constants
// NOTE: CUTOFF_DATE is now computed per-request inside Deno.serve() to avoid stale values
const MAX_POSTS_PER_DAY = 10;
const MAX_LIKES_PER_DAY = 50; // V3.1: Unified limit (posts + products + livestreams)
const MAX_COMMENTS_PER_DAY = 50; // V3.1: Unified limit (posts + products + livestreams)
const MAX_SHARES_PER_DAY = 5; // V3.1: Unified limit (posts + products + livestreams)
const MAX_FRIENDSHIPS_PER_DAY = 10;
const MAX_LIVESTREAMS_PER_DAY = 5;
const LIVESTREAM_MIN_DURATION = 15; // Minutes
const DAILY_REWARD_CAP = 500000;

// Reward amounts V3.1
const WELCOME_BONUS = 50000;
const WALLET_BONUS = 50000;
const QUALITY_POST_REWARD = 10000;
const LIKE_REWARD = 1000;
const QUALITY_COMMENT_REWARD = 2000;
const SHARE_REWARD = 10000;
const FRIENDSHIP_REWARD = 10000;
const LIVESTREAM_REWARD = 20000;

const BATCH_SIZE = 5;

/**
 * Convert UTC timestamp to Vietnam date string (YYYY-MM-DD)
 * Vietnam timezone is UTC+7
 * 
 * CRITICAL: This ensures reward grouping uses Vietnam Day, not UTC Day.
 * Without this, activities between 17:00-24:00 UTC would be attributed to the wrong day.
 */
function toVietnamDate(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  // Add 7 hours to convert UTC to Vietnam time (UTC+7)
  const vnMs = date.getTime() + 7 * 60 * 60 * 1000;
  const vnDate = new Date(vnMs);
  // Use UTC getters to avoid any timezone interference
  const year = vnDate.getUTCFullYear();
  const month = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(vnDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function groupByVietnamDate<T>(items: T[], getTimestamp: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const vnDate = toVietnamDate(getTimestamp(item));
    if (!grouped.has(vnDate)) {
      grouped.set(vnDate, []);
    }
    grouped.get(vnDate)!.push(item);
  }
  return grouped;
}

function applyDailyLimit<T>(items: T[], getTimestamp: (item: T) => string, limit: number): T[] {
  const grouped = groupByVietnamDate(items, getTimestamp);
  const result: T[] = [];
  
  for (const [, dayItems] of grouped) {
    const limited = dayItems.slice(0, limit);
    result.push(...limited);
  }
  
  return result;
}

// Apply daily cap per Vietnam day (excludes welcome + wallet)
function applyDailyCap(rewardsByDate: Map<string, number>): Map<string, number> {
  const capped = new Map<string, number>();
  for (const [date, amount] of rewardsByDate) {
    capped.set(date, Math.min(amount, DAILY_REWARD_CAP));
  }
  return capped;
}

// Unified interaction interface for pooling likes/comments/shares from posts and livestreams
interface UnifiedInteraction {
  user_id: string;
  source_id: string;
  source_type: 'post' | 'livestream';
  created_at: string;
  content?: string; // For comments only
}

// Process a single user's reward calculation
async function processUser(
  supabase: any,
  profile: any,
  existingUserIds: Set<string>,
  allPostsData: any[],
  allLikesData: any[],
  allCommentsData: any[],
  allSharesData: any[],
  allFriendshipsData: any[],
  allLivestreamsData: any[],
  allLivestreamLikesData: any[],
  allLivestreamCommentsData: any[],
  allLivestreamSharesData: any[]
): Promise<any> {
  const userId = profile.id;
  
  // Track rewards by date for daily cap (excludes welcome + wallet)
  const rewardsByDate = new Map<string, number>();
  
  const addRewardForDate = (date: string, amount: number) => {
    const current = rewardsByDate.get(date) || 0;
    rewardsByDate.set(date, current + amount);
  };

  // 1. Welcome bonus (50,000) - NOT subject to daily cap
  let welcomeBonus = 0;
  if (profile.welcome_bonus_claimed) {
    welcomeBonus = WELCOME_BONUS;
  }

  // 2. Wallet bonus (50,000) - NOT subject to daily cap
  let walletBonus = 0;
  if (profile.wallet_bonus_claimed) {
    walletBonus = WALLET_BONUS;
  }

  // 3. Posts - ONLY quality posts (>100 chars + media) = 10,000 CLC (includes 'post' and 'product', excludes 'share')
  const userPosts = allPostsData.filter(p => p.author_id === userId && (p.post_type === 'post' || p.post_type === 'product'));
  
  const qualityPosts = userPosts.filter(p => {
    const hasContent = (p.content?.length || 0) > 100;
    // V3.1 SYNC: Strict media validation - must have non-empty strings
    const hasImages = p.images && Array.isArray(p.images) && 
      p.images.some((url: string) => typeof url === 'string' && url.trim() !== '');
    const hasVideo = typeof p.video_url === 'string' && p.video_url.trim() !== '';
    const hasMedia = hasImages || hasVideo;
    return hasContent && hasMedia;
  });
  
  const rewardableQualityPosts = applyDailyLimit(qualityPosts, p => p.created_at, MAX_POSTS_PER_DAY);
  
  for (const post of rewardableQualityPosts) {
    const vnDate = toVietnamDate(post.created_at);
    addRewardForDate(vnDate, QUALITY_POST_REWARD);
  }

  // 4. V3.1: Collect valid source IDs for interaction rewards
  // Quality posts: >100 chars + media + original content (post/product)
  const qualityPostIds = new Set(qualityPosts.map(p => p.id));

  // Valid livestreams: ≥15 minutes duration
  const validLivestreamIds = new Set(
    allLivestreamsData
      .filter(l => l.user_id === userId && l.ended_at && l.duration_minutes >= LIVESTREAM_MIN_DURATION)
      .map(l => l.id)
  );

  // ========================================
  // 5. V3.1 UNIFIED POOLS: Likes/Comments/Shares from Quality Posts + Valid Livestreams
  // ========================================

  // 5a. Collect ALL likes into unified pool
  const allLikesPool: UnifiedInteraction[] = [];
  
  // From quality posts
  for (const like of allLikesData) {
    if (qualityPostIds.has(like.post_id) && like.user_id !== userId && existingUserIds.has(like.user_id)) {
      allLikesPool.push({
        user_id: like.user_id,
        source_id: like.post_id,
        source_type: 'post',
        created_at: like.created_at
      });
    }
  }
  
  // From valid livestreams (≥15 min)
  for (const like of allLivestreamLikesData) {
    if (validLivestreamIds.has(like.livestream_id) && like.user_id !== userId && existingUserIds.has(like.user_id)) {
      allLikesPool.push({
        user_id: like.user_id,
        source_id: like.livestream_id,
        source_type: 'livestream',
        created_at: like.created_at
      });
    }
  }

  // 5b. Collect ALL quality comments into unified pool
  const allQualityCommentsPool: UnifiedInteraction[] = [];
  
  // From quality posts
  for (const comment of allCommentsData) {
    if (qualityPostIds.has(comment.post_id) && comment.author_id !== userId && existingUserIds.has(comment.author_id)) {
      const contentLength = comment.content?.length || 0;
      if (contentLength > 20) {
        allQualityCommentsPool.push({
          user_id: comment.author_id,
          source_id: comment.post_id,
          source_type: 'post',
          created_at: comment.created_at,
          content: comment.content
        });
      }
    }
  }
  
  // From valid livestreams (≥15 min)
  for (const comment of allLivestreamCommentsData) {
    if (validLivestreamIds.has(comment.livestream_id) && comment.author_id !== userId && existingUserIds.has(comment.author_id)) {
      const contentLength = comment.content?.length || 0;
      if (contentLength > 20) {
        allQualityCommentsPool.push({
          user_id: comment.author_id,
          source_id: comment.livestream_id,
          source_type: 'livestream',
          created_at: comment.created_at,
          content: comment.content
        });
      }
    }
  }

  // 5c. Collect ALL shares into unified pool
  const allSharesPool: UnifiedInteraction[] = [];
  
  // From quality posts
  for (const share of allSharesData) {
    if (qualityPostIds.has(share.post_id) && share.user_id !== userId && existingUserIds.has(share.user_id)) {
      allSharesPool.push({
        user_id: share.user_id,
        source_id: share.post_id,
        source_type: 'post',
        created_at: share.created_at
      });
    }
  }
  
  // From valid livestreams (≥15 min)
  for (const share of allLivestreamSharesData) {
    if (validLivestreamIds.has(share.livestream_id) && share.user_id !== userId && existingUserIds.has(share.user_id)) {
      allSharesPool.push({
        user_id: share.user_id,
        source_id: share.livestream_id,
        source_type: 'livestream',
        created_at: share.created_at
      });
    }
  }

  // ========================================
  // 6. V3.1: Sort by created_at (FCFS) and apply UNIFIED daily limits
  // ========================================

  // Likes: Sort and apply 50/day limit
  allLikesPool.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const rewardableLikes = applyDailyLimit(allLikesPool, l => l.created_at, MAX_LIKES_PER_DAY);

  for (const like of rewardableLikes) {
    const vnDate = toVietnamDate(like.created_at);
    addRewardForDate(vnDate, LIKE_REWARD);
  }

  // Comments: Sort and apply 50/day limit
  allQualityCommentsPool.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const rewardableComments = applyDailyLimit(allQualityCommentsPool, c => c.created_at, MAX_COMMENTS_PER_DAY);

  for (const comment of rewardableComments) {
    const vnDate = toVietnamDate(comment.created_at);
    addRewardForDate(vnDate, QUALITY_COMMENT_REWARD);
  }

  // Shares: Sort and apply 5/day limit
  allSharesPool.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const rewardableShares = applyDailyLimit(allSharesPool, s => s.created_at, MAX_SHARES_PER_DAY);

  for (const share of rewardableShares) {
    const vnDate = toVietnamDate(share.created_at);
    addRewardForDate(vnDate, SHARE_REWARD);
  }

  // ========================================
  // 7. Friendship bonus - 10k each, limit 10/day
  // ========================================
  const userFriendships = allFriendshipsData.filter(f => 
    (f.follower_id === userId || f.following_id === userId)
  );
  
  const validFriendships = userFriendships.filter(f => {
    const friendId = f.follower_id === userId ? f.following_id : f.follower_id;
    return existingUserIds.has(friendId);
  });
  
  const rewardableFriendships = applyDailyLimit(
    validFriendships, 
    f => f.created_at, 
    MAX_FRIENDSHIPS_PER_DAY
  );
  
  for (const friendship of rewardableFriendships) {
    const vnDate = toVietnamDate(friendship.created_at);
    addRewardForDate(vnDate, FRIENDSHIP_REWARD);
  }

  // ========================================
  // 8. Livestream completion rewards - 20k for >=15 min, limit 5/day
  // ========================================
  const userLivestreams = allLivestreamsData.filter(l => 
    l.user_id === userId && 
    l.ended_at && 
    l.duration_minutes >= LIVESTREAM_MIN_DURATION
  );
  
  const rewardableLivestreams = applyDailyLimit(
    userLivestreams,
    l => l.started_at,
    MAX_LIVESTREAMS_PER_DAY
  );
  
  for (const livestream of rewardableLivestreams) {
    const vnDate = toVietnamDate(livestream.started_at);
    addRewardForDate(vnDate, LIVESTREAM_REWARD);
  }

  // ========================================
  // 9. Apply daily cap and calculate final rewards
  // ========================================
  const cappedRewards = applyDailyCap(rewardsByDate);
  
  // Calculate total daily rewards (after cap)
  let dailyRewardsTotal = 0;
  for (const [, amount] of cappedRewards) {
    dailyRewardsTotal += amount;
  }

  // Final calculated reward = one-time rewards + capped daily rewards
  const calculatedReward = welcomeBonus + walletBonus + dailyRewardsTotal;

  // Update profile
  const oldPending = profile.pending_reward || 0;
  const oldApproved = profile.approved_reward || 0;
  const oldTotal = oldPending + oldApproved;
  const difference = calculatedReward - oldTotal;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      pending_reward: calculatedReward,
      approved_reward: 0
    })
    .eq('id', userId);

  if (updateError) {
    console.error(`Error updating ${profile.display_name}:`, updateError);
  }

  return {
    user_id: userId,
    display_name: profile.display_name,
    old_pending: oldPending,
    old_approved: oldApproved,
    old_total: oldTotal,
    new_pending: calculatedReward,
    difference,
    welcome_bonus: welcomeBonus,
    wallet_bonus: walletBonus,
    daily_rewards: dailyRewardsTotal,
    // V3.1 debug info
    likes_from_posts: rewardableLikes.filter(l => l.source_type === 'post').length,
    likes_from_livestreams: rewardableLikes.filter(l => l.source_type === 'livestream').length,
    comments_from_posts: rewardableComments.filter(c => c.source_type === 'post').length,
    comments_from_livestreams: rewardableComments.filter(c => c.source_type === 'livestream').length,
    shares_from_posts: rewardableShares.filter(s => s.source_type === 'post').length,
    shares_from_livestreams: rewardableShares.filter(s => s.source_type === 'livestream').length,
    livestream_completions: rewardableLivestreams.length
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'Không có quyền truy cập' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ success: false, message: 'Token không hợp lệ' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, message: 'Bạn không có quyền admin' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL: Compute cutoff timestamp fresh per request to avoid stale module-scoped value
    const CUTOFF_DATE = new Date().toISOString();
    console.log(`Admin verified, fetching all data for Reward System v3.1 (Unified Pools)... Cutoff: ${CUTOFF_DATE}`);

    // FETCH ALL DATA UPFRONT
    // CRITICAL: Add .limit(100000) to ALL queries to override Supabase's default 1000-row limit
    const [
      profilesRes,
      postsRes,
      likesRes,
      commentsRes,
      sharesRes,
      friendshipsRes,
      livestreamsRes,
      livestreamLikesRes,
      livestreamCommentsRes,
      livestreamSharesRes
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, pending_reward, approved_reward, welcome_bonus_claimed, wallet_bonus_claimed')
        .eq('banned', false)
        .limit(100000),
      supabase
        .from('posts')
        .select('id, author_id, content, images, video_url, created_at, post_type')
        .lte('created_at', CUTOFF_DATE)
        .order('created_at', { ascending: true })
        .limit(100000),
      supabase
        .from('post_likes')
        .select('user_id, post_id, created_at')
        .lte('created_at', CUTOFF_DATE)
        .order('created_at', { ascending: true })
        .limit(100000),
      supabase
        .from('comments')
        .select('author_id, post_id, content, created_at')
        .lte('created_at', CUTOFF_DATE)
        .order('created_at', { ascending: true })
        .limit(100000),
      supabase
        .from('post_shares')
        .select('user_id, post_id, created_at')
        .lte('created_at', CUTOFF_DATE)
        .order('created_at', { ascending: true })
        .limit(100000),
      supabase
        .from('followers')
        .select('id, follower_id, following_id, created_at')
        .eq('status', 'accepted')
        .lte('created_at', CUTOFF_DATE)
        .order('created_at', { ascending: true })
        .limit(100000),
      supabase
        .from('livestreams')
        .select('id, user_id, started_at, ended_at, duration_minutes')
        .lte('created_at', CUTOFF_DATE)
        .limit(100000),
      supabase
        .from('livestream_likes')
        .select('livestream_id, user_id, created_at')
        .lte('created_at', CUTOFF_DATE)
        .limit(100000),
      supabase
        .from('livestream_comments')
        .select('livestream_id, author_id, content, created_at')
        .lte('created_at', CUTOFF_DATE)
        .limit(100000),
      supabase
        .from('livestream_shares')
        .select('livestream_id, user_id, created_at')
        .lte('created_at', CUTOFF_DATE)
        .limit(100000)
    ]);

    if (profilesRes.error) throw profilesRes.error;

    const profiles = profilesRes.data || [];
    const allPostsData = postsRes.data || [];
    const allLikesData = likesRes.data || [];
    const allCommentsData = commentsRes.data || [];
    const allSharesData = sharesRes.data || [];
    const allFriendshipsData = friendshipsRes.data || [];
    const allLivestreamsData = livestreamsRes.data || [];
    const allLivestreamLikesData = livestreamLikesRes.data || [];
    const allLivestreamCommentsData = livestreamCommentsRes.data || [];
    const allLivestreamSharesData = livestreamSharesRes.data || [];

    // Build existing user IDs set
    const existingUserIds = new Set(profiles.map(p => p.id));

    console.log(`Processing ${profiles.length} users with Reward System v3.1 (Unified Pools)...`);
    console.log(`Data loaded: ${allPostsData.length} posts, ${allLikesData.length} likes, ${allCommentsData.length} comments, ${allSharesData.length} shares, ${allFriendshipsData.length} friendships`);

    const results: any[] = [];

    // Process in batches
    for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
      const batch = profiles.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(profile => 
          processUser(
            supabase,
            profile,
            existingUserIds,
            allPostsData,
            allLikesData,
            allCommentsData,
            allSharesData,
            allFriendshipsData,
            allLivestreamsData,
            allLivestreamLikesData,
            allLivestreamCommentsData,
            allLivestreamSharesData
          )
        )
      );
      
      results.push(...batchResults);
      console.log(`Processed ${Math.min(i + BATCH_SIZE, profiles.length)}/${profiles.length} users`);
    }

    console.log(`Reset completed for ${results.length} users with Reward System v3.1`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Reward System v3.1: Đã tính lại thưởng cho ${results.length} users (Unified Pools: Likes/Comments/Shares từ Quality Posts + Valid Livestreams, Daily Cap: 500k CLC)`,
        results
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in reset-all-rewards:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
