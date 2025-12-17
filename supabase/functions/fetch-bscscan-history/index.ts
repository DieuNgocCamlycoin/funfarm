import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CAMLY Token contract address on BSC
const CAMLY_CONTRACT = "0x3a1311B8C404629E38f61D566cefEaEd8Da1c0C8";
// Wallet that sends CAMLY rewards
const SENDER_WALLET = "0xBBa78598Be65520DD892C771Cf17B8D53aFfF68c";

interface TokenTransfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('BSCSCAN_API_KEY');
    if (!apiKey) {
      throw new Error('BSCSCAN_API_KEY not configured');
    }

    console.log('Fetching token transfers from BscScan...');
    console.log('CAMLY Contract:', CAMLY_CONTRACT);
    console.log('Sender Wallet:', SENDER_WALLET);

    // Fetch token transfers from sender wallet
    const url = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${CAMLY_CONTRACT}&address=${SENDER_WALLET}&page=1&offset=10000&sort=desc&apikey=${apiKey}`;
    
    console.log('Fetching from BscScan API...');
    const response = await fetch(url);
    const data = await response.json();

    console.log('BscScan response status:', data.status);
    console.log('BscScan message:', data.message);

    if (data.status !== '1') {
      console.log('BscScan API error or no data:', data.message);
      return new Response(JSON.stringify({ 
        transfers: [],
        aggregated: {},
        message: data.message || 'No transfers found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const transfers: TokenTransfer[] = data.result || [];
    console.log(`Found ${transfers.length} total transfers`);

    // Filter only outgoing transfers from sender wallet (claims)
    const claimTransfers = transfers.filter(tx => 
      tx.from.toLowerCase() === SENDER_WALLET.toLowerCase()
    );
    console.log(`Found ${claimTransfers.length} claim transfers`);

    // Aggregate by receiver wallet
    const aggregated: Record<string, { 
      totalClaimed: number; 
      transactions: number;
      lastClaimAt: string;
      walletAddress: string;
    }> = {};

    for (const tx of claimTransfers) {
      const receiver = tx.to.toLowerCase();
      const amount = parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal || '18'));
      
      if (!aggregated[receiver]) {
        aggregated[receiver] = {
          totalClaimed: 0,
          transactions: 0,
          lastClaimAt: '',
          walletAddress: tx.to,
        };
      }
      
      aggregated[receiver].totalClaimed += amount;
      aggregated[receiver].transactions += 1;
      
      // Keep track of latest claim
      const txTime = new Date(parseInt(tx.timeStamp) * 1000).toISOString();
      if (!aggregated[receiver].lastClaimAt || txTime > aggregated[receiver].lastClaimAt) {
        aggregated[receiver].lastClaimAt = txTime;
      }
    }

    console.log(`Aggregated ${Object.keys(aggregated).length} unique wallets`);

    // Sort by total claimed descending
    const sortedAggregated = Object.entries(aggregated)
      .sort(([, a], [, b]) => b.totalClaimed - a.totalClaimed)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as typeof aggregated);

    return new Response(JSON.stringify({ 
      transfers: claimTransfers.slice(0, 100), // Return last 100 transactions
      aggregated: sortedAggregated,
      totalTransfers: claimTransfers.length,
      totalWallets: Object.keys(aggregated).length,
      totalClaimed: Object.values(aggregated).reduce((sum, w) => sum + w.totalClaimed, 0)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error fetching BscScan data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

