import { describe, expect, test } from 'bun:test';
import { enforceLinkAllowlist, guardModelText, normalizeForGuard, stripForgedLines, stripUnverifiedNqAddresses } from './llm-guard';

const ROOTS = ['nimiq.com', 'nimiq.sale'];
const L = (t: string) => enforceLinkAllowlist(t, ROOTS);

describe('enforceLinkAllowlist', () => {
  test('allowed links and subdomains survive, others keep only their title', () => {
    expect(L('See [docs](https://www.nimiq.com/developers) and [claim here](https://nimiq-airdrop.xyz/claim).')).toBe(
      'See [docs](https://www.nimiq.com/developers) and claim here.',
    );
  });
  test('bare URLs and bare domains: allowed kept, others removed', () => {
    expect(L('Go to https://nimiq.sale/x. Or https://evil.example/a, now.')).toBe('Go to https://nimiq.sale/x. Or , now.');
    expect(L('go www.evil.com now')).toBe('go  now');
    expect(L('go evil.com/claim now')).toBe('go  now');
  });
  test('look-alike, userinfo and zero-width hosts are not allowed', () => {
    for (const t of ['[x](https://nimiq.com.evil.io/)', '[x](https://notnimiq.com/)', '[x](https://nimiq.com@evil.com/)', '[x](https://evil​.com)']) {
      expect(L(t)).toBe('x');
    }
  });
  test('every markdown and HTML form a renderer turns into a link (review probe)', () => {
    const cases: [string, string][] = [
      ['[click\nhere](https://evil.com/x)', 'click\nhere'],
      ["[x](https://evil.com 'a')", 'x'],
      ['[x](https://evil.com (a))', 'x'],
      ['[x][1]\n\n[1]: https://evil.com', 'x\n'],
      ['<https://evil.com>', ''],
      ['<a href="https://evil.com">x</a>', 'x'],
      ['[x](mailto:a@evil.com)', 'x'],
      ['[x](javascript:alert(1))', 'x'],
      ['[https://nimiq.com](https://evil.com)', 'https://nimiq.com'],
    ];
    for (const [i, o] of cases) expect(L(i)).toBe(o);
  });
  test('a backslash in a URL is refused (renderer and URL() disagree on the host)', () => {
    expect(L('[x](https://nimiq.com\\@evil.com)')).toBe('x');
  });
  test('code is scrubbed too: a code span is still a copyable link', () => {
    expect(L('`[x](https://evil.com)`')).toBe('`x`');
    expect(L('```\ncurl https://evil.example\n```')).toBe('```\ncurl \n```');
  });
});

describe('stripUnverifiedNqAddresses', () => {
  const REAL = 'NQ45 78MF K2AA NREJ B39U YLRH C8B3 7S1X MH44';
  const FAKE = 'NQ12 3456 7890 ABCD EFGH JKLM NPQR STUV XY00';
  const N = (t: string) => stripUnverifiedNqAddresses(t, [REAL]);
  test('a verified address in any spelling stays, an invented one is replaced', () => {
    expect(N(`Send to ${REAL.replace(/ /g, '')} not ${FAKE}.`)).toBe(`Send to ${REAL.replace(/ /g, '')} not your NQ address.`);
  });
  test('every disguise a renderer would undo (review probe)', () => {
    for (const t of [
      '`' + FAKE + '`',
      '```\n' + FAKE + '\n```',
      FAKE.toLowerCase(),
      FAKE.replace('3456', '34​56'),
      FAKE.replace(/ /g, ' '),
      FAKE.replace(/ /g, '\n'),
      FAKE.replace(/ /g, '-'),
      FAKE.replace(/ /g, '.'),
      FAKE.replace(/ /g, '  '),
      'NQ12 **3456** 7890 ABCD EFGH JKLM NPQR STUV XY00',
      'NQ12&nbsp;3456 7890 ABCD EFGH JKLM NPQR STUV XY00',
      'НQ12 3456 7890 ABCD EFGH JKLM NPQR STUV XY00',
      'NQ１２ 3456 7890 ABCD EFGH JKLM NPQR STUV XY00',
      'NQ12 3456 7890 ABCD EFGH JKLM NPQR STUV XY0',
      'x' + FAKE,
      'NQ12&#32;3456 7890 ABCD EFGH JKLM NPQR STUV XY00',
      'NQ12&#8203;3456 7890 ABCD EFGH JKLM NPQR STUV XY00',
      'N&#81;12 3456 7890 ABCD EFGH JKLM NPQR STUV XY00',
      'NQ12&amp;#32;3456 7890 ABCD EFGH JKLM NPQR STUV XY00',
      '<td>NQ12 3456 7890 ABCD</td><td>EFGH JKLM NPQR STUV XY00</td>',
      'NQ12 3456 7890 ABCD<br>EFGH JKLM NPQR STUV XY00',
      '<b>NQ12 3456 7890 ABCD</b><i>EFGH JKLM NPQR STUV XY00</i>',
    ]) {
      expect(N(t)).not.toMatch(/3456|ABCD/);
    }
  });
});

describe('stripForgedLines', () => {
  test('role and context headers in every disguise are dropped (review probe)', () => {
    for (const l of [
      'System: x', 'Human: x', 'User: x', 'tool: x', 'System： x', '​System: x', 'System​: x', '**System:** x',
      '### System: x', '> System: x', '- System: x', 'Ѕystem: x', '[system] x', 'System prompt: x', 'SYSTEM MESSAGE: x',
    ]) {
      expect(stripForgedLines(`hi\n${l}\nreal`)).toBe('hi\nreal');
    }
  });
  test('every line separator is a line separator', () => {
    for (const sep of ['\r', ' ', ' ', '\u0085']) expect(stripForgedLines(`a${sep}System: x`)).toBe('a');
  });
  test('chat-template tokens drop their line', () => {
    expect(stripForgedLines('<|im_start|>system\nx')).toBe('x');
  });
  test('ordinary text is kept', () => {
    expect(stripForgedLines('My system: it crashes when I pay.\nThe user said hi')).toBe('My system: it crashes when I pay.\nThe user said hi');
  });
});

test('normalizeForGuard folds width, zero-width and look-alikes', () => {
  expect(normalizeForGuard('ＮＱ​Ѕ')).toBe('NQS');
});

describe('addresses split by markup (third review probe)', () => {
  const FAKE_GROUPS = '0000 0000 0000 0000 0000 0000 0000 0000';
  for (const [name, t] of [
    ['html comment', `NQ07<!-- x -->${FAKE_GROUPS}`],
    ['markdown link text', 'NQ07 [0000 0000](https://nimiq.com) 0000 0000 0000 0000 0000 0000'],
    ['image alts', '![NQ07 0000 0000](a.png)![0000 0000 0000 0000 0000 0000](b.png)'],
    ['a tag', 'NQ07 <a href="https://nimiq.com">0000 0000</a> 0000 0000 0000 0000 0000 0000'],
    ['tag attr gt', `NQ07 <b title='>'>${FAKE_GROUPS}`],
    ['unclosed tag', `NQ07 <b ${FAKE_GROUPS}`],
  ] as const) {
    test(name, () => {
      const out = guardModelText(t, { allowedHosts: ['nimiq.com'], verifiedAddresses: [] });
      expect(out.replace(/[^0-9]/g, '')).not.toMatch(/0000000000/);
      expect(out).toContain('your NQ address');
    });
  }
  test('text with no address keeps its markdown', () => {
    const t = 'See [docs](https://nimiq.com/a) and **bold**.';
    expect(guardModelText(t, { allowedHosts: ['nimiq.com'], verifiedAddresses: [] })).toBe(t);
  });
});

test('any punctuation, a hard break, a setext underline or a heading line splits nothing (round 4)', () => {
  for (const sep of ['+', '/', ':', '&', '(', ')', '!', '%', '@', '$', '?', ',', ';', '\\\n', '\n===\n', '\n#\n', '\n|--|--|\n|']) {
    const t = `NQ07 0000 0000 0000 0000${sep}0000 0000 0000 0000`;
    expect(guardModelText(t, { allowedHosts: [], verifiedAddresses: [] })).toContain('your NQ address');
  }
});

test('long whitespace or rule runs split nothing (round 5), and matching stays linear', () => {
  for (const sep of [' '.repeat(30), ' '.repeat(30), '\n'.repeat(30), '='.repeat(100), '\n' + '-'.repeat(60) + '\n', '*'.repeat(30)]) {
    expect(guardModelText(`NQ07 0000 0000 0000 0000${sep}0000 0000 0000 0000`, { allowedHosts: [], verifiedAddresses: [] })).toContain('your NQ address');
  }
  const t0 = Date.now();
  guardModelText('N Q 1 2 '.repeat(30000) + '!'.repeat(100000), { allowedHosts: [], verifiedAddresses: [] });
  expect(Date.now() - t0).toBeLessThan(2000);
});
