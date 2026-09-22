import { describe, expect, test } from 'bun:test';
import { describeWalletError, type WalletOutcome } from './outcome';

// ---- digging the message out -----------------------------------------------

describe('describeWalletError: finding the message', () => {
  test('a thrown string is the message', () => {
    expect(describeWalletError('node refused the transaction').message)
      .toBe('node refused the transaction');
  });

  test('an Error gives up its message, not its toString', () => {
    expect(describeWalletError(new Error('signing failed')).message).toBe('signing failed');
  });

  test('an envelope is unwrapped through error / data / cause / reason', () => {
    expect(describeWalletError({ error: { data: { reason: 'node refused' } } }).message)
      .toBe('node refused');
    expect(describeWalletError({ cause: { message: 'hub popup died' } }).message)
      .toBe('hub popup died');
  });

  test('the outermost message wins over a deeper transport detail', () => {
    const raw = { message: 'could not send', error: { message: 'ECONNRESET' } };
    expect(describeWalletError(raw).message).toBe('could not send');
  });

  test('the original is kept untouched on raw', () => {
    const raw = { error: { reason: 'nope' } };
    expect(describeWalletError(raw).raw).toBe(raw);
  });
});

// ---- the thing that reached users ------------------------------------------

describe('describeWalletError: never [object Object]', () => {
  test('a message that is itself an object is ignored, not stringified', () => {
    const { message } = describeWalletError({ message: { code: 7 } });
    expect(message).not.toContain('[object');
    expect(message).toBe('wallet returned no message');
  });

  test('an empty rejection gets a short literal describing the shape', () => {
    expect(describeWalletError({}).message).toBe('wallet returned no message');
    expect(describeWalletError(null).message).toBe('wallet returned null');
    expect(describeWalletError(undefined).message).toBe('wallet returned nothing');
    expect(describeWalletError([]).message).toBe('wallet returned a list with no message');
    expect(describeWalletError(true).message).toBe('wallet returned a boolean');
  });
});

// ---- cycles ----------------------------------------------------------------

describe('describeWalletError: cyclic envelopes', () => {
  // A retry wrapper that re-throws its own error as the cause of a new one has
  // shipped more than once. Without the seen-set this recurses until the stack
  // gives out, inside a catch block, which takes the app down with it.
  test('a cycle with no message anywhere returns, and returns failed', () => {
    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = { cause: a };
    a.error = b;

    const out = describeWalletError(a);
    expect(out.kind).toBe('failed');
    expect(out.message).toBe('wallet returned no message');
    expect(out.raw).toBe(a);
  });

  test('a message found past a cycle still comes back', () => {
    const head: Record<string, unknown> = {};
    const tail: Record<string, unknown> = { error: head, reason: 'node refused the tx' };
    head.data = tail;

    const out = describeWalletError(head);
    expect(out.message).toBe('node refused the tx');
    expect(out.kind).toBe('failed');
  });

  test('a self-referencing Error cause does not hang', () => {
    const err = new Error('boom') as Error & { cause?: unknown };
    err.cause = err;
    const out = describeWalletError(err);
    expect(out.kind).toBe('failed');
    expect(out.message).toBe('boom');
    expect(out.raw).toBe(err);
  });
});

// ---- classification --------------------------------------------------------

describe('describeWalletError: cancelled', () => {
  test.each([
    'User cancelled the request',
    'Request was aborted',
    'Access denied',
    'the user chose to deny this',
    'User rejected the request',
    'ACTION_REJECTED',
    'Popup dismissed',
    'Hub popup closed by the user',
    'User declined',
  ])('%p is a cancel', (message) => {
    expect(describeWalletError(message).kind).toBe('cancelled');
  });

  test('matching is case-insensitive', () => {
    expect(describeWalletError('USER CANCELLED').kind).toBe('cancelled');
    expect(describeWalletError('action_rejected').kind).toBe('cancelled');
  });

  test('the EIP-1193 user-rejected code counts, as text or as a number', () => {
    expect(describeWalletError({ message: 'request failed: 4001' }).kind).toBe('cancelled');
    expect(describeWalletError(4001).kind).toBe('cancelled');
  });
});

describe('describeWalletError: pending', () => {
  // The whole point of the marker: the transaction is already out. Reading this
  // as a cancel makes the caller re-send, which is a double-send on chain.
  test('PENDING: beats a cancel word in the same sentence', () => {
    const out = describeWalletError('PENDING: user cancelled the retry, tx is already broadcast');
    expect(out.kind).toBe('pending');
  });

  test('PENDING: beats a timeout word too', () => {
    expect(describeWalletError('PENDING: receipt lookup timed out').kind).toBe('pending');
  });

  test('the message keeps the marker for the caller to strip', () => {
    expect(describeWalletError('PENDING: 3 confirmations').message).toBe('PENDING: 3 confirmations');
  });

  // The marker is a literal protocol prefix, not a word search: a wallet that
  // merely says "pending" in prose is not making the keep-polling promise.
  test('prose about a pending transaction is not the marker', () => {
    expect(describeWalletError('the transaction is pending').kind).toBe('failed');
  });
});

describe('describeWalletError: unavailable', () => {
  test.each([
    'No provider found',
    'Nimiq Pay is not installed',
    'wallet unavailable',
    'connection timeout',
    'the request timed out',
  ])('%p means there is nothing to talk to', (message) => {
    expect(describeWalletError(message).kind).toBe('unavailable');
  });

  test('an unwrapped envelope classifies on what it found', () => {
    expect(describeWalletError({ error: { data: { reason: 'no provider' } } }).kind)
      .toBe('unavailable');
  });
});

describe('describeWalletError: failed', () => {
  test('anything else is a plain failure', () => {
    expect(describeWalletError('insufficient funds').kind).toBe('failed');
    expect(describeWalletError(new Error('invalid recipient')).kind).toBe('failed');
    expect(describeWalletError({}).kind).toBe('failed');
  });
});

// ---- the outcome shape -----------------------------------------------------

describe('WalletOutcome', () => {
  test('narrows on ok', () => {
    const outcomes: WalletOutcome<string>[] = [
      { ok: true, value: 'hash' },
      { ok: false, error: describeWalletError('User cancelled') },
    ];

    const seen = outcomes.map((o) => (o.ok ? o.value : o.error.kind));
    expect(seen).toEqual(['hash', 'cancelled']);
  });
});

// ---- cancel beats transient (cross-lane rule, shared with nimiq-settlement) ----

describe('describeWalletError: a cancel is never retried', () => {
  // A message can carry a cancel word and a transient word at once. Read as
  // transient, the caller retries and re-prompts someone who already said no.
  // Only a literal PENDING: prefix ranks above a cancel, and a user refusal
  // cannot produce one.
  test.each([
    'request cancelled while syncing',
    'user rejected: request timed out',
    'User denied, network unavailable',
    'dismissed before timeout',
  ])('%s', (message) => {
    expect(describeWalletError(message).kind).toBe('cancelled');
  });
});
