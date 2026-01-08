import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-fun-profile-webhook, x-fun-signature',
};

interface WebhookPayload {
  event: 'merge_completed' | 'merge_rejected' | 'merge_conflict' | 'account_provisioned';
  request_id: string;
  email: string;
  fun_profile_id?: string;
  fun_id?: string;
  profile_data?: {
    display_name?: string;
    avatar_url?: string;
    wallet_address?: string;
    is_verified?: boolean;
  };
  error_message?: string;
  conflict_type?: string;
  provision_status?: 'pending_password_set';
}

// HMAC-SHA256 signature verification
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook header
    const webhookHeader = req.headers.get('x-fun-profile-webhook');
    if (webhookHeader !== 'true') {
      console.warn('Invalid webhook header');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook request' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const funProfileClientSecret = Deno.env.get('FUN_PROFILE_CLIENT_SECRET');

    if (!funProfileClientSecret) {
      console.error('FUN_PROFILE_CLIENT_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify signature
    const signature = req.headers.get('x-fun-signature');
    const rawBody = await req.text();
    
    if (!signature || !await verifySignature(rawBody, signature, funProfileClientSecret)) {
      console.warn('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: WebhookPayload = JSON.parse(rawBody);
    console.log('Received webhook:', payload.event, payload.email);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, fun_profile_id, is_merged, display_name, avatar_url')
      .eq('email', payload.email)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found for email:', payload.email);
      return new Response(
        JSON.stringify({ error: 'Profile not found', email: payload.email }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (payload.event) {
      case 'merge_completed': {
        // Check for conflicts before merging
        if (payload.fun_profile_id) {
          const { data: existingWithFunProfileId } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('fun_profile_id', payload.fun_profile_id)
            .neq('id', profile.id)
            .single();

          if (existingWithFunProfileId) {
            // Create conflict record
            await supabase.from('merge_conflicts').insert({
              user_id: profile.id,
              user_email: payload.email,
              conflicting_user_id: existingWithFunProfileId.id,
              conflicting_user_email: existingWithFunProfileId.email,
              fun_profile_id: payload.fun_profile_id,
              fun_id: payload.fun_id,
              conflict_type: 'duplicate_fun_profile_id',
              conflict_details: { original_request: payload },
            });

            // Update merge log
            await supabase
              .from('merge_request_logs')
              .update({
                status: 'conflict',
                webhook_received_at: new Date().toISOString(),
                error_message: `Conflict: fun_profile_id already assigned to user ${existingWithFunProfileId.id}`,
              })
              .eq('email', payload.email)
              .eq('request_id', payload.request_id);

            console.log('Conflict detected for:', payload.email);
            return new Response(
              JSON.stringify({ success: true, status: 'conflict_logged' }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Update profile with merge data
        const updateData: Record<string, unknown> = {
          fun_profile_id: payload.fun_profile_id,
          is_merged: true,
          merged_at: new Date().toISOString(),
          merge_request_id: null, // Clear pending request
        };

        // Optionally update profile data from Fun Profile
        if (payload.profile_data) {
          if (payload.profile_data.display_name && !profile.display_name) {
            updateData.display_name = payload.profile_data.display_name;
          }
          if (payload.profile_data.avatar_url && !profile.avatar_url) {
            updateData.avatar_url = payload.profile_data.avatar_url;
          }
          if (payload.profile_data.is_verified) {
            updateData.is_verified = true;
          }
        }

        // Also update fun_id if provided
        if (payload.fun_id) {
          updateData.fun_id = payload.fun_id;
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', profile.id);

        if (updateError) {
          console.error('Error updating profile:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update profile' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update merge log
        await supabase
          .from('merge_request_logs')
          .update({
            status: 'completed',
            fun_profile_id: payload.fun_profile_id,
            webhook_received_at: new Date().toISOString(),
          })
          .eq('email', payload.email)
          .eq('request_id', payload.request_id);

        console.log('Merge completed for:', payload.email);
        break;
      }

      case 'merge_rejected': {
        // Clear merge request and log rejection
        await supabase
          .from('profiles')
          .update({ merge_request_id: null })
          .eq('id', profile.id);

        await supabase
          .from('merge_request_logs')
          .update({
            status: 'rejected',
            webhook_received_at: new Date().toISOString(),
            error_message: payload.error_message || 'Merge rejected by Fun Profile',
          })
          .eq('email', payload.email)
          .eq('request_id', payload.request_id);

        console.log('Merge rejected for:', payload.email);
        break;
      }

      case 'merge_conflict': {
        // Log conflict from Fun Profile
        await supabase.from('merge_conflicts').insert({
          user_id: profile.id,
          user_email: payload.email,
          fun_profile_id: payload.fun_profile_id || '',
          fun_id: payload.fun_id,
          conflict_type: payload.conflict_type || 'duplicate_email',
          conflict_details: { original_request: payload },
        });

        await supabase
          .from('merge_request_logs')
          .update({
            status: 'conflict',
            webhook_received_at: new Date().toISOString(),
            error_message: payload.error_message,
          })
          .eq('email', payload.email)
          .eq('request_id', payload.request_id);

        console.log('Conflict logged for:', payload.email);
        break;
      }

      case 'account_provisioned': {
        // Fun Profile đã tạo account mới, chờ user set password
        console.log('Account provisioned for:', payload.email, payload.fun_profile_id);

        // Update merge_request_logs status to provisioned
        await supabase
          .from('merge_request_logs')
          .update({
            status: 'provisioned',
            fun_profile_id: payload.fun_profile_id,
            webhook_received_at: new Date().toISOString(),
          })
          .eq('email', payload.email)
          .eq('request_id', payload.request_id);

        // Send notification to user
        await supabase.from('notifications').insert({
          user_id: profile.id,
          type: 'account_provisioned',
          content: '🎉 Tài khoản Fun-ID đã được tạo! Vui lòng kiểm tra email để đặt mật khẩu và hoàn tất kết nối.',
        });

        console.log('Provisioned notification sent to:', profile.id);
        break;
      }

      default:
        console.warn('Unknown webhook event:', payload.event);
    }

    return new Response(
      JSON.stringify({ success: true, event: payload.event }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fun-profile-webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
