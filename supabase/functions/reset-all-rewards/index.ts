import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CUTOFF_DATE = '2025-12-31T23:59:59Z';

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

    console.log('Admin verified, starting reward recalculation...');

    // Get all active profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, pending_reward, approved_reward, welcome_bonus_claimed, wallet_bonus_claimed, verification_bonus_claimed')
      .eq('banned', false);

    if (profilesError) throw profilesError;

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

      // 4. Quality posts (>100 chars + media = 20,000 each)
      const { data: qualityPosts } = await supabase
        .from('posts')
        .select('id, content, images, video_url')
        .eq('author_id', userId)
        .eq('post_type', 'post')
        .lte('created_at', CUTOFF_DATE);

      const qualityPostCount = (qualityPosts || []).filter(p => {
        const hasContent = (p.content?.length || 0) > 100;
        const hasMedia = (p.images && p.images.length > 0) || p.video_url;
        return hasContent && hasMedia;
      }).length;
      
      calculatedReward += qualityPostCount * 20000;

      // 5. Likes received on original posts
      const { data: userOriginalPosts } = await supabase
        .from('posts')
        .select('id')
        .eq('author_id', userId)
        .eq('post_type', 'post')
        .lte('created_at', CUTOFF_DATE);

      const originalPostIds = (userOriginalPosts || []).map(p => p.id);

      // Lấy danh sách user còn tồn tại (loại trừ deleted users)
      const { data: existingUsers } = await supabase
        .from('profiles')
        .select('id');
      const existingUserIds = new Set((existingUsers || []).map(u => u.id));

      if (originalPostIds.length > 0) {
        // Likes từ người khác còn tồn tại (loại trừ self-like và deleted users)
        for (const postId of originalPostIds) {
          const { data: likes } = await supabase
            .from('post_likes')
            .select('user_id')
            .eq('post_id', postId)
            .neq('user_id', userId) // Loại trừ self-like
            .lte('created_at', CUTOFF_DATE);

          // Chỉ đếm likes từ users còn tồn tại
          const validLikers = (likes || []).filter(l => existingUserIds.has(l.user_id));
          const uniqueLikers = new Set(validLikers.map(l => l.user_id));
          const likeCount = uniqueLikers.size;
          
          // First 3 likes = 10,000 each, rest = 1,000 each
          const first3Reward = Math.min(likeCount, 3) * 10000;
          const restReward = Math.max(0, likeCount - 3) * 1000;
          calculatedReward += first3Reward + restReward;
        }

        // 6. Comments received (5,000 per unique commenter per post, >20 chars)
        // Comments từ deleted users đã bị xóa theo cleanup process
        for (const postId of originalPostIds) {
          const { data: comments } = await supabase
            .from('comments')
            .select('author_id, content')
            .eq('post_id', postId)
            .neq('author_id', userId)
            .lte('created_at', CUTOFF_DATE);

          const qualityCommenters = new Set(
            (comments || [])
              .filter(c => (c.content?.length || 0) > 20)
              .map(c => c.author_id)
          );
          calculatedReward += qualityCommenters.size * 5000;
        }

        // 7. Shares received từ người khác còn tồn tại (loại trừ self-share và deleted users)
        // 2 cấp độ: cơ bản (không comment hoặc <20 chars) = 4,000 CLC, chất lượng (>=20 chars) = 10,000 CLC
        for (const postId of originalPostIds) {
          const { data: shares } = await supabase
            .from('post_shares')
            .select('user_id')
            .eq('post_id', postId)
            .neq('user_id', userId) // Loại trừ self-share
            .lte('created_at', CUTOFF_DATE);

          // Chỉ đếm shares từ users còn tồn tại
          const validSharers = (shares || []).filter(s => existingUserIds.has(s.user_id));
          
          for (const share of validSharers) {
            // Tìm bài share (posts có original_post_id = postId và author = người share)
            const { data: sharePost } = await supabase
              .from('posts')
              .select('share_comment')
              .eq('original_post_id', postId)
              .eq('author_id', share.user_id)
              .eq('post_type', 'share')
              .maybeSingle();
            
            const commentLength = sharePost?.share_comment?.length || 0;
            if (commentLength >= 20) {
              calculatedReward += 10000; // Quality share
            } else {
              calculatedReward += 4000; // Basic share
            }
          }
        }
      }

      // 8. Friendship bonus (50,000 per accepted friendship với users còn tồn tại)
      const { data: friendships } = await supabase
        .from('followers')
        .select('id, follower_id, following_id')
        .eq('status', 'accepted')
        .or(`follower_id.eq.${userId},following_id.eq.${userId}`)
        .lte('created_at', CUTOFF_DATE);

      // Chỉ đếm friendships với users còn tồn tại
      const validFriendships = (friendships || []).filter(f => {
        const friendId = f.follower_id === userId ? f.following_id : f.follower_id;
        return existingUserIds.has(friendId);
      });
      calculatedReward += validFriendships.length * 50000;

      // Update pending_reward
      const oldPending = profile.pending_reward || 0;
      const difference = calculatedReward - oldPending;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ pending_reward: calculatedReward })
        .eq('id', userId);

      if (updateError) {
        console.error(`Error updating ${profile.display_name}:`, updateError);
      }

      results.push({
        user_id: userId,
        display_name: profile.display_name,
        old_pending: oldPending,
        new_pending: calculatedReward,
        difference
      });
    }

    console.log(`Reset completed for ${results.length} users`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Đã reset pending_reward cho ${results.length} users`,
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
