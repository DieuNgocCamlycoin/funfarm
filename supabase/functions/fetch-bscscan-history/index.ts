import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Contract CAMLY và ví trả thưởng
const CAMLY_CONTRACT = '0x0910320181889fefde0bb1ca63962b0a8882e413';
const SENDER_WALLET = '0xbba78598be65520dd892c771cf17b8d53afff68c';

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

// Lấy cached data từ database
async function getCachedData(supabase: any) {
  try {
    const { data, error } = await supabase
      .from('blockchain_cache')
      .select('*')
      .eq('id', 'camly_claims')
      .single();
    
    if (error) {
      console.log('No cached data found:', error.message);
      return null;
    }
    
    return data;
  } catch (e: any) {
    console.error('Error fetching cache:', e.message);
    return null;
  }
}

// Lưu data vào cache
async function saveCacheData(supabase: any, data: any) {
  try {
    const { error } = await supabase
      .from('blockchain_cache')
      .upsert({
        id: 'camly_claims',
        total_claimed: data.totalClaimed,
        total_wallets: data.totalWallets,
        total_transactions: data.totalTransfers,
        wallets_with_names: data.walletsWithNames,
        aggregated_data: data.aggregated,
        transfers_sample: data.transfers,
        last_updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error saving cache:', error.message);
    } else {
      console.log('Cache updated successfully');
    }
  } catch (e: any) {
    console.error('Error saving cache:', e.message);
  }
}

// ========== MORALIS API ==========
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
  const maxPages = 50;

  do {
    const params = new URLSearchParams({
      chain: 'bsc',
      limit: limit.toString(),
      order: 'DESC',
    });

    if (cursor) {
      params.append('cursor', cursor);
    }

    const url = `https://deep-index.moralis.io/api/v2.2/erc20/${CAMLY_CONTRACT}/transfers?${params.toString()}`;
    console.log(`Moralis: Fetching page ${pageCount + 1}...`);
    
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
    const results = data.result || [];

    const claimTransfers = results
      .filter((t: any) => t.from_address.toLowerCase() === SENDER_WALLET.toLowerCase())
      .map((t: any) => ({
        blockNumber: parseInt(t.block_number),
        transactionHash: t.transaction_hash,
        from: t.from_address,
        to: t.to_address,
        value: t.value_decimal || t.value || '0',
        timestamp: t.block_timestamp
      }));

    transfers.push(...claimTransfers);
    console.log(`Moralis page ${pageCount + 1}: ${claimTransfers.length} claims, total: ${transfers.length}`);

    cursor = data.cursor || undefined;
    pageCount++;

    if (cursor && pageCount < maxPages) {
      await new Promise(r => setTimeout(r, 200));
    }
  } while (cursor && pageCount < maxPages);

  console.log(`Moralis: Total ${transfers.length} claims fetched`);
  return transfers;
}

// ========== BSCSCAN API (BACKUP) ==========
async function getCamlyClaimsFromBscScan(): Promise<TokenTransfer[]> {
  const BSCSCAN_API_KEY = Deno.env.get('BSCSCAN_API_KEY');
  
  if (!BSCSCAN_API_KEY) {
    throw new Error('BSCSCAN_API_KEY not configured');
  }

  console.log('BscScan: Fetching token transfers...');
  
  const transfers: TokenTransfer[] = [];
  let page = 1;
  const maxPages = 10;
  
  while (page <= maxPages) {
    const url = `https://api.bscscan.com/api?module=account&action=tokentx&address=${SENDER_WALLET}&contractaddress=${CAMLY_CONTRACT}&page=${page}&offset=1000&sort=desc&apikey=${BSCSCAN_API_KEY}`;
    
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    
    if (!response.ok) {
      throw new Error(`BscScan API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== '1' || !data.result || data.result.length === 0) {
      if (data.message === 'No transactions found') {
        console.log('BscScan: No more transactions');
        break;
      }
      if (data.message?.includes('rate limit')) {
        throw new Error('BscScan rate limit exceeded');
      }
      break;
    }
    
    const claimTransfers = data.result
      .filter((t: any) => t.from.toLowerCase() === SENDER_WALLET.toLowerCase())
      .map((t: any) => {
        // BscScan returns value in wei, need to convert
        const valueInWei = t.value || '0';
        const decimals = parseInt(t.tokenDecimal) || 18;
        const valueDecimal = (parseFloat(valueInWei) / Math.pow(10, decimals)).toString();
        
        return {
          blockNumber: parseInt(t.blockNumber),
          transactionHash: t.hash,
          from: t.from,
          to: t.to,
          value: valueDecimal,
          timestamp: new Date(parseInt(t.timeStamp) * 1000).toISOString()
        };
      });
    
    transfers.push(...claimTransfers);
    console.log(`BscScan page ${page}: ${claimTransfers.length} claims, total: ${transfers.length}`);
    
    if (data.result.length < 1000) break;
    page++;
    
    // Rate limit: 5 calls/sec for free tier
    await new Promise(r => setTimeout(r, 250));
  }
  
  console.log(`BscScan: Total ${transfers.length} claims fetched`);
  return transfers;
}

// ========== AGGREGATE DATA ==========
async function aggregateTransfers(transfers: TokenTransfer[], supabase: any) {
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

    const current = parseFloat(walletMap[receiver].totalClaimed) || 0;
    const adding = parseFloat(tx.value) || 0;
    walletMap[receiver].totalClaimed = (current + adding).toString();
    walletMap[receiver].transactions += 1;

    if (tx.timestamp > walletMap[receiver].lastClaimAt) {
      walletMap[receiver].lastClaimAt = tx.timestamp;
    }
  }

  // Convert to array
  const aggregatedArray = Object.entries(walletMap).map(([wallet, data]) => {
    const totalClaimed = parseFloat(data.totalClaimed) || 0;
    return {
      wallet,
      walletAddress: wallet,
      totalClaimed: totalClaimed,
      totalClaimedRaw: data.totalClaimed,
      transactions: data.transactions,
      lastClaimAt: data.lastClaimAt,
      userName: undefined as string | undefined
    };
  }).sort((a, b) => b.totalClaimed - a.totalClaimed);

  // Join với profiles để lấy tên user
  if (supabase) {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('wallet_address, display_name')
        .filter('wallet_address', 'neq', '')
        .filter('wallet_address', 'neq', null);
      
      if (profiles && profiles.length > 0) {
        const walletToName: Record<string, string> = {};
        profiles.forEach((p: any) => {
          if (p.wallet_address) {
            walletToName[p.wallet_address.toLowerCase()] = p.display_name || '';
          }
        });
        
        let matchedCount = 0;
        aggregatedArray.forEach(item => {
          const name = walletToName[item.wallet.toLowerCase()];
          if (name) {
            item.userName = name;
            matchedCount++;
          }
        });
        
        console.log(`Matched ${matchedCount}/${aggregatedArray.length} wallets with user names`);
      }
    } catch (dbError: any) {
      console.error('Database error:', dbError.message);
    }
  }

  // Convert to object format
  const aggregatedObject: Record<string, any> = {};
  for (const item of aggregatedArray) {
    aggregatedObject[item.wallet] = {
      totalClaimed: item.totalClaimed,
      transactions: item.transactions,
      lastClaimAt: item.lastClaimAt,
      walletAddress: item.walletAddress,
      userName: item.userName || null
    };
  }

  const totalClaimedAll = aggregatedArray.reduce((sum, w) => sum + w.totalClaimed, 0);
  const uniqueWallets = aggregatedArray.length;
  const totalTransactions = transfers.length;
  const walletsWithNames = aggregatedArray.filter(a => a.userName).length;

  return {
    transfers: transfers.slice(0, 100).map(t => ({
      ...t,
      value: parseFloat(t.value) || 0
    })),
    aggregated: aggregatedObject,
    totalTransfers: totalTransactions,
    totalWallets: uniqueWallets,
    totalClaimed: totalClaimedAll,
    walletsWithNames: walletsWithNames
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  let supabase: any = null;
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }

  // Parse request body
  let forceRefresh = false;
  try {
    const body = await req.json();
    forceRefresh = body?.forceRefresh === true;
  } catch {
    // No body or invalid JSON
  }

  console.log('=== Blockchain Data Request ===');
  console.log('Force refresh:', forceRefresh);

  // ========== STRATEGY: Cache Priority ==========
  // Nếu KHÔNG force refresh → trả về cache ngay (nhanh nhất)
  if (!forceRefresh && supabase) {
    const cachedData = await getCachedData(supabase);
    
    if (cachedData && cachedData.total_claimed > 0) {
      console.log('Returning cached data immediately (no force refresh)');
      
      return new Response(JSON.stringify({
        transfers: cachedData.transfers_sample || [],
        aggregated: cachedData.aggregated_data || {},
        totalTransfers: cachedData.total_transactions || 0,
        totalWallets: cachedData.total_wallets || 0,
        totalClaimed: cachedData.total_claimed || 0,
        walletsWithNames: cachedData.wallets_with_names || 0,
        dataSource: 'Cache',
        lastUpdated: cachedData.last_updated_at,
        message: 'Dữ liệu từ cache. Bấm Refresh để cập nhật mới nhất.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========== FORCE REFRESH: Thử Moralis → BscScan → Cache ==========
  let transfers: TokenTransfer[] = [];
  let dataSource = '';
  let apiError = '';

  // Thử Moralis trước
  try {
    console.log('Trying Moralis API...');
    transfers = await getCamlyClaimsFromMoralis();
    dataSource = 'Moralis API (Live)';
    console.log('Moralis success!');
  } catch (moralisError: any) {
    console.error('Moralis failed:', moralisError.message);
    apiError = `Moralis: ${moralisError.message}`;
    
    // Thử BscScan backup
    try {
      console.log('Trying BscScan API backup...');
      transfers = await getCamlyClaimsFromBscScan();
      dataSource = 'BscScan API (Backup)';
      console.log('BscScan success!');
    } catch (bscError: any) {
      console.error('BscScan also failed:', bscError.message);
      apiError += ` | BscScan: ${bscError.message}`;
    }
  }

  // Nếu có dữ liệu từ API → aggregate và lưu cache
  if (transfers.length > 0) {
    const aggregatedData = await aggregateTransfers(transfers, supabase);
    
    const responseData = {
      ...aggregatedData,
      dataSource,
      lastUpdated: new Date().toISOString()
    };

    // Lưu vào cache
    if (supabase) {
      await saveCacheData(supabase, responseData);
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // ========== FALLBACK: Lấy từ cache ==========
  console.log('All APIs failed, falling back to cache...');
  
  if (supabase) {
    const cachedData = await getCachedData(supabase);
    
    if (cachedData && cachedData.total_claimed > 0) {
      console.log('Returning cached data as fallback');
      
      return new Response(JSON.stringify({
        transfers: cachedData.transfers_sample || [],
        aggregated: cachedData.aggregated_data || {},
        totalTransfers: cachedData.total_transactions || 0,
        totalWallets: cachedData.total_wallets || 0,
        totalClaimed: cachedData.total_claimed || 0,
        walletsWithNames: cachedData.wallets_with_names || 0,
        dataSource: 'Cache (APIs offline)',
        lastUpdated: cachedData.last_updated_at,
        apiError: apiError,
        message: 'Cả Moralis và BscScan đều offline. Hiển thị dữ liệu cache.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Không có gì cả → trả về default
  return new Response(JSON.stringify({
    transfers: [],
    aggregated: {},
    totalTransfers: 74,
    totalWallets: 23,
    totalClaimed: 28986000,
    walletsWithNames: 23,
    dataSource: 'Default (No data available)',
    lastUpdated: new Date().toISOString(),
    apiError: apiError,
    message: 'Không có dữ liệu. Hiển thị giá trị mặc định.'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
