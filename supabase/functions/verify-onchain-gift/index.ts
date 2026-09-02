import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHAIN_ID = 56;
const MIN_CONFIRMATIONS = 3;
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const TOKENS: Record<string, { address: string | null; decimals: number }> = {
  BNB: { address: null, decimals: 18 },
  CAMLY: { address: '0x0910320181889fefde0bb1ca63962b0a8882e413', decimals: 3 },
  USDT: { address: '0x55d398326f99059ff775485246999027b3197955', decimals: 18 },
  BTCB: { address: '0x7130d2a12b9bcba8f4f2634d864a1ee1ce3ead9c', decimals: 18 },
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const normalizeAddress = (value: unknown) =>
  typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value) ? value.toLowerCase() : null;

const normalizeHash = (value: unknown) =>
  typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value) ? value.toLowerCase() : null;

const parseAmount = (value: unknown, decimals: number) => {
  const input = typeof value === 'string' ? value.trim() : '';
  if (!/^\d+(\.\d+)?$/.test(input)) return null;
  const [whole, fraction = ''] = input.split('.');
  if (fraction.length > decimals) return null;
  const atomic = BigInt(whole) * (10n ** BigInt(decimals))
    + BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals));
  if (atomic <= 0n) return null;
  return { display: input, atomic };
};

const rpc = async (method: string, params: unknown[]) => {
  const endpoint = Deno.env.get('BSC_RPC_URL') || 'https://bsc-dataseed.bnbchain.org';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`BSC RPC HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || 'BSC RPC error');
  return payload.result;
};

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
    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const txHash = normalizeHash(body.txHash);
    const currency = body.currency === 'CLC' ? 'CAMLY' : String(body.currency || '').toUpperCase();
    const tokenConfig = TOKENS[currency];
    const receiverId = typeof body.receiverId === 'string' ? body.receiverId : '';
    const parsedAmount = tokenConfig ? parseAmount(body.amount, tokenConfig.decimals) : null;
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : null;

    if (!txHash || !tokenConfig || !parsedAmount || !/^[0-9a-f-]{36}$/i.test(receiverId)) {
      return json({ error: 'Invalid verification request' }, 400);
    }
    if (receiverId === user.id) return json({ error: 'Cannot gift yourself' }, 400);

    const { data: existing } = await supabase
      .from('wallet_transactions')
      .select('id')
      .ilike('tx_hash', txHash)
      .maybeSingle();
    if (existing) return json({ error: 'Transaction already recorded' }, 409);

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, wallet_address, display_name')
      .in('id', [user.id, receiverId]);
    if (profileError) throw profileError;

    const sender = profiles?.find((profile) => profile.id === user.id);
    const receiver = profiles?.find((profile) => profile.id === receiverId);
    const senderWallet = normalizeAddress(sender?.wallet_address);
    const receiverWallet = normalizeAddress(receiver?.wallet_address);
    if (!senderWallet || !receiverWallet) return json({ error: 'Both users must connect a valid wallet' }, 400);

    const [transaction, receipt, latestBlockHex] = await Promise.all([
      rpc('eth_getTransactionByHash', [txHash]),
      rpc('eth_getTransactionReceipt', [txHash]),
      rpc('eth_blockNumber', []),
    ]);
    if (!transaction || !receipt) return json({ error: 'Transaction is not mined yet' }, 409);
    if (receipt.status !== '0x1') return json({ error: 'Transaction failed on BSC' }, 400);
    if (normalizeAddress(transaction.from) !== senderWallet) return json({ error: 'Sender wallet mismatch' }, 400);

    const blockNumber = Number(BigInt(receipt.blockNumber));
    const confirmations = Number(BigInt(latestBlockHex) - BigInt(receipt.blockNumber) + 1n);
    if (confirmations < MIN_CONFIRMATIONS) {
      return json({ error: `Waiting for ${MIN_CONFIRMATIONS} confirmations`, confirmations }, 409);
    }

    if (currency === 'BNB') {
      if (normalizeAddress(transaction.to) !== receiverWallet || BigInt(transaction.value) !== parsedAmount.atomic) {
        return json({ error: 'BNB recipient or amount mismatch' }, 400);
      }
    } else {
      const expectedToken = tokenConfig.address!;
      const matchingLog = (receipt.logs || []).find((log: Record<string, unknown>) => {
        const topics = Array.isArray(log.topics) ? log.topics as string[] : [];
        const from = topics[1]?.slice(-40).toLowerCase();
        const to = topics[2]?.slice(-40).toLowerCase();
        return normalizeAddress(log.address) === expectedToken
          && topics[0]?.toLowerCase() === TRANSFER_TOPIC
          && from === senderWallet.slice(2)
          && to === receiverWallet.slice(2)
          && typeof log.data === 'string'
          && BigInt(log.data) === parsedAmount.atomic;
      });
      if (!matchingLog) return json({ error: 'Verified token transfer not found in receipt' }, 400);
    }

    const legacyScale = 10n ** BigInt(Math.max(tokenConfig.decimals - 8, 0));
    const legacyAmount = (parsedAmount.atomic / legacyScale).toString();
    const { data: recorded, error: insertError } = await supabase
      .from('wallet_transactions')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        amount: legacyAmount,
        amount_decimal: parsedAmount.display,
        amount_atomic: parsedAmount.atomic.toString(),
        currency,
        message: message || null,
        tx_hash: txHash,
        status: 'verified',
        chain_id: CHAIN_ID,
        token_address: tokenConfig.address,
        from_wallet: senderWallet,
        to_wallet: receiverWallet,
        block_number: blockNumber,
        confirmations,
        verified_at: new Date().toISOString(),
        verification_source: 'bsc-json-rpc',
      })
      .select('id, tx_hash, status, confirmations')
      .single();
    if (insertError) throw insertError;

    await supabase.from('notifications').insert({
      user_id: receiverId,
      from_user_id: user.id,
      type: 'gift',
      content: `${sender?.display_name || 'Ai đó'} đã tặng bạn ${parsedAmount.display} ${currency} on-chain`,
    });

    return json({ success: true, transaction: recorded });
  } catch (error) {
    console.error('verify-onchain-gift:', error);
    return json({ error: error instanceof Error ? error.message : 'Verification failed' }, 500);
  }
});
