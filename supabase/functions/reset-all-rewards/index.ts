import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CUTOFF_DATE = '2025-12-31T23:59:59Z';
const MAX_POSTS_PER_DAY = 10;
const MAX_INTERACTIONS_PER_DAY = 50;
const MAX_FRIENDSHIPS_PER_DAY = 10;
const BATCH_SIZE = 5; // Process 5 users at a time

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
  allSharePostsData: any[]
): Promise<any> {
  const userId = profile.id;
  let calculatedReward = 0;

  // 1. Welcome bonus (50,000) - GỘP: xác minh email + hồ sơ thật + đồng ý Luật Ánh Sáng
  if (profile.welcome_bonus_claimed) {
    calculatedReward += 50000;
  }

  // 2. Wallet bonus (50,000)
  if (profile.wallet_bonus_claimed) {
    calculatedReward += 50000;
  }

  // NOTE: verification_bonus_claimed đã được gộp vào welcome_bonus_claimed
  // Không tính riêng verification_bonus nữa

  // 3. Posts - filter from pre-fetched data
  const userPosts = allPostsData.filter(p => p.author_id === userId && p.post_type === 'post');
  
  // Quality posts: >100 chars + media = 20,000 CLC
  const qualityPosts = userPosts.filter(p => {
    const hasContent = (p.content?.length || 0) > 100;
    const hasMedia = (p.images && p.images.length > 0) || p.video_url;
    return hasContent && hasMedia;
  });
  
  // Normal posts: không đạt chất lượng = 5,000 CLC
  const normalPosts = userPosts.filter(p => {
    const hasContent = (p.content?.length || 0) > 100;
    const hasMedia = (p.images && p.images.length > 0) || p.video_url;
    return !(hasContent && hasMedia);
  });
  
  const rewardableQualityPosts = applyDailyLimit(qualityPosts, p => p.created_at, MAX_POSTS_PER_DAY);
  const rewardableNormalPosts = applyDailyLimit(normalPosts, p => p.created_at, MAX_POSTS_PER_DAY);
  
  calculatedReward += rewardableQualityPosts.length * 20000;
  calculatedReward += rewardableNormalPosts.length * 5000;

  // 5. Get user's original post IDs
  const originalPostIds = new Set(userPosts.map(p => p.id));

  if (originalPostIds.size > 0) {
    interface Interaction {
      type: 'like' | 'comment' | 'share';
      user_id: string;
      post_id: string;
      created_at: string;
      share_comment_length?: number;
      content_length?: number;
    }
    const allInteractions: Interaction[] = [];

    // Likes received - filter from pre-fetched data
    for (const like of allLikesData) {
      if (originalPostIds.has(like.post_id) && like.user_id !== userId && existingUserIds.has(like.user_id)) {
        allInteractions.push({
          type: 'like',
          user_id: like.user_id,
          post_id: like.post_id,
          created_at: like.created_at
        });
      }
    }

    // Comments received - ALL comments (quality and normal)
    for (const comment of allCommentsData) {
      if (originalPostIds.has(comment.post_id) && comment.author_id !== userId && existingUserIds.has(comment.author_id)) {
        allInteractions.push({
          type: 'comment',
          user_id: comment.author_id,
          post_id: comment.post_id,
          created_at: comment.created_at,
          content_length: comment.content?.length || 0
        });
      }
    }

    // Shares received
    for (const share of allSharesData) {
      if (originalPostIds.has(share.post_id) && share.user_id !== userId && existingUserIds.has(share.user_id)) {
        // Find share_comment from pre-fetched data
        const sharePost = allSharePostsData.find(sp => 
          sp.original_post_id === share.post_id && sp.author_id === share.user_id
        );
        
        allInteractions.push({
          type: 'share',
          user_id: share.user_id,
          post_id: share.post_id,
          created_at: share.created_at,
          share_comment_length: sharePost?.share_comment?.length || 0
        });
      }
    }

    // Sort and apply daily limit
    allInteractions.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const rewardableInteractions = applyDailyLimit(
      allInteractions, 
      i => i.created_at, 
      MAX_INTERACTIONS_PER_DAY
    );

    // Calculate rewards
    const likesPerPost = new Map<string, Set<string>>();
    
    for (const interaction of rewardableInteractions) {
      if (interaction.type === 'like') {
        if (!likesPerPost.has(interaction.post_id)) {
          likesPerPost.set(interaction.post_id, new Set());
        }
        likesPerPost.get(interaction.post_id)!.add(interaction.user_id);
      } else if (interaction.type === 'comment') {
        // Quality comment (>20 chars) = 5,000 CLC, Normal comment = 1,000 CLC
        if ((interaction.content_length || 0) > 20) {
          calculatedReward += 5000;
        } else {
          calculatedReward += 1000;
        }
      } else if (interaction.type === 'share') {
        if ((interaction.share_comment_length || 0) >= 20) {
          calculatedReward += 10000;
        } else {
          calculatedReward += 4000;
        }
      }
    }

    for (const [, likers] of likesPerPost) {
      const likeCount = likers.size;
      const first3Reward = Math.min(likeCount, 3) * 10000;
      const restReward = Math.max(0, likeCount - 3) * 1000;
      calculatedReward += first3Reward + restReward;
    }
  }

  // 6. Friendship bonus - filter from pre-fetched data
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
  calculatedReward += rewardableFriendships.length * 50000;

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
    difference
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

    console.log('Admin verified, fetching all data for batch processing...');

    // FETCH ALL DATA UPFRONT to reduce queries
    const [
      profilesRes,
      postsRes,
      likesRes,
      commentsRes,
      sharesRes,
      friendshipsRes,
      sharePostsRes
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, pending_reward, approved_reward, welcome_bonus_claimed, wallet_bonus_claimed, verification_bonus_claimed')
        .eq('banned', false),
      supabase
        .from('posts')
        .select('id, author_id, content, images, video_url, created_at, post_type, original_post_id, share_comment')
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
        .from('posts')
        .select('author_id, original_post_id, share_comment')
        .eq('post_type', 'share')
        .lte('created_at', CUTOFF_DATE)
    ]);

    if (profilesRes.error) throw profilesRes.error;

    const profiles = profilesRes.data || [];
    const allPostsData = postsRes.data || [];
    const allLikesData = likesRes.data || [];
    const allCommentsData = commentsRes.data || [];
    const allSharesData = sharesRes.data || [];
    const allFriendshipsData = friendshipsRes.data || [];
    const allSharePostsData = sharePostsRes.data || [];

    // Build existing user IDs set
    const existingUserIds = new Set(profiles.map(p => p.id));

    console.log(`Processing ${profiles.length} users with pre-fetched data...`);

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
            allSharePostsData
          )
        )
      );
      
      results.push(...batchResults);
      console.log(`Processed ${Math.min(i + BATCH_SIZE, profiles.length)}/${profiles.length} users`);
    }

    console.log(`Reset completed for ${results.length} users`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Đã tính lại thưởng cho ${results.length} users (reset approved_reward về 0, tính lại pending_reward với giới hạn 10 bài/ngày, 50 tương tác/ngày, 10 kết bạn/ngày)`,
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
