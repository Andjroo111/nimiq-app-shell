import { describe, expect, test } from 'bun:test';
import { payThenConfirm, type ConfirmAttempt } from './pay-then-confirm';

const fast = { sleep: async () => {}, delayMs: 0 };

describe('payThenConfirm', () => {
  test('sends once, persists before confirming, pays on ok', async () => {
    const order: string[] = [];
    let sends = 0;
    const answers: ConfirmAttempt[] = [{ status: 'pending' }, { status: 'pending', progress: '2 of 10' }, { status: 'ok' }];
    const r = await payThenConfirm({
      ...fast,
      send: async () => (sends++, order.push('send'), 'tx1'),
      onSent: (h) => void order.push(`save:${h}`),
      confirm: async () => (order.push('confirm'), answers.shift()!),
    });
    expect(r).toEqual({ state: 'paid', handle: 'tx1' });
    expect(sends).toBe(1);
    expect(order.slice(0, 3)).toEqual(['send', 'save:tx1', 'confirm']);
  });

  test('running out of attempts is pending, never failed, and never resends', async () => {
    let sends = 0;
    const r = await payThenConfirm({ ...fast, attempts: 3, send: async () => (sends++, 'tx'), confirm: async () => ({ status: 'pending' }) });
    expect(r).toMatchObject({ state: 'pending', handle: 'tx' });
    expect(sends).toBe(1);
  });

  test('send errors: cancel, PENDING:, and a real refusal', async () => {
    expect(await payThenConfirm({ ...fast, send: async () => { throw new Error('User rejected the request'); }, confirm: async () => ({ status: 'ok' }) })).toEqual({ state: 'cancelled' });
    expect((await payThenConfirm({ ...fast, send: async () => { throw new Error('PENDING: propagating'); }, confirm: async () => ({ status: 'ok' }) })).state).toBe('pending');
    expect(await payThenConfirm({ ...fast, send: async () => { throw new Error('insufficient balance'); }, confirm: async () => ({ status: 'ok' }) })).toEqual({ state: 'failed', error: 'insufficient balance' });
  });

  test('an empty handle may still have sent: pending, no confirm calls', async () => {
    let confirms = 0;
    const r = await payThenConfirm({ ...fast, send: async () => '', confirm: async () => (confirms++, { status: 'ok' }) });
    expect(r.state).toBe('pending');
    expect(confirms).toBe(0);
  });

  test('a fail is rejected; a throwing confirm or onSent does not end the flow', async () => {
    expect(await payThenConfirm({ ...fast, send: async () => 'tx', confirm: async () => ({ status: 'fail', error: 'wrong amount' }) })).toEqual({ state: 'rejected', handle: 'tx', error: 'wrong amount' });
    let n = 0;
    const r = await payThenConfirm({
      ...fast,
      send: async () => 'tx',
      onSent: () => { throw new Error('quota'); },
      confirm: async () => { if (n++ === 0) throw new Error('503'); return { status: 'ok' }; },
    });
    expect(r.state).toBe('paid');
  });

  test('bad options throw before anything is sent', async () => {
    let sends = 0;
    await expect(payThenConfirm({ send: async () => (sends++, 'tx'), confirm: async () => ({ status: 'ok' }), attempts: 0 })).rejects.toThrow();
    await expect(payThenConfirm({ send: async () => (sends++, 'tx'), confirm: async () => ({ status: 'ok' }), delayMs: NaN })).rejects.toThrow();
    expect(sends).toBe(0);
  });

  test('errors that can follow a broadcast are pending, never cancelled or failed', async () => {
    for (const m of ['transaction cancelled by network', 'WebView closed', 'connection aborted', 'Request timed out after broadcast', 'something odd']) {
      const r = await payThenConfirm({ ...fast, send: async () => { throw new Error(m); }, confirm: async () => ({ status: 'ok' }) });
      expect(r.state).toBe('pending');
    }
    for (const e of [new Error('User rejected the request'), new Error('Cancelled'), Object.assign(new Error('x'), { code: 4001 }), { code: 4001 }]) {
      expect((await payThenConfirm({ ...fast, send: async () => { throw e; }, confirm: async () => ({ status: 'ok' }) })).state).toBe('cancelled');
    }
  });

  test('junk confirm answers and throwing UI callbacks never end the flow', async () => {
    const answers: unknown[] = [null, { status: 'OK' }, undefined, { status: 'ok' }];
    const r = await payThenConfirm({
      ...fast,
      send: async () => 'tx',
      confirm: async () => answers.shift() as ConfirmAttempt,
      onStatus: () => { throw new Error('ui'); },
    });
    expect(r).toEqual({ state: 'paid', handle: 'tx' });
  });

  test('a hung onSent does not stop confirmation', async () => {
    const r = await payThenConfirm({ ...fast, onSentTimeoutMs: 10, send: async () => 'tx', onSent: () => new Promise(() => {}), confirm: async () => ({ status: 'ok' }) });
    expect(r.state).toBe('paid');
  });
});
