// EVM browser wallets (MetaMask and anything else that speaks EIP-1193) for
// the Polygon side of the fleet. Additive: nothing here touches the Nimiq
// `Wallet`. See ./wallet.ts for the scope.
export {
  createEvmWallet,
  evmFailure,
  EvmWalletError,
  EVM_PLANNED_CONNECTORS,
  type EvmWallet,
  type EvmAccount,
  type EvmAccountListener,
  type EvmConnector,
  type EvmConnectorKind,
  type EvmPlannedConnector,
  type EvmFailure,
  type CreateEvmWalletOptions,
} from './wallet';
export {
  createEvmDiscovery,
  orderProviders,
  pickProvider,
  metaMaskAppLink,
  isMobileBrowser,
  METAMASK_RDNS,
  type EvmDiscovery,
  type AnnouncedProvider,
  type EvmProviderInfo,
  type Eip1193Provider,
} from './discovery';
export {
  encodeBalanceOf,
  decodeUint256,
  isEvmAddress,
  shortEvmAddress,
  BALANCE_OF_SELECTOR,
} from './erc20';
export {
  EVM_CHAINS,
  EVM_TOKENS,
  POLYGON,
  POLYGON_AMOY,
  type EvmChain,
  type EvmNetwork,
  type EvmToken,
} from './chains';
