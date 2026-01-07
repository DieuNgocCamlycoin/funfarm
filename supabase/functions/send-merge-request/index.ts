import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FUN_PROFILE_API_URL = Deno.env.get('FUN_PROFILE_API_URL') || 'https://api.funprofile.io';

interface MergeRequestPayload {
  user_id?: string;
  batch_all?: boolean;
  limit?: number;
}

interface UserMergeData {
  email: string;
  platform_user_id: string;
  platform_data: {
    display_name?: string;
    avatar_url?: string;
    camly_balance?: number;
    reputation_score?: number;
    is_verified?: boolean;
    profile_type?: string;
    wallet_address?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const funProfileClientSecret = Deno.env.get('FUN_PROFILE_CLIENT_SECRET');

    if (!funProfileClientSecret) {
      console.error('FUN_PROFILE_CLIENT_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing Fun Profile credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: MergeRequestPayload = await req.json();
    const { user_id, batch_all = false, limit = 100 } = payload;

    let usersToMerge: UserMergeData[] = [];

    if (user_id) {
      // Single user merge
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url, camly_balance, reputation_score, is_verified, profile_type, wallet_address')
        .eq('id', user_id)
        .is('fun_profile_id', null)
        .eq('is_merged', false)
        .single();

      if (error || !profile) {
        return new Response(
          JSON.stringify({ error: 'User not found or already merged' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!profile.email) {
        return new Response(
          JSON.stringify({ error: 'User has no email address' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      usersToMerge.push({
        email: profile.email,
        platform_user_id: profile.id,
        platform_data: {
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          camly_balance: profile.camly_balance,
          reputation_score: profile.reputation_score,
          is_verified: profile.is_verified,
          profile_type: profile.profile_type,
          wallet_address: profile.wallet_address,
        }
      });
    } else if (batch_all) {
      // Batch merge all unmerged users
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url, camly_balance, reputation_score, is_verified, profile_type, wallet_address')
        .is('fun_profile_id', null)
        .eq('is_merged', false)
        .not('email', 'is', null)
        .limit(limit);

      if (error) {
        console.error('Error fetching profiles:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch profiles' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      usersToMerge = (profiles || []).map(profile => ({
        email: profile.email!,
        platform_user_id: profile.id,
        platform_data: {
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          camly_balance: profile.camly_balance,
          reputation_score: profile.reputation_score,
          is_verified: profile.is_verified,
          profile_type: profile.profile_type,
          wallet_address: profile.wallet_address,
        }
      }));
    } else {
      return new Response(
        JSON.stringify({ error: 'Either user_id or batch_all must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (usersToMerge.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users to merge', count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending merge request for ${usersToMerge.length} users`);

    // Call Fun Profile API
    const mergeResponse = await fetch(`${FUN_PROFILE_API_URL}/api/sso-merge-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Platform-ID': 'fun_farm',
        'X-Platform-Secret': funProfileClientSecret,
      },
      body: JSON.stringify({
        platform_id: 'fun_farm',
        users: usersToMerge,
      }),
    });

    if (!mergeResponse.ok) {
      const errorText = await mergeResponse.text();
      console.error('Fun Profile API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send merge request to Fun Profile', details: errorText }),
        { status: mergeResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mergeResult = await mergeResponse.json();
    console.log('Merge request result:', mergeResult);

    // Log merge requests and update profiles
    for (const userData of usersToMerge) {
      const requestId = mergeResult.request_ids?.[userData.email] || mergeResult.request_id;
      
      // Update profile with merge_request_id
      await supabase
        .from('profiles')
        .update({ merge_request_id: requestId })
        .eq('id', userData.platform_user_id);

      // Log the request
      await supabase
        .from('merge_request_logs')
        .insert({
          user_id: userData.platform_user_id,
          email: userData.email,
          request_id: requestId,
          status: 'pending',
          profile_data: userData.platform_data,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Merge request sent for ${usersToMerge.length} users`,
        count: usersToMerge.length,
        request_id: mergeResult.request_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-merge-request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
