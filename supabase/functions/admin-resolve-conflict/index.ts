import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResolvePayload {
  conflict_id: string;
  action: 'keep_existing' | 'replace_existing' | 'manual_merge' | 'dismissed';
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify authorization
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

    const payload: ResolvePayload = await req.json();
    const { conflict_id, action, notes } = payload;

    if (!conflict_id || !action) {
      return new Response(
        JSON.stringify({ error: 'conflict_id and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the conflict
    const { data: conflict, error: fetchError } = await supabase
      .from('merge_conflicts')
      .select('*')
      .eq('id', conflict_id)
      .single();

    if (fetchError || !conflict) {
      return new Response(
        JSON.stringify({ error: 'Conflict not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (conflict.resolved) {
      return new Response(
        JSON.stringify({ error: 'Conflict already resolved' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle resolution based on action
    switch (action) {
      case 'keep_existing': {
        // Keep the existing user's fun_profile_id, clear the new user's merge request
        if (conflict.user_id) {
          await supabase
            .from('profiles')
            .update({ merge_request_id: null })
            .eq('id', conflict.user_id);
        }
        break;
      }

      case 'replace_existing': {
        // Remove fun_profile_id from conflicting user and assign to new user
        if (conflict.conflicting_user_id) {
          await supabase
            .from('profiles')
            .update({ 
              fun_profile_id: null, 
              is_merged: false,
              merged_at: null 
            })
            .eq('id', conflict.conflicting_user_id);
        }

        if (conflict.user_id) {
          await supabase
            .from('profiles')
            .update({ 
              fun_profile_id: conflict.fun_profile_id,
              fun_id: conflict.fun_id,
              is_merged: true,
              merged_at: new Date().toISOString(),
              merge_request_id: null 
            })
            .eq('id', conflict.user_id);
        }
        break;
      }

      case 'manual_merge': {
        // Just mark as resolved, admin will handle manually
        console.log('Manual merge requested for conflict:', conflict_id);
        break;
      }

      case 'dismissed': {
        // Clear merge request, no action taken
        if (conflict.user_id) {
          await supabase
            .from('profiles')
            .update({ merge_request_id: null })
            .eq('id', conflict.user_id);
        }
        break;
      }
    }

    // Update conflict record
    const { error: updateError } = await supabase
      .from('merge_conflicts')
      .update({
        resolved: true,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        resolution_action: action,
        resolution_notes: notes || null,
      })
      .eq('id', conflict_id);

    if (updateError) {
      console.error('Error updating conflict:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update conflict' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Conflict resolved:', conflict_id, action);

    return new Response(
      JSON.stringify({ success: true, action, conflict_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-resolve-conflict:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
