import { describe, expect, test } from 'bun:test';
import { explorerUrl, parseNetwork, queryNetwork } from './network';

describe('queryNetwork', () => {
  test('a URL can always move an app toward testnet', () => {
    expect(queryNetwork('?network=test', 'main')).toBe('test');
    expect(queryNetwork('?net=testnet&x=1', 'main')).toBe('test');
  });
  test('a URL can NOT move a testnet app onto mainnet without the app opting in', () => {
    expect(queryNetwork('?network=MainAlbatross', 'test')).toBe('test');
    expect(queryNetwork('?net=main', 'test')).toBe('test');
    expect(queryNetwork('?network=main', 'test', { allowMainnet: true })).toBe('main');
    expect(queryNetwork('?network=main', 'main')).toBe('main');
  });
  test('absent or unrecognised falls back, never guesses', () => {
    expect(queryNetwork('', 'main')).toBe('main');
    expect(queryNetwork(null, 'test')).toBe('test');
    expect(queryNetwork('?network=devnet', 'main')).toBe('main');
    expect(queryNetwork('?network=', 'test')).toBe('test');
  });
  test('parseNetwork spellings', () => {
    expect(parseNetwork(' Testnet ')).toBe('test');
    expect(parseNetwork('main-albatross')).toBe('main');
    expect(parseNetwork(5)).toBe(null);
  });
});

describe('explorerUrl', () => {
  const H = 'ab'.repeat(32);
  const A = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';
  test('tx hashes and addresses on each network', () => {
    expect(explorerUrl('main', H)).toBe(`https://nimiq.watch/#${H}`);
    expect(explorerUrl('test', '0x' + H.toUpperCase())).toBe(`https://test.nimiq.watch/#${H}`);
    expect(explorerUrl('main', A.toLowerCase())).toBe('https://nimiq.watch/#NQ07+0000+0000+0000+0000+0000+0000+0000+0000');
  });
  test('anything else is null', () => {
    expect(explorerUrl('main', 'NQ07 0000')).toBe(null);
    expect(explorerUrl('main', 'javascript:alert(1)')).toBe(null);
    expect(explorerUrl('main', '')).toBe(null);
  });
});
