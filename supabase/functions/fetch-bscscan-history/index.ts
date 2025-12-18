import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  value_decimal?: string;
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

      if (pageCount === 0 && results.length > 0) {
        console.log('First result sample:', JSON.stringify(results[0]));
      }

      const claimTransfers = results
        .filter(t => t.from_address.toLowerCase() === SENDER_WALLET.toLowerCase())
        .map(t => {
          const actualValue = t.value_decimal || t.value || '0';
          
          if (transfers.length < 5) {
            console.log(`Transfer: value="${t.value}", value_decimal="${t.value_decimal}", using: ${actualValue}, to: ${t.to_address}`);
          }
          
          return {
            blockNumber: parseInt(t.block_number),
            transactionHash: t.transaction_hash,
            from: t.from_address,
            to: t.to_address,
            value: actualValue,
            timestamp: t.block_timestamp
          };
        });

      transfers.push(...claimTransfers);
      console.log(`Page ${pageCount + 1}: found ${claimTransfers.length} claims, total: ${transfers.length}`);

      cursor = data.cursor || undefined;
      pageCount++;

      if (cursor && pageCount < maxPages) {
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (error: any) {
      console.error('Moralis API error:', error.message);
      throw error; // Re-throw để trigger fallback
    }
  } while (cursor && pageCount < maxPages);

  console.log(`Total claims fetched from Moralis: ${transfers.length}`);
  return transfers;
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

  // Parse request body để check force refresh
  let forceRefresh = false;
  try {
    const body = await req.json();
    forceRefresh = body?.forceRefresh === true;
  } catch {
    // No body or invalid JSON
  }

  try {
    console.log('Starting Moralis fetch for CAMLY transfers...');
    console.log('Contract:', CAMLY_CONTRACT);
    console.log('Sender wallet:', SENDER_WALLET);
    console.log('Force refresh:', forceRefresh);

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

    // ========== JOIN VỚI PROFILES ĐỂ LẤY TÊN USER ==========
    if (supabase) {
      try {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('wallet_address, display_name')
          .filter('wallet_address', 'neq', '')
          .filter('wallet_address', 'neq', null);
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError.message);
        } else if (profiles && profiles.length > 0) {
          console.log(`Fetched ${profiles.length} profiles with wallet addresses`);
          
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

    // Convert back to object format
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

    // Calculate summary
    const totalClaimedAll = aggregatedArray.reduce((sum, w) => sum + w.totalClaimed, 0);
    const uniqueWallets = aggregatedArray.length;
    const totalTransactions = transfers.length;
    const walletsWithNames = aggregatedArray.filter(a => a.userName).length;

    console.log(`Summary: ${uniqueWallets} wallets (${walletsWithNames} with names), ${totalTransactions} transactions, ${totalClaimedAll.toLocaleString()} CAMLY total`);

    const responseData = {
      transfers: transfers.slice(0, 100).map(t => ({
        ...t,
        value: parseFloat(t.value) || 0
      })),
      aggregated: aggregatedObject,
      totalTransfers: totalTransactions,
      totalWallets: uniqueWallets,
      totalClaimed: totalClaimedAll,
      walletsWithNames: walletsWithNames,
      dataSource: 'Moralis API (Live)',
      lastUpdated: new Date().toISOString()
    };

    // Lưu vào cache
    if (supabase) {
      await saveCacheData(supabase, responseData);
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('API Error, trying cache fallback:', error.message);
    
    // ========== FALLBACK: Lấy từ cache ==========
    if (supabase) {
      const cachedData = await getCachedData(supabase);
      
      if (cachedData && cachedData.total_claimed > 0) {
        console.log('Returning cached data from:', cachedData.last_updated_at);
        
        return new Response(JSON.stringify({
          transfers: cachedData.transfers_sample || [],
          aggregated: cachedData.aggregated_data || {},
          totalTransfers: cachedData.total_transactions || 0,
          totalWallets: cachedData.total_wallets || 0,
          totalClaimed: cachedData.total_claimed || 0,
          walletsWithNames: cachedData.wallets_with_names || 0,
          dataSource: 'Cache (Moralis API offline)',
          lastUpdated: cachedData.last_updated_at,
          cacheNote: `Dữ liệu từ cache. API lỗi: ${error.message}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Không có cache, trả về error với dữ liệu mặc định
    return new Response(JSON.stringify({
      error: error.message,
      transfers: [],
      aggregated: {},
      totalTransfers: 74,
      totalWallets: 23,
      totalClaimed: 28986000,
      walletsWithNames: 23,
      dataSource: 'Default (API & Cache unavailable)',
      hint: 'Moralis API quota hết. Dữ liệu hiển thị là giá trị mặc định.'
    }), {
      status: 200, // Return 200 để UI vẫn hiển thị được
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
