import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserWithEmail {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  camly_balance: number;
  is_verified: boolean;
  fun_profile_id: string | null;
  fun_id: string | null;
  is_merged: boolean;
  merge_request_id: string | null;
  merge_status: 'none' | 'pending' | 'provisioned' | 'merged';
}

interface MergeStats {
  total: number;
  withEmail: number;
  unmerged: number;
  pending: number;
  provisioned: number;
  merged: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    const { tab = 'unmerged', limit = 100 } = await req.json().catch(() => ({}));

    console.log('Fetching users for merge, tab:', tab);

    // 1. Get all auth users with emails
    const { data: authData, error: authListError } = await supabase.auth.admin.listUsers({
      perPage: 1000
    });

    if (authListError) {
      console.error('Error listing auth users:', authListError);
      return new Response(
        JSON.stringify({ error: 'Failed to list auth users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailMap = new Map(authData.users.map(u => [u.id, u.email]));
    console.log('Found', emailMap.size, 'auth users with emails');

    // 2. Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, camly_balance, is_verified, fun_profile_id, fun_id, is_merged, merge_request_id')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get merge request logs for status
    const { data: mergeLogs } = await supabase
      .from('merge_request_logs')
      .select('user_id, status')
      .order('created_at', { ascending: false });

    const mergeStatusMap = new Map<string, string>();
    (mergeLogs || []).forEach(log => {
      if (log.user_id && !mergeStatusMap.has(log.user_id)) {
        mergeStatusMap.set(log.user_id, log.status || 'pending');
      }
    });

    // 4. Merge data
    const usersWithEmail: UserWithEmail[] = (profiles || []).map(profile => {
      const email = emailMap.get(profile.id) || null;
      let mergeStatus: 'none' | 'pending' | 'provisioned' | 'merged' = 'none';
      
      if (profile.is_merged || profile.fun_profile_id) {
        mergeStatus = 'merged';
      } else if (profile.merge_request_id) {
        const logStatus = mergeStatusMap.get(profile.id);
        if (logStatus === 'provisioned') {
          mergeStatus = 'provisioned';
        } else {
          mergeStatus = 'pending';
        }
      }

      return {
        id: profile.id,
        email,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        camly_balance: profile.camly_balance || 0,
        is_verified: profile.is_verified || false,
        fun_profile_id: profile.fun_profile_id,
        fun_id: profile.fun_id,
        is_merged: profile.is_merged || false,
        merge_request_id: profile.merge_request_id,
        merge_status: mergeStatus,
      };
    });

    // 5. Calculate stats
    const stats: MergeStats = {
      total: usersWithEmail.length,
      withEmail: usersWithEmail.filter(u => u.email).length,
      unmerged: usersWithEmail.filter(u => u.merge_status === 'none' && u.email).length,
      pending: usersWithEmail.filter(u => u.merge_status === 'pending').length,
      provisioned: usersWithEmail.filter(u => u.merge_status === 'provisioned').length,
      merged: usersWithEmail.filter(u => u.merge_status === 'merged').length,
    };

    // 6. Filter by tab
    let filteredUsers = usersWithEmail;
    switch (tab) {
      case 'unmerged':
        filteredUsers = usersWithEmail.filter(u => u.merge_status === 'none');
        break;
      case 'pending':
        filteredUsers = usersWithEmail.filter(u => u.merge_status === 'pending');
        break;
      case 'provisioned':
        filteredUsers = usersWithEmail.filter(u => u.merge_status === 'provisioned');
        break;
      case 'merged':
        filteredUsers = usersWithEmail.filter(u => u.merge_status === 'merged');
        break;
    }

    console.log('Returning', filteredUsers.length, 'users for tab:', tab);

    return new Response(
      JSON.stringify({ users: filteredUsers.slice(0, limit), stats }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-get-users-for-merge:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
