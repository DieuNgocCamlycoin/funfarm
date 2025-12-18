import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Contract CAMLY và ví trả thưởng
const CAMLY_CONTRACT = '0x0910320181889fefde0bb1ca63962b0a8882e413';
const SENDER_WALLET = '0xbba78598be65520dd892c771cf17b8d53afff68c';

interface MoralisTransfer {
  from_address: string;
  to_address: string;
  value: string;
  value_decimal?: string; // Moralis có thể trả về field này
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

      // Log first result to debug structure
      if (pageCount === 0 && results.length > 0) {
        console.log('First result sample:', JSON.stringify(results[0]));
        console.log('Available keys:', Object.keys(results[0]));
      }

      // Filter chỉ các transfer FROM ví trả thưởng (claim thực sự)
      const claimTransfers = results
        .filter(t => t.from_address.toLowerCase() === SENDER_WALLET.toLowerCase())
        .map(t => {
          // Moralis trả về value_decimal là số token thực tế (đã chia decimals)
          // value là raw value nhưng với decimals của token (có thể 4, 6, 18...)
          // Sử dụng value_decimal để lấy số CAMLY chính xác
          const actualValue = t.value_decimal || t.value || '0';
          
          // Log chi tiết để debug
          if (transfers.length < 5) {
            console.log(`Transfer: value="${t.value}", value_decimal="${t.value_decimal}", using: ${actualValue}, to: ${t.to_address}`);
          }
          
          return {
            blockNumber: parseInt(t.block_number),
            transactionHash: t.transaction_hash,
            from: t.from_address,
            to: t.to_address,
            value: actualValue, // Số CAMLY thực tế
            timestamp: t.block_timestamp
          };
        });

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

    for (const tx of transfers) {
      const receiver = tx.to.toLowerCase();
      
      if (!walletMap[receiver]) {
        walletMap[receiver] = {
          totalClaimed: '0',
          transactions: 0,
          lastClaimAt: tx.timestamp
        };
      }

      // value_decimal từ Moralis đã là số CAMLY thực tế
      // Cộng dồn trực tiếp (dùng number vì giá trị không quá lớn)
      const current = parseFloat(walletMap[receiver].totalClaimed) || 0;
      const adding = parseFloat(tx.value) || 0;
      walletMap[receiver].totalClaimed = (current + adding).toString();
      walletMap[receiver].transactions += 1;

      // Update last claim if this is more recent
      if (tx.timestamp > walletMap[receiver].lastClaimAt) {
        walletMap[receiver].lastClaimAt = tx.timestamp;
      }
    }

    // Convert to array and format
    const aggregatedArray = Object.entries(walletMap).map(([wallet, data]) => {
      const totalClaimed = parseFloat(data.totalClaimed) || 0;

      return {
        wallet,
        walletAddress: wallet,
        totalClaimed: totalClaimed,
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

    console.log(`Summary: ${uniqueWallets} wallets, ${totalTransactions} transactions, ${totalClaimedAll.toLocaleString()} CAMLY total`);

    return new Response(JSON.stringify({
      transfers: transfers.slice(0, 100).map(t => ({
        ...t,
        value: parseFloat(t.value) || 0 // Đã là số CAMLY thực tế
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
