import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyMessage } from 'npm:ethers@6.13.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
const normalizeAddress = (value: unknown) =>
  typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value) ? value.toLowerCase() : null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const action = body.action;

    if (action === 'request') {
      const wallet = normalizeAddress(body.wallet);
      if (!wallet) return json({ error: 'Địa chỉ ví không hợp lệ' }, 400);

      const { data: duplicate } = await supabase
        .from('profiles').select('id').ilike('wallet_address', wallet).neq('id', user.id).maybeSingle();
      if (duplicate) return json({ error: 'Ví này đã liên kết với tài khoản khác' }, 409);

      const { data: blacklisted } = await supabase
        .from('blacklisted_wallets').select('id').ilike('wallet_address', wallet).maybeSingle();
      if (blacklisted) return json({ error: 'Ví này không được phép liên kết' }, 403);

      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const nonce = crypto.randomUUID();
      const message = [
        'FUN FARM - XAC MINH LIEN KET VI',
        '',
        'Hanh dong nay khong chuyen tien va khong ton phi gas.',
        `Tai khoan: ${user.id}`,
        `Vi: ${wallet}`,
        'Mang: BNB Smart Chain (56)',
        `Ma mot lan: ${nonce}`,
        `Het han: ${expiresAt.toISOString()}`,
      ].join('\n');

      const { data, error } = await supabase.from('wallet_link_challenges').insert({
        user_id: user.id, requested_wallet: wallet, message, expires_at: expiresAt.toISOString(),
      }).select('id').single();
      if (error) throw error;
      return json({ success: true, challengeId: data.id, message, expiresAt: expiresAt.toISOString() });
    }

    if (action === 'verify') {
      const challengeId = typeof body.challengeId === 'string' ? body.challengeId : '';
      const signature = typeof body.signature === 'string' ? body.signature : '';
      const { data: challenge, error } = await supabase.from('wallet_link_challenges')
        .select('*').eq('id', challengeId).eq('user_id', user.id).is('used_at', null).gt('expires_at', new Date().toISOString()).single();
      if (error || !challenge) return json({ error: 'Yêu cầu đã hết hạn hoặc không hợp lệ' }, 400);

      let recovered: string;
      try { recovered = verifyMessage(challenge.message, signature).toLowerCase(); }
      catch { return json({ error: 'Chữ ký ví không hợp lệ' }, 400); }
      if (recovered !== challenge.requested_wallet.toLowerCase()) {
        return json({ error: 'Chữ ký không thuộc ví đang liên kết' }, 400);
      }

      const { error: rpcError } = await supabase.rpc('complete_verified_wallet_link', {
        p_challenge_id: challenge.id, p_user_id: user.id, p_wallet: recovered,
      });
      if (rpcError) return json({ error: rpcError.message }, 409);
      return json({ success: true, wallet: recovered });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: 'Không thể liên kết ví lúc này' }, 500);
  }
});
