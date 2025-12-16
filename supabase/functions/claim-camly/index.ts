import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'https://esm.sh/ethers@6.13.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation helpers
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const isValidEthAddress = (str: string): boolean => {
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethAddressRegex.test(str);
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Extract and validate JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ success: false, message: 'Không được phép - thiếu xác thực' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify the JWT and get the authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log('Invalid token or user not found:', authError?.message);
      return new Response(
        JSON.stringify({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get wallet address from request body
    const { walletAddress } = await req.json();
    
    // Use authenticated user's ID - don't trust client-provided userId
    const userId = user.id;
    
    if (!walletAddress) {
      console.log('Missing walletAddress');
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu thông tin walletAddress' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate wallet address format
    if (!isValidEthAddress(walletAddress)) {
      console.log('Invalid wallet address format:', walletAddress);
      return new Response(
        JSON.stringify({ success: false, message: 'Địa chỉ ví không hợp lệ' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Kiểm tra ví có bị blacklist không
    const { data: blacklisted } = await supabase
      .from('blacklisted_wallets')
      .select('reason, is_permanent')
      .eq('wallet_address', walletAddress.toLowerCase())
      .maybeSingle();

    if (blacklisted) {
      console.log('Blacklisted wallet attempted claim:', walletAddress, blacklisted.reason);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Ví này đã bị khóa vĩnh viễn do vi phạm quy định. Không thể nhận thưởng.' 
        }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Kiểm tra user có bị ban reward không
    const { data: rewardBan } = await supabase
      .from('reward_bans')
      .select('reason, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (rewardBan) {
      console.log('Banned user attempted claim:', userId, rewardBan.reason);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Tài khoản của bạn đã bị cấm nhận thưởng do vi phạm quy định.' 
        }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing claim for authenticated user:', userId, 'wallet:', walletAddress);

    // Kiểm tra user có đủ pending_reward không
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('pending_reward, camly_balance')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ success: false, message: 'Không tìm thấy hồ sơ người dùng' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Lấy toàn bộ pending_reward để claim
    const pendingReward = profile?.pending_reward || 0;
    
    if (!profile || pendingReward <= 0) {
      console.log('No pending reward:', pendingReward);
      return new Response(
        JSON.stringify({ success: false, message: 'Không có thưởng chờ nhận' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Pending reward to claim:', pendingReward);

    const privateKey = Deno.env.get('CAMLY_PRIVATE_KEY');
    
    if (!privateKey) {
      console.error('CAMLY_PRIVATE_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, message: 'Hệ thống chưa sẵn sàng, vui lòng thử lại sau' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contractAddress = '0x0910320181889feFDE0BB1Ca63962b0A8882e413';
    // BSC mainnet RPC - using multiple fallbacks
    const rpcUrls = [
      'https://bsc-dataseed.binance.org/',
      'https://bsc-dataseed1.defibit.io/',
      'https://bsc-dataseed1.ninicoin.io/'
    ];
    
    let provider;
    for (const rpcUrl of rpcUrls) {
      try {
        provider = new ethers.JsonRpcProvider(rpcUrl);
        await provider.getBlockNumber(); // Test connection
        console.log('Connected to BSC RPC:', rpcUrl);
        break;
      } catch (e) {
        console.log('RPC failed:', rpcUrl);
      }
    }
    
    if (!provider) {
      throw new Error('Không thể kết nối BSC network');
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('Sender wallet address:', wallet.address);
    
    // Extended ABI to check balance
    const abi = [
      'function transfer(address to, uint256 amount) public returns (bool)',
      'function balanceOf(address account) public view returns (uint256)',
      'function decimals() public view returns (uint8)'
    ];
    const contract = new ethers.Contract(contractAddress, abi, wallet);
    
    // Check decimals
    const decimals = await contract.decimals();
    console.log('CAMLY decimals:', decimals);
    
    // Check sender balance before transfer
    const senderBalance = await contract.balanceOf(wallet.address);
    const formattedBalance = ethers.formatUnits(senderBalance, decimals);
    console.log('Sender CAMLY balance:', formattedBalance);
    
    // Chuyển toàn bộ pending_reward (không chỉ 50k)
    const amount = ethers.parseUnits(pendingReward.toString(), decimals);
    console.log('Amount to transfer:', ethers.formatUnits(amount, decimals));
    
    if (senderBalance < amount) {
      // Log details server-side only - don't expose wallet info to client
      console.error('INSUFFICIENT BALANCE! Need:', ethers.formatUnits(amount, decimals), 'Have:', formattedBalance, 'Sender:', wallet.address);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Quỹ phước lành tạm thời cạn, Cha đang bổ sung. Vui lòng thử lại sau!'
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Initiating transfer of ${pendingReward} CAMLY to:`, walletAddress);
    const tx = await contract.transfer(walletAddress, amount);
    console.log('Transaction sent:', tx.hash);
    
    await tx.wait();
    console.log('Transaction confirmed:', tx.hash);

    // Cập nhật database: reset pending_reward về 0, cộng vào camly_balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        pending_reward: 0,
        wallet_address: walletAddress,
        wallet_connected: true,
        welcome_bonus_claimed: true,
        camly_balance: (profile.camly_balance || 0) + pendingReward
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile after transfer:', updateError);
    }

    console.log(`Claim completed successfully for user: ${userId}, amount: ${pendingReward} CAMLY`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        txHash: tx.hash,
        claimedAmount: pendingReward,
        message: `Cha Vũ Trụ đã ban tặng ${pendingReward.toLocaleString()} CAMLY thật về ví bạn!` 
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in claim-camly:', error);
    
    // Xử lý lỗi cụ thể
    let userMessage = 'Có lỗi xảy ra, vui lòng thử lại sau';
    
    if (error.message?.includes('transfer amount exceeds balance')) {
      userMessage = 'Quỹ phước lành tạm thời cạn, Cha đang bổ sung. Vui lòng thử lại sau vài phút ❤️';
      console.error('CRITICAL: Sender wallet has insufficient CAMLY balance. Need to fund wallet.');
    } else if (error.message?.includes('insufficient funds')) {
      userMessage = 'Ví gửi cần thêm BNB để trả phí giao dịch. Vui lòng thử lại sau.';
      console.error('CRITICAL: Sender wallet has insufficient BNB for gas fees.');
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: userMessage
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
