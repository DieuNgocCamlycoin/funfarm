import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, formatEther, parseEther, parseUnits, Contract } from 'ethers';

// BSC Mainnet config
export const BSC_CHAIN_ID = '0x38'; // 56 in hex
export const BSC_CHAIN_CONFIG = {
  chainId: BSC_CHAIN_ID,
  chainName: 'BNB Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: ['https://bsc-dataseed.binance.org/'],
  blockExplorerUrls: ['https://bscscan.com/'],
};

// Token addresses on BSC
export const TOKEN_ADDRESSES = {
  USDT: '0x55d398326f99059fF775485246999027B3197955', // BSC USDT
  BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', // Wrapped BTC on BSC
};

// ERC-20 ABI for transfer
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

interface MetaMaskState {
  isInstalled: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  chainId: string | null;
  bnbBalance: string;
  usdtBalance: string;
  btcbBalance: string;
  error: string | null;
}

export const useMetaMask = () => {
  const [state, setState] = useState<MetaMaskState>({
    isInstalled: false,
    isConnected: false,
    isConnecting: false,
    address: null,
    chainId: null,
    bnbBalance: '0',
    usdtBalance: '0',
    btcbBalance: '0',
    error: null,
  });

  // Check if MetaMask is installed
  useEffect(() => {
    const checkMetaMask = () => {
      const { ethereum } = window as any;
      setState(prev => ({ ...prev, isInstalled: !!ethereum?.isMetaMask }));
    };
    checkMetaMask();
  }, []);

  // Listen for account and chain changes
  useEffect(() => {
    const { ethereum } = window as any;
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setState(prev => ({
          ...prev,
          isConnected: false,
          address: null,
          bnbBalance: '0',
          usdtBalance: '0',
          btcbBalance: '0',
        }));
      } else {
        setState(prev => ({ ...prev, address: accounts[0] }));
        fetchBalances(accounts[0]);
      }
    };

    const handleChainChanged = (chainId: string) => {
      setState(prev => ({ ...prev, chainId }));
      // Refresh page on chain change as recommended by MetaMask
      window.location.reload();
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      const { ethereum } = window as any;
      if (!ethereum) return;

      try {
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        const chainId = await ethereum.request({ method: 'eth_chainId' });
        
        if (accounts.length > 0) {
          setState(prev => ({
            ...prev,
            isConnected: true,
            address: accounts[0],
            chainId,
          }));
          fetchBalances(accounts[0]);
        }
      } catch (err) {
        console.error('Error checking connection:', err);
      }
    };
    checkConnection();
  }, []);

  const fetchBalances = async (address: string) => {
    const { ethereum } = window as any;
    if (!ethereum) return;

    try {
      const provider = new BrowserProvider(ethereum);
      
      // Get BNB balance
      const bnbBalance = await provider.getBalance(address);
      
      // Get token balances
      const usdtContract = new Contract(TOKEN_ADDRESSES.USDT, ERC20_ABI, provider);
      const btcbContract = new Contract(TOKEN_ADDRESSES.BTCB, ERC20_ABI, provider);
      
      const [usdtBalance, btcbBalance] = await Promise.all([
        usdtContract.balanceOf(address),
        btcbContract.balanceOf(address),
      ]);

      setState(prev => ({
        ...prev,
        bnbBalance: formatEther(bnbBalance),
        usdtBalance: formatEther(usdtBalance), // USDT has 18 decimals on BSC
        btcbBalance: formatEther(btcbBalance),
      }));
    } catch (err) {
      console.error('Error fetching balances:', err);
    }
  };

  const connect = useCallback(async () => {
    const { ethereum } = window as any;
    if (!ethereum) {
      setState(prev => ({ ...prev, error: 'MetaMask chưa được cài đặt' }));
      return false;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Request account access
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = await ethereum.request({ method: 'eth_chainId' });

      // Switch to BSC if not already on it
      if (chainId !== BSC_CHAIN_ID) {
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BSC_CHAIN_ID }],
          });
        } catch (switchError: any) {
          // Chain not added, add it
          if (switchError.code === 4902) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [BSC_CHAIN_CONFIG],
            });
          } else {
            throw switchError;
          }
        }
      }

      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        address: accounts[0],
        chainId: BSC_CHAIN_ID,
      }));

      await fetchBalances(accounts[0]);
      return true;
    } catch (err: any) {
      console.error('Error connecting to MetaMask:', err);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: err.message || 'Không thể kết nối MetaMask',
      }));
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConnected: false,
      address: null,
      bnbBalance: '0',
      usdtBalance: '0',
      btcbBalance: '0',
    }));
  }, []);

  const sendBNB = useCallback(async (to: string, amount: string): Promise<string | null> => {
    const { ethereum } = window as any;
    if (!ethereum || !state.address) return null;

    try {
      const provider = new BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      
      const tx = await signer.sendTransaction({
        to,
        value: parseEther(amount),
      });

      await tx.wait();
      await fetchBalances(state.address);
      
      return tx.hash;
    } catch (err: any) {
      console.error('Error sending BNB:', err);
      throw new Error(err.message || 'Giao dịch thất bại');
    }
  }, [state.address]);

  const sendToken = useCallback(async (
    tokenAddress: string,
    to: string,
    amount: string,
    decimals: number = 18
  ): Promise<string | null> => {
    const { ethereum } = window as any;
    if (!ethereum || !state.address) return null;

    try {
      const provider = new BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(tokenAddress, ERC20_ABI, signer);
      
      const tx = await contract.transfer(to, parseUnits(amount, decimals));
      await tx.wait();
      await fetchBalances(state.address);
      
      return tx.hash;
    } catch (err: any) {
      console.error('Error sending token:', err);
      throw new Error(err.message || 'Giao dịch thất bại');
    }
  }, [state.address]);

  const sendUSDT = useCallback(async (to: string, amount: string) => {
    return sendToken(TOKEN_ADDRESSES.USDT, to, amount, 18);
  }, [sendToken]);

  const sendBTCB = useCallback(async (to: string, amount: string) => {
    return sendToken(TOKEN_ADDRESSES.BTCB, to, amount, 18);
  }, [sendToken]);

  return {
    ...state,
    connect,
    disconnect,
    sendBNB,
    sendUSDT,
    sendBTCB,
    refreshBalances: () => state.address && fetchBalances(state.address),
  };
};

export default useMetaMask;
