import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CUTOFF_DATE = '2025-12-31T23:59:59Z';
const MAX_POSTS_PER_DAY = 10;
const MAX_INTERACTIONS_PER_DAY = 50; // likes + comments + shares received
const MAX_FRIENDSHIPS_PER_DAY = 10;

// Helper: Group items by date (YYYY-MM-DD)
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

// Helper: Apply daily limit and return filtered items
function applyDailyLimit<T>(items: T[], getDate: (item: T) => string, limit: number): T[] {
  const grouped = groupByDate(items, getDate);
  const result: T[] = [];
  
  for (const [, dayItems] of grouped) {
    // Sort by created_at to take the first N items of the day
    const limited = dayItems.slice(0, limit);
    result.push(...limited);
  }
  
  return result;
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

    console.log('Admin verified, starting reward recalculation with daily limits...');

    // Get all active profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, pending_reward, approved_reward, welcome_bonus_claimed, wallet_bonus_claimed, verification_bonus_claimed')
      .eq('banned', false);

    if (profilesError) throw profilesError;

    // Get existing user IDs (exclude deleted users)
    const { data: existingUsers } = await supabase
      .from('profiles')
      .select('id');
    const existingUserIds = new Set((existingUsers || []).map(u => u.id));

    const results: any[] = [];

    for (const profile of profiles || []) {
      const userId = profile.id;
      let calculatedReward = 0;

      // 1. Welcome bonus (50,000 - từ handle_new_user)
      if (profile.welcome_bonus_claimed) {
        calculatedReward += 50000;
      }

      // 2. Wallet bonus (50,000)
      if (profile.wallet_bonus_claimed) {
        calculatedReward += 50000;
      }

      // 3. Verification bonus (50,000)
      if (profile.verification_bonus_claimed) {
        calculatedReward += 50000;
      }

      // 4. Quality posts (>100 chars + media = 20,000 each) - MAX 10/DAY
      const { data: allPosts } = await supabase
        .from('posts')
        .select('id, content, images, video_url, created_at')
        .eq('author_id', userId)
        .eq('post_type', 'post')
        .lte('created_at', CUTOFF_DATE)
        .order('created_at', { ascending: true });

      // Filter quality posts first
      const qualityPosts = (allPosts || []).filter(p => {
        const hasContent = (p.content?.length || 0) > 100;
        const hasMedia = (p.images && p.images.length > 0) || p.video_url;
        return hasContent && hasMedia;
      });
      
      // Apply 10 posts/day limit
      const rewardablePosts = applyDailyLimit(qualityPosts, p => p.created_at, MAX_POSTS_PER_DAY);
      calculatedReward += rewardablePosts.length * 20000;

      // 5. Get original post IDs for calculating interactions received
      const { data: userOriginalPosts } = await supabase
        .from('posts')
        .select('id')
        .eq('author_id', userId)
        .eq('post_type', 'post')
        .lte('created_at', CUTOFF_DATE);

      const originalPostIds = (userOriginalPosts || []).map(p => p.id);

      if (originalPostIds.length > 0) {
        // Collect ALL interactions received with timestamps
        interface Interaction {
          type: 'like' | 'comment' | 'share';
          user_id: string;
          post_id: string;
          created_at: string;
          share_comment_length?: number;
        }
        const allInteractions: Interaction[] = [];

        // Fetch likes received
        const { data: allLikes } = await supabase
          .from('post_likes')
          .select('user_id, post_id, created_at')
          .in('post_id', originalPostIds)
          .neq('user_id', userId) // Exclude self-like
          .lte('created_at', CUTOFF_DATE)
          .order('created_at', { ascending: true });

        for (const like of allLikes || []) {
          if (existingUserIds.has(like.user_id)) {
            allInteractions.push({
              type: 'like',
              user_id: like.user_id,
              post_id: like.post_id,
              created_at: like.created_at
            });
          }
        }

        // Fetch comments received (>20 chars)
        const { data: allComments } = await supabase
          .from('comments')
          .select('author_id, post_id, content, created_at')
          .in('post_id', originalPostIds)
          .neq('author_id', userId) // Exclude self-comment
          .lte('created_at', CUTOFF_DATE)
          .order('created_at', { ascending: true });

        for (const comment of allComments || []) {
          if ((comment.content?.length || 0) > 20) {
            allInteractions.push({
              type: 'comment',
              user_id: comment.author_id,
              post_id: comment.post_id,
              created_at: comment.created_at
            });
          }
        }

        // Fetch shares received
        const { data: allShares } = await supabase
          .from('post_shares')
          .select('user_id, post_id, created_at')
          .in('post_id', originalPostIds)
          .neq('user_id', userId) // Exclude self-share
          .lte('created_at', CUTOFF_DATE)
          .order('created_at', { ascending: true });

        for (const share of allShares || []) {
          if (existingUserIds.has(share.user_id)) {
            // Get share_comment length
            const { data: sharePost } = await supabase
              .from('posts')
              .select('share_comment')
              .eq('original_post_id', share.post_id)
              .eq('author_id', share.user_id)
              .eq('post_type', 'share')
              .maybeSingle();

            allInteractions.push({
              type: 'share',
              user_id: share.user_id,
              post_id: share.post_id,
              created_at: share.created_at,
              share_comment_length: sharePost?.share_comment?.length || 0
            });
          }
        }

        // Sort all interactions by created_at
        allInteractions.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Apply 50 interactions/day limit
        const rewardableInteractions = applyDailyLimit(
          allInteractions, 
          i => i.created_at, 
          MAX_INTERACTIONS_PER_DAY
        );

        // Calculate rewards from limited interactions
        // Track unique likers per post for like reward formula
        const likesPerPost = new Map<string, Set<string>>();
        
        for (const interaction of rewardableInteractions) {
          if (interaction.type === 'like') {
            if (!likesPerPost.has(interaction.post_id)) {
              likesPerPost.set(interaction.post_id, new Set());
            }
            likesPerPost.get(interaction.post_id)!.add(interaction.user_id);
          } else if (interaction.type === 'comment') {
            // 5,000 per comment
            calculatedReward += 5000;
          } else if (interaction.type === 'share') {
            // 4,000 for basic, 10,000 for quality (>=20 chars)
            if ((interaction.share_comment_length || 0) >= 20) {
              calculatedReward += 10000;
            } else {
              calculatedReward += 4000;
            }
          }
        }

        // Calculate like rewards (first 3 = 10,000 each, rest = 1,000 each per post)
        for (const [, likers] of likesPerPost) {
          const likeCount = likers.size;
          const first3Reward = Math.min(likeCount, 3) * 10000;
          const restReward = Math.max(0, likeCount - 3) * 1000;
          calculatedReward += first3Reward + restReward;
        }
      }

      // 8. Friendship bonus (50,000 per accepted friendship với users còn tồn tại) - MAX 10/DAY
      const { data: friendships } = await supabase
        .from('followers')
        .select('id, follower_id, following_id, created_at')
        .eq('status', 'accepted')
        .or(`follower_id.eq.${userId},following_id.eq.${userId}`)
        .lte('created_at', CUTOFF_DATE)
        .order('created_at', { ascending: true });

      // Filter friendships với users còn tồn tại
      const validFriendships = (friendships || []).filter(f => {
        const friendId = f.follower_id === userId ? f.following_id : f.follower_id;
        return existingUserIds.has(friendId);
      });
      
      // Apply 10 friendships/day limit
      const rewardableFriendships = applyDailyLimit(
        validFriendships, 
        f => f.created_at, 
        MAX_FRIENDSHIPS_PER_DAY
      );
      calculatedReward += rewardableFriendships.length * 50000;

      // Update pending_reward AND reset approved_reward to 0
      const oldPending = profile.pending_reward || 0;
      const oldApproved = profile.approved_reward || 0;
      const oldTotal = oldPending + oldApproved;
      const difference = calculatedReward - oldTotal;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          pending_reward: calculatedReward,
          approved_reward: 0 // Reset approved về 0, tất cả chuyển vào pending
        })
        .eq('id', userId);

      if (updateError) {
        console.error(`Error updating ${profile.display_name}:`, updateError);
      }

      results.push({
        user_id: userId,
        display_name: profile.display_name,
        old_pending: oldPending,
        old_approved: oldApproved,
        old_total: oldTotal,
        new_pending: calculatedReward,
        difference
      });
    }

    console.log(`Reset completed for ${results.length} users with daily limits applied`);

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
