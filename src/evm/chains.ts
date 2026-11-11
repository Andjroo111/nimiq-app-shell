// Polygon, the one EVM chain the fleet settles stablecoins on, and the two
// tokens the mini wallet lists on it.
//
// The addresses are nimiq.markets' own registry (app/src/shared/evm-chains.ts,
// POLYGON_MAINNET and POLYGON_AMOY), copied rather than imported so this
// package keeps its tiny dependency set. USDC is Circle's NATIVE token, not the
// bridged USDC.e: the two are different contracts with different balances.
//
// The chain parameters are what `wallet_addEthereumChain` needs when a wallet
// has never heard of the chain (EIP-3085).

export type EvmNetwork = 'main' | 'test';

export interface EvmChain {
  /** Numeric chain id. */
  id: number;
  /** The same id as the 0x-prefixed hex string wallets speak. */
  hexId: string;
  /** The chain as a person would say it. Also the receive view's chain warning. */
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export interface EvmToken {
  ticker: string;
  name: string;
  decimals: number;
  /** ERC-20 contract on the chain this token list belongs to. */
  address: string;
}

export const POLYGON: EvmChain = {
  id: 137,
  hexId: '0x89',
  name: 'Polygon',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: ['https://polygon.drpc.org'],
  blockExplorerUrls: ['https://polygonscan.com'],
};

export const POLYGON_AMOY: EvmChain = {
  id: 80002,
  hexId: '0x13882',
  name: 'Polygon Amoy',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: ['https://rpc-amoy.polygon.technology'],
  blockExplorerUrls: ['https://amoy.polygonscan.com'],
};

export const EVM_CHAINS: Record<EvmNetwork, EvmChain> = { main: POLYGON, test: POLYGON_AMOY };

export const EVM_TOKENS: Record<EvmNetwork, readonly EvmToken[]> = {
  main: [
    { ticker: 'USDC', name: 'USD Coin', decimals: 6, address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
    { ticker: 'USDT', name: 'Tether USD', decimals: 6, address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' },
  ],
  test: [
    { ticker: 'USDC', name: 'USD Coin', decimals: 6, address: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582' },
    { ticker: 'USDT', name: 'Tether USD', decimals: 6, address: '0x1616d425Cd540B256475cBfb604586C8598eC0FB' },
  ],
};
