// The one ERC-20 read the mini wallet makes, encoded by hand.
//
// `balanceOf(address)` is a four-byte selector and one 32-byte word, and its
// answer is one 32-byte word. That is not worth an ABI library: viem or ethers
// would be the largest dependency in this package for two string operations.

/** keccak256('balanceOf(address)') truncated to four bytes. */
export const BALANCE_OF_SELECTOR = '0x70a08231';

const ADDRESS_SHAPE = /^0x[0-9a-fA-F]{40}$/;

/** Is this a 20-byte 0x address? Shape only, no checksum. */
export function isEvmAddress(text: string): boolean {
  return ADDRESS_SHAPE.test(text);
}

/** Calldata for `balanceOf(owner)`: the selector, then the address left-padded
 *  to one 32-byte word. */
export function encodeBalanceOf(owner: string): string {
  if (!isEvmAddress(owner)) throw new Error('encodeBalanceOf: not a 20-byte 0x address');
  return BALANCE_OF_SELECTOR + owner.slice(2).toLowerCase().padStart(64, '0');
}

/** One returned uint256 word as a bigint.
 *
 *  BigInt and never Number: a 6-decimal token passes 2^53 smallest units at
 *  nine billion coins, and an 18-decimal one at nine thousandths of a coin.
 *
 *  An empty answer ('0x') is what a node returns for an address with no code,
 *  which is a wrong chain or a wrong token address, not a zero balance. It
 *  throws so the row keeps its dash instead of printing 0 over real money. */
export function decodeUint256(result: unknown): bigint {
  if (typeof result !== 'string' || !/^0x[0-9a-fA-F]{1,64}$/.test(result)) {
    throw new Error('decodeUint256: not a uint256 word');
  }
  return BigInt(result);
}

/** `0x1234…abcd`, the short form wallets show. */
export function shortEvmAddress(address: string): string {
  return address.length < 12 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`;
}
