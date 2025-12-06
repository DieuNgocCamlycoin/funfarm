// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
import { http, createConfig } from 'wagmi';
import { mainnet, polygon, polygonMumbai } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// WalletConnect Project ID - Users should replace with their own
const projectId = 'fun-farm-web3';

export const config = createConfig({
  chains: [mainnet, polygon, polygonMumbai],
  connectors: [
    injected(),
    walletConnect({ 
      projectId,
      metadata: {
        name: 'FUN FARM Web3',
        description: 'Farmers rich, Eaters happy. Farm to Table, Fair & Fast.',
        url: 'https://farm.fun.rich',
        icons: ['https://farm.fun.rich/logo.png']
      }
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [polygonMumbai.id]: http(),
  },
});

// CAMLY Token Contract Address
export const CAMLY_CONTRACT = '0x0910320181889feFDE0BB1Ca63962b0A8882e413';

// Welcome bonus amount
export const WELCOME_BONUS = 50000;
