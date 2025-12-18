import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ethers } from "https://esm.sh/ethers@6.9.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CAMLY Token contract address on BSC (lowercase to avoid checksum issues)
const CAMLY_CONTRACT = "0x3a1311b8c404629e38f61d566cefeaed8da1c0c8";
// Wallet that sends CAMLY rewards
const SENDER_WALLET = "0xBBa78598Be65520DD892C771Cf17B8D53aFfF68c";

// ERC20 Transfer event signature
const TRANSFER_EVENT_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f631f5d357878678da80a64f65";

// Public RPC endpoints for BSC (fallback list)
const RPC_URLS = [
  "https://bsc-dataseed.binance.org/",
  "https://rpc.ankr.com/bsc",
  "https://bsc-rpc.publicnode.com",
  "https://bscrpc.com"
];

// ERC20 ABI for decimals
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

interface TokenTransfer {
  blockNumber: number;
  transactionHash: string;
  from: string;
  to: string;
  value: string;
  timestamp?: number;
}

async function getProviderWithFallback(): Promise<ethers.JsonRpcProvider> {
  for (const rpcUrl of RPC_URLS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      // Test connection
      await provider.getBlockNumber();
      console.log(`Connected to RPC: ${rpcUrl}`);
      return provider;
    } catch (error) {
      console.log(`Failed to connect to ${rpcUrl}, trying next...`);
    }
  }
  throw new Error("All RPC endpoints failed");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching token transfers using public RPC...');
    console.log('CAMLY Contract:', CAMLY_CONTRACT);
    console.log('Sender Wallet:', SENDER_WALLET);

    const provider = await getProviderWithFallback();
    
    // Get token decimals
    const tokenContract = new ethers.Contract(CAMLY_CONTRACT, ERC20_ABI, provider);
    let tokenDecimals = 18;
    try {
      tokenDecimals = await tokenContract.decimals();
      console.log('Token decimals:', tokenDecimals);
    } catch (e) {
      console.log('Could not fetch decimals, using default 18');
    }

    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    console.log('Current block:', currentBlock);
    
    // Search last ~3 days of blocks to avoid rate limits (BSC ~3s per block = ~28800 blocks/day)
    const blocksToSearch = 50000; // Reduced to ~2 days
    const fromBlock = Math.max(0, currentBlock - blocksToSearch);
    
    console.log(`Searching from block ${fromBlock} to ${currentBlock}`);

    // Pad sender address to 32 bytes for topic filter
    const senderPadded = ethers.zeroPadValue(SENDER_WALLET.toLowerCase(), 32);

    // Split into smaller chunks to avoid rate limits
    const CHUNK_SIZE = 10000;
    const logs: any[] = [];
    
    for (let start = fromBlock; start < currentBlock; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE - 1, currentBlock);
      console.log(`Fetching logs from block ${start} to ${end}...`);
      
      try {
        const filter = {
          address: CAMLY_CONTRACT,
          topics: [
            TRANSFER_EVENT_TOPIC,
            senderPadded,
            null
          ],
          fromBlock: start,
          toBlock: end
        };
        
        const chunkLogs = await provider.getLogs(filter);
        logs.push(...chunkLogs);
        console.log(`Found ${chunkLogs.length} events in chunk`);
        
        // Small delay between chunks to avoid rate limiting
        if (start + CHUNK_SIZE < currentBlock) {
          await new Promise(r => setTimeout(r, 200));
        }
      } catch (chunkError: any) {
        console.log(`Chunk ${start}-${end} failed, trying next RPC...`);
        // Try with a different RPC if this one fails
        for (let i = 1; i < RPC_URLS.length; i++) {
          try {
            const fallbackProvider = new ethers.JsonRpcProvider(RPC_URLS[i]);
            const filter = {
              address: CAMLY_CONTRACT,
              topics: [
                TRANSFER_EVENT_TOPIC,
                senderPadded,
                null
              ],
              fromBlock: start,
              toBlock: end
            };
            const chunkLogs = await fallbackProvider.getLogs(filter);
            logs.push(...chunkLogs);
            console.log(`Fallback RPC ${i} succeeded with ${chunkLogs.length} events`);
            break;
          } catch (fallbackError) {
            console.log(`Fallback RPC ${i} also failed`);
          }
        }
      }
    }
    
    console.log(`Found ${logs.length} total transfer events`);

    // Parse transfer events
    const transfers: TokenTransfer[] = [];
    
    for (const log of logs) {
      const from = ethers.getAddress('0x' + log.topics[1].slice(26));
      const to = ethers.getAddress('0x' + log.topics[2].slice(26));
      const value = ethers.toBigInt(log.data);
      
      transfers.push({
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        from: from,
        to: to,
        value: value.toString()
      });
    }

    console.log(`Parsed ${transfers.length} transfers`);

    // Aggregate by receiver wallet
    const aggregated: Record<string, { 
      totalClaimed: number; 
      transactions: number;
      lastClaimAt: string;
      walletAddress: string;
      lastBlockNumber: number;
    }> = {};

    for (const tx of transfers) {
      const receiver = tx.to.toLowerCase();
      const amount = Number(ethers.formatUnits(tx.value, tokenDecimals));
      
      if (!aggregated[receiver]) {
        aggregated[receiver] = {
          totalClaimed: 0,
          transactions: 0,
          lastClaimAt: '',
          walletAddress: tx.to,
          lastBlockNumber: 0
        };
      }
      
      aggregated[receiver].totalClaimed += amount;
      aggregated[receiver].transactions += 1;
      
      // Track latest block for this receiver
      if (tx.blockNumber > aggregated[receiver].lastBlockNumber) {
        aggregated[receiver].lastBlockNumber = tx.blockNumber;
      }
    }

    // Get timestamps for the latest blocks (sample a few)
    const uniqueBlocks = [...new Set(Object.values(aggregated).map(a => a.lastBlockNumber))].slice(0, 50);
    const blockTimestamps: Record<number, number> = {};
    
    for (const blockNum of uniqueBlocks) {
      try {
        const block = await provider.getBlock(blockNum);
        if (block) {
          blockTimestamps[blockNum] = block.timestamp;
        }
      } catch (e) {
        console.log(`Could not fetch block ${blockNum} timestamp`);
      }
    }

    // Update lastClaimAt with actual timestamps
    for (const receiver in aggregated) {
      const blockNum = aggregated[receiver].lastBlockNumber;
      if (blockTimestamps[blockNum]) {
        aggregated[receiver].lastClaimAt = new Date(blockTimestamps[blockNum] * 1000).toISOString();
      } else {
        // Estimate timestamp based on block number
        const estimatedTimestamp = Date.now() - ((currentBlock - blockNum) * 3000);
        aggregated[receiver].lastClaimAt = new Date(estimatedTimestamp).toISOString();
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

    const totalClaimed = Object.values(aggregated).reduce((sum, w) => sum + w.totalClaimed, 0);

    return new Response(JSON.stringify({ 
      transfers: transfers.slice(0, 100).map(t => ({
        ...t,
        value: ethers.formatUnits(t.value, tokenDecimals)
      })),
      aggregated: sortedAggregated,
      totalTransfers: transfers.length,
      totalWallets: Object.keys(aggregated).length,
      totalClaimed: totalClaimed,
      blocksSearched: blocksToSearch,
      fromBlock: fromBlock,
      toBlock: currentBlock
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error fetching blockchain data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      transfers: [],
      aggregated: {},
      hint: 'Đang sử dụng public RPC. Nếu lỗi, vui lòng thử lại sau vài giây.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
