import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Contract CAMLY và ví trả thưởng
const CAMLY_CONTRACT = '0x3a1311b8c404629e38f61d566cefeaed8da1c0c8';
const SENDER_WALLET = '0xbba78598be65520dd892c771cf17b8d53afff68c';

interface MoralisTransfer {
  from_address: string;
  to_address: string;
  value: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

interface TokenTransfer {
  blockNumber: number;
  transactionHash: string;
  from: string;
  to: string;
  value: string;
  timestamp: string;
}

interface WalletData {
  totalClaimed: string;
  transactions: number;
  lastClaimAt: string;
}

async function getCamlyClaimsFromMoralis(): Promise<TokenTransfer[]> {
  const MORALIS_API_KEY = Deno.env.get('MORALIS_API_KEY');
  
  if (!MORALIS_API_KEY) {
    throw new Error('MORALIS_API_KEY not configured');
  }

  const transfers: TokenTransfer[] = [];
  let cursor: string | undefined = undefined;
  const limit = 100;

  const headers = {
    'X-API-Key': MORALIS_API_KEY,
    'accept': 'application/json'
  };

  let pageCount = 0;
  const maxPages = 50; // Giới hạn số trang để tránh quá nhiều requests

  do {
    const params = new URLSearchParams({
      chain: 'bsc',
      limit: limit.toString(),
      order: 'DESC',
    });

    if (cursor) {
      params.append('cursor', cursor);
    }

    try {
      const url = `https://deep-index.moralis.io/api/v2.2/erc20/${CAMLY_CONTRACT}/transfers?${params.toString()}`;
      console.log(`Fetching page ${pageCount + 1} from Moralis...`);
      
      const response = await fetch(url, { 
        headers, 
        signal: AbortSignal.timeout(30000) 
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Moralis API error:', response.status, errorText);
        throw new Error(`Moralis API error: ${response.status}`);
      }

      const data = await response.json();
      const results: MoralisTransfer[] = data.result || [];

      // Filter chỉ các transfer FROM ví trả thưởng (claim thực sự)
      const claimTransfers = results
        .filter(t => t.from_address.toLowerCase() === SENDER_WALLET.toLowerCase())
        .map(t => ({
          blockNumber: parseInt(t.block_number),
          transactionHash: t.transaction_hash,
          from: t.from_address,
          to: t.to_address,
          value: t.value,
          timestamp: t.block_timestamp
        }));

      transfers.push(...claimTransfers);
      console.log(`Page ${pageCount + 1}: found ${claimTransfers.length} claims, total: ${transfers.length}`);

      cursor = data.cursor || undefined;
      pageCount++;

      // Delay nhẹ để an toàn
      if (cursor && pageCount < maxPages) {
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (error: any) {
      console.error('Moralis API error:', error.message);
      break;
    }
  } while (cursor && pageCount < maxPages);

  console.log(`Total claims fetched from Moralis: ${transfers.length}`);
  return transfers;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Moralis fetch for CAMLY transfers...');
    console.log('Contract:', CAMLY_CONTRACT);
    console.log('Sender wallet:', SENDER_WALLET);

    const transfers = await getCamlyClaimsFromMoralis();

    // Aggregate by wallet
    const walletMap: Record<string, WalletData> = {};
    const decimals = 18; // CAMLY có 18 decimals

    for (const tx of transfers) {
      const receiver = tx.to.toLowerCase();
      
      if (!walletMap[receiver]) {
        walletMap[receiver] = {
          totalClaimed: '0',
          transactions: 0,
          lastClaimAt: tx.timestamp
        };
      }

      // Add to total (BigInt math)
      const current = BigInt(walletMap[receiver].totalClaimed);
      const adding = BigInt(tx.value);
      walletMap[receiver].totalClaimed = (current + adding).toString();
      walletMap[receiver].transactions += 1;

      // Update last claim if this is more recent
      if (tx.timestamp > walletMap[receiver].lastClaimAt) {
        walletMap[receiver].lastClaimAt = tx.timestamp;
      }
    }

    // Convert to array and format
    const aggregatedArray = Object.entries(walletMap).map(([wallet, data]) => {
      // Convert from wei to token units
      const totalInWei = BigInt(data.totalClaimed);
      const divisor = BigInt(10 ** decimals);
      const wholePart = totalInWei / divisor;
      const decimalPart = totalInWei % divisor;
      const formattedTotal = `${wholePart}.${decimalPart.toString().padStart(decimals, '0').slice(0, 4)}`;

      return {
        wallet,
        walletAddress: wallet,
        totalClaimed: parseFloat(formattedTotal),
        totalClaimedRaw: data.totalClaimed,
        transactions: data.transactions,
        lastClaimAt: data.lastClaimAt
      };
    }).sort((a, b) => b.totalClaimed - a.totalClaimed);

    // Convert back to object format for compatibility
    const aggregatedObject: Record<string, any> = {};
    for (const item of aggregatedArray) {
      aggregatedObject[item.wallet] = {
        totalClaimed: item.totalClaimed,
        transactions: item.transactions,
        lastClaimAt: item.lastClaimAt,
        walletAddress: item.walletAddress
      };
    }

    // Calculate summary
    const totalClaimedAll = aggregatedArray.reduce((sum, w) => sum + w.totalClaimed, 0);
    const uniqueWallets = aggregatedArray.length;
    const totalTransactions = transfers.length;

    console.log(`Summary: ${uniqueWallets} wallets, ${totalTransactions} transactions, ${totalClaimedAll.toFixed(2)} CAMLY total`);

    return new Response(JSON.stringify({
      transfers: transfers.slice(0, 100).map(t => ({
        ...t,
        value: (parseFloat(t.value) / Math.pow(10, decimals)).toFixed(4)
      })),
      aggregated: aggregatedObject,
      totalTransfers: totalTransactions,
      totalWallets: uniqueWallets,
      totalClaimed: totalClaimedAll,
      dataSource: 'Moralis API'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({
      error: error.message,
      transfers: [],
      aggregated: {},
      hint: 'Vui lòng kiểm tra MORALIS_API_KEY đã được cấu hình đúng chưa.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
