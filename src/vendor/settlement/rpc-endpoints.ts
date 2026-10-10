// VENDORED from Andjroo111/nimiq-settlement@554b3e0 (v0.9.0) src/transport.ts lines 17-21 (RPC_ENDPOINTS only). Do not edit here; change it upstream and re-copy.
/** Ordered fallback chains. First entry is tried first. */
export const RPC_ENDPOINTS = {
  main: ["https://rpc.nimiqwatch.com", "https://rpc.mainnet.nimiq.network"],
  test: ["https://rpc.testnet.nimiqwatch.com"],
} as const;
