import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Reward System v3.0 Constants
const CUTOFF_DATE = '2025-12-31T23:59:59Z';
const MAX_POSTS_PER_DAY = 10;
const MAX_INTERACTIONS_PER_DAY = 50;
const MAX_SHARES_PER_DAY = 5;
const MAX_FRIENDSHIPS_PER_DAY = 10;
const MAX_LIVESTREAMS_PER_DAY = 5;
const DAILY_REWARD_CAP = 500000;

// Reward amounts v3.0
const WELCOME_BONUS = 50000;
const WALLET_BONUS = 50000;
const QUALITY_POST_REWARD = 10000;
const LIKE_REWARD = 1000;
const QUALITY_COMMENT_REWARD = 2000;
const SHARE_REWARD = 10000;
const FRIENDSHIP_REWARD = 10000;
const LIVESTREAM_REWARD = 20000;

const BATCH_SIZE = 5;

function groupByDate<T>(items: T[], getDate: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const date = getDate(item).split('T')[0];
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(item);
  }
  return grouped;
}

function applyDailyLimit<T>(items: T[], getDate: (item: T) => string, limit: number): T[] {
  const grouped = groupByDate(items, getDate);
  const result: T[] = [];
  
  for (const [, dayItems] of grouped) {
    const limited = dayItems.slice(0, limit);
    result.push(...limited);
  }
  
  return result;
}

// Apply daily cap per day (excludes welcome + wallet)
function applyDailyCap(rewardsByDate: Map<string, number>): Map<string, number> {
  const capped = new Map<string, number>();
  for (const [date, amount] of rewardsByDate) {
    capped.set(date, Math.min(amount, DAILY_REWARD_CAP));
  }
  return capped;
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
    const hasMedia = (p.images && p.images.length > 0) || p.video_url;
    return hasContent && hasMedia;
  });
  
  const rewardableQualityPosts = applyDailyLimit(qualityPosts, p => p.created_at, MAX_POSTS_PER_DAY);
  
  for (const post of rewardableQualityPosts) {
    const date = post.created_at.split('T')[0];
    addRewardForDate(date, QUALITY_POST_REWARD);
  }

  // 4. Get ALL posts by user (original + shared) for interaction rewards
  const allUserPosts = allPostsData.filter(p => p.author_id === userId);
  const allUserPostIds = new Set(allUserPosts.map(p => p.id));

  if (allUserPostIds.size > 0) {
    interface Interaction {
      type: 'like' | 'comment' | 'share';
      user_id: string;
      post_id: string;
      created_at: string;
      content_length?: number;
    }
    const allInteractions: Interaction[] = [];

    // Likes received on ANY of user's posts (original + shared)
    for (const like of allLikesData) {
      if (allUserPostIds.has(like.post_id) && like.user_id !== userId && existingUserIds.has(like.user_id)) {
        allInteractions.push({
          type: 'like',
          user_id: like.user_id,
          post_id: like.post_id,
          created_at: like.created_at
        });
      }
    }

    // Comments received - ONLY quality comments (>20 chars)
    for (const comment of allCommentsData) {
      if (allUserPostIds.has(comment.post_id) && comment.author_id !== userId && existingUserIds.has(comment.author_id)) {
        const contentLength = comment.content?.length || 0;
        if (contentLength > 20) {
          allInteractions.push({
            type: 'comment',
            user_id: comment.author_id,
            post_id: comment.post_id,
            created_at: comment.created_at,
            content_length: contentLength
          });
        }
      }
    }

    // Sort and apply daily limit for likes + comments
    const likesAndComments = allInteractions.filter(i => i.type === 'like' || i.type === 'comment');
    likesAndComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const rewardableLikesComments = applyDailyLimit(likesAndComments, i => i.created_at, MAX_INTERACTIONS_PER_DAY);

    for (const interaction of rewardableLikesComments) {
      const date = interaction.created_at.split('T')[0];
      if (interaction.type === 'like') {
        addRewardForDate(date, LIKE_REWARD);
      } else if (interaction.type === 'comment') {
        addRewardForDate(date, QUALITY_COMMENT_REWARD);
      }
    }

    // Shares received - limit 5/day
    const sharesReceived: Interaction[] = [];
    for (const share of allSharesData) {
      if (allUserPostIds.has(share.post_id) && share.user_id !== userId && existingUserIds.has(share.user_id)) {
        sharesReceived.push({
          type: 'share',
          user_id: share.user_id,
          post_id: share.post_id,
          created_at: share.created_at
        });
      }
    }
    
    sharesReceived.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const rewardableShares = applyDailyLimit(sharesReceived, s => s.created_at, MAX_SHARES_PER_DAY);
    
    for (const share of rewardableShares) {
      const date = share.created_at.split('T')[0];
      addRewardForDate(date, SHARE_REWARD);
    }
  }

  // 5. Friendship bonus - 10k each, limit 10/day
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
    const date = friendship.created_at.split('T')[0];
    addRewardForDate(date, FRIENDSHIP_REWARD);
  }

  // 6. Livestream rewards - 20k for >=15 min, limit 5/day
  const userLivestreams = allLivestreamsData.filter(l => 
    l.user_id === userId && 
    l.ended_at && 
    l.duration_minutes >= 15
  );
  
  const rewardableLivestreams = applyDailyLimit(
    userLivestreams,
    l => l.started_at,
    MAX_LIVESTREAMS_PER_DAY
  );
  
  for (const livestream of rewardableLivestreams) {
    const date = livestream.started_at.split('T')[0];
    addRewardForDate(date, LIVESTREAM_REWARD);
  }

  // 7. Livestream interactions (likes, comments, shares)
  const userLivestreamIds = new Set(allLivestreamsData.filter(l => l.user_id === userId).map(l => l.id));
  
  if (userLivestreamIds.size > 0) {
    // Livestream likes
    const livestreamLikes = allLivestreamLikesData.filter(l => 
      userLivestreamIds.has(l.livestream_id) && l.user_id !== userId && existingUserIds.has(l.user_id)
    );
    
    for (const like of livestreamLikes) {
      const date = like.created_at.split('T')[0];
      addRewardForDate(date, LIKE_REWARD);
    }
    
    // Livestream quality comments
    const livestreamComments = allLivestreamCommentsData.filter(c => 
      userLivestreamIds.has(c.livestream_id) && 
      c.author_id !== userId && 
      existingUserIds.has(c.author_id) &&
      (c.content?.length || 0) > 20
    );
    
    for (const comment of livestreamComments) {
      const date = comment.created_at.split('T')[0];
      addRewardForDate(date, QUALITY_COMMENT_REWARD);
    }
    
    // Livestream shares (limit 5/day already applied above for all shares)
    const livestreamShares = allLivestreamSharesData.filter(s => 
      userLivestreamIds.has(s.livestream_id) && s.user_id !== userId && existingUserIds.has(s.user_id)
    );
    
    const rewardableLivestreamShares = applyDailyLimit(
      livestreamShares,
      s => s.created_at,
      MAX_SHARES_PER_DAY
    );
    
    for (const share of rewardableLivestreamShares) {
      const date = share.created_at.split('T')[0];
      addRewardForDate(date, SHARE_REWARD);
    }
  }

  // Apply daily cap to each day
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
    daily_rewards: dailyRewardsTotal
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

    console.log('Admin verified, fetching all data for Reward System v3.0...');

    // FETCH ALL DATA UPFRONT
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
        .eq('banned', false),
      supabase
        .from('posts')
        .select('id, author_id, content, images, video_url, created_at, post_type')
        .lte('created_at', CUTOFF_DATE)
        .order('created_at', { ascending: true }),
      supabase
        .from('post_likes')
        .select('user_id, post_id, created_at')
        .lte('created_at', CUTOFF_DATE)
        .order('created_at', { ascending: true }),
      supabase
        .from('comments')
        .select('author_id, post_id, content, created_at')
        .lte('created_at', CUTOFF_DATE)
        .order('created_at', { ascending: true }),
      supabase
        .from('post_shares')
        .select('user_id, post_id, created_at')
        .lte('created_at', CUTOFF_DATE)
        .order('created_at', { ascending: true }),
      supabase
        .from('followers')
        .select('id, follower_id, following_id, created_at')
        .eq('status', 'accepted')
        .lte('created_at', CUTOFF_DATE)
        .order('created_at', { ascending: true }),
      supabase
        .from('livestreams')
        .select('id, user_id, started_at, ended_at, duration_minutes')
        .lte('created_at', CUTOFF_DATE),
      supabase
        .from('livestream_likes')
        .select('livestream_id, user_id, created_at')
        .lte('created_at', CUTOFF_DATE),
      supabase
        .from('livestream_comments')
        .select('livestream_id, author_id, content, created_at')
        .lte('created_at', CUTOFF_DATE),
      supabase
        .from('livestream_shares')
        .select('livestream_id, user_id, created_at')
        .lte('created_at', CUTOFF_DATE)
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

    console.log(`Processing ${profiles.length} users with Reward System v3.0...`);

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

    console.log(`Reset completed for ${results.length} users with Reward System v3.0`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Reward System v3.0: Đã tính lại thưởng cho ${results.length} users (Daily Cap: 500k CLC, không bao gồm Welcome + Wallet)`,
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
