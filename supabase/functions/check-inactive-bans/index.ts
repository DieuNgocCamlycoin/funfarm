// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Edge function to check inactive banned accounts and permanently ban them

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting check for inactive banned accounts...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active bans that are at least 7 days old
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: activeBans, error: bansError } = await supabase
      .from('reward_bans')
      .select('id, user_id, banned_at, expires_at, reason')
      .gt('expires_at', new Date().toISOString()) // Still active
      .lt('banned_at', sevenDaysAgo.toISOString()); // Banned at least 7 days ago

    if (bansError) {
      console.error('❌ Error fetching bans:', bansError);
      throw bansError;
    }

    console.log(`📋 Found ${activeBans?.length || 0} bans older than 7 days`);

    const permanentlyBanned: string[] = [];
    const stillActive: string[] = [];

    for (const ban of activeBans || []) {
      console.log(`\n👤 Checking user ${ban.user_id}...`);

      // Check for activity since ban date
      const banDate = ban.banned_at;

      // Check posts
      const { count: postsCount } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', ban.user_id)
        .gt('created_at', banDate);

      // Check comments
      const { count: commentsCount } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', ban.user_id)
        .gt('created_at', banDate);

      // Check likes
      const { count: likesCount } = await supabase
        .from('post_likes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', ban.user_id)
        .gt('created_at', banDate);

      // Check shares
      const { count: sharesCount } = await supabase
        .from('post_shares')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', ban.user_id)
        .gt('created_at', banDate);

      // Check profile updates
      const { data: profile } = await supabase
        .from('profiles')
        .select('updated_at')
        .eq('id', ban.user_id)
        .single();

      const profileUpdated = profile && new Date(profile.updated_at) > new Date(banDate);

      const totalActivity = (postsCount || 0) + (commentsCount || 0) + (likesCount || 0) + (sharesCount || 0);
      const hasActivity = totalActivity > 0 || profileUpdated;

      console.log(`   Posts: ${postsCount || 0}, Comments: ${commentsCount || 0}, Likes: ${likesCount || 0}, Shares: ${sharesCount || 0}, Profile updated: ${profileUpdated}`);

      if (!hasActivity) {
        // No activity - permanently ban (100 years)
        const permanentExpiry = new Date();
        permanentExpiry.setFullYear(permanentExpiry.getFullYear() + 100);

        const { error: updateError } = await supabase
          .from('reward_bans')
          .update({
            expires_at: permanentExpiry.toISOString(),
            reason: ban.reason + ' | ⛔ KHÓA VĨNH VIỄN: Không hoạt động sau 7 ngày bị khóa.'
          })
          .eq('id', ban.id);

        if (updateError) {
          console.error(`❌ Error updating ban for ${ban.user_id}:`, updateError);
        } else {
          console.log(`⛔ PERMANENTLY BANNED user ${ban.user_id} - No activity for 7+ days`);
          permanentlyBanned.push(ban.user_id);

          // Update violation level
          await supabase
            .from('profiles')
            .update({ 
              violation_level: 999,
              is_good_heart: false,
              good_heart_since: null
            })
            .eq('id', ban.user_id);
        }
      } else {
        console.log(`✅ User ${ban.user_id} has activity - keeping temporary ban`);
        stillActive.push(ban.user_id);
      }
    }

    const result = {
      checked: activeBans?.length || 0,
      permanentlyBanned: permanentlyBanned.length,
      stillActive: stillActive.length,
      permanentlyBannedUsers: permanentlyBanned,
      timestamp: new Date().toISOString()
    };

    console.log('\n✨ Check complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
