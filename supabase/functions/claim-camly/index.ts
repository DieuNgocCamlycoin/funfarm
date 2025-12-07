import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'https://esm.sh/ethers@6.13.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { userId, walletAddress } = await req.json();
    
    if (!userId || !walletAddress) {
      console.log('Missing data - userId:', userId, 'walletAddress:', walletAddress);
      return new Response(
        JSON.stringify({ success: false, message: 'Thiếu thông tin userId hoặc walletAddress' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing claim for user:', userId, 'wallet:', walletAddress);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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

    if (!profile || profile.pending_reward < 50000) {
      console.log('Insufficient pending reward:', profile?.pending_reward);
      return new Response(
        JSON.stringify({ success: false, message: 'Không đủ thưởng chờ nhận' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const privateKey = Deno.env.get('CAMLY_PRIVATE_KEY');
    
    if (!privateKey) {
      console.error('CAMLY_PRIVATE_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, message: 'Hệ thống chưa sẵn sàng, vui lòng thử lại sau' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contractAddress = '0x0910320181889feFDE0BB1Ca63962b0A8882e413';
    // Use free public RPC that doesn't require API key
    const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
    const wallet = new ethers.Wallet(privateKey, provider);
    const abi = ['function transfer(address to, uint256 amount) public returns (bool)'];
    const contract = new ethers.Contract(contractAddress, abi, wallet);
    const amount = ethers.parseUnits('50000', 18);

    console.log('Initiating transfer of 50000 CAMLY to:', walletAddress);

    const tx = await contract.transfer(walletAddress, amount);
    console.log('Transaction sent:', tx.hash);
    
    await tx.wait();
    console.log('Transaction confirmed:', tx.hash);

    // Cập nhật database: trừ pending_reward, cộng vào camly_balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        pending_reward: 0,
        wallet_address: walletAddress,
        wallet_connected: true,
        camly_balance: (profile.camly_balance || 0) + 50000
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile after transfer:', updateError);
    }

    console.log('Claim completed successfully for user:', userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        txHash: tx.hash,
        message: 'Cha Vũ Trụ đã ban tặng 50.000 CAMLY thật về ví bạn!' 
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in claim-camly:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Có lỗi xảy ra, vui lòng thử lại sau' 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
