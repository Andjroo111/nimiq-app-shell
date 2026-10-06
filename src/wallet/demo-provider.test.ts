import { describe, expect, test } from 'bun:test';
import { createDemoProvider, DEMO_ADDRESS } from './demo-provider';
import { MiniAppBackend } from './miniapp-backend';

describe('createDemoProvider', () => {
  test('refuses unless explicitly allowed', () => {
    expect(() => createDemoProvider({ allow: false })).toThrow();
    expect(() => createDemoProvider({} as never)).toThrow();
  });

  test('drives the real MiniAppBackend end to end, with handles nobody can mistake for a tx', async () => {
    const p = createDemoProvider({ allow: true, latencyMs: 0 });
    const be = new MiniAppBackend({ provider: p });
    const acct = await be.connect();
    expect(acct!.address.replace(/\s/g, '')).toBe(DEMO_ADDRESS.replace(/\s/g, ''));
    await be.signAndSend({ recipient: DEMO_ADDRESS, valueLuna: 100 });
    const [s] = p.sent();
    expect(s!.handle.startsWith('demo-')).toBe(true);
    expect(/^[0-9a-f]{64}$/.test(s!.handle)).toBe(false);
    expect(p.isDemo).toBe(true);
  });

  test('scripted failures surface the way a real wallet does', async () => {
    const p = createDemoProvider({ allow: true, latencyMs: 0, failWith: 'cancel' });
    const be = new MiniAppBackend({ provider: p });
    await expect(be.connect()).rejects.toThrow(/rejected/i);
    p.setFailure('syncing');
    expect(await p.isConsensusEstablished()).toBe(false);
    p.setFailure(null);
    expect(await p.isConsensusEstablished()).toBe(true);
  });

  test('the demo signature never verifies as a real one (all-zero key)', async () => {
    const p = createDemoProvider({ allow: true, latencyMs: 0 });
    const r = (await p.sign('hi')) as { publicKey: string };
    expect(r.publicKey).toBe('00'.repeat(32));
  });
});
