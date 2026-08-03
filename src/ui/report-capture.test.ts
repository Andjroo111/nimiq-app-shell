// What the capture puts in a bug report — specifically, what it leaves OUT.
//
// `pageContext()` is the structured half of a bot-mode report: it goes browser →
// bot.nimiq.tech → an LLM-written issue on a repo that may well be public, with
// no server of the app's own in between. So the URL it snapshots is the one
// field here that can carry an identifier the app never chose to send, and these
// tests pin that it does not.
//
// The globals are stubbed rather than mocked through a DOM: `pageContext` reads
// `location` / `document` behind typeof guards precisely so it works in a
// non-DOM runtime, and this repo has no DOM harness by convention.
import { afterEach, describe, expect, test } from 'bun:test';
import { pageContext } from './report-capture';

type Loose = Record<string, unknown>;
const g = globalThis as unknown as Loose;
const hadLocation = 'location' in g, realLocation = g.location;
const hadDocument = 'document' in g, realDocument = g.document;

function page(href: string, referrer = ''): void {
  g.location = { href };
  g.document = { title: 'Nimiq Kids', referrer };
}

afterEach(() => {
  if (hadLocation) g.location = realLocation; else delete g.location;
  if (hadDocument) g.document = realDocument; else delete g.document;
});

describe('pageContext: the URL never carries the query or the fragment', () => {
  // The leak this closes: nimiq.kids addresses nearly every call by child UUID
  // and had to switch diagnostics off wholesale because of it. A query string is
  // the same leak one level up, and unlike a UUID it has no shape to match on.
  test('a query string is dropped', () => {
    page('https://nimiq.kids/kid/?child=8f3c1d2e-4b5a-6c7d-8e9f-0a1b2c3d4e5f&debug=1');
    expect(pageContext().url).toBe('https://nimiq.kids/kid/');
  });

  test('a fragment is dropped too — hash routes carry the same ids', () => {
    page('https://nimiq.kids/parent/#/child/8f3c1d2e-4b5a-6c7d-8e9f-0a1b2c3d4e5f/jobs');
    expect(pageContext().url).toBe('https://nimiq.kids/parent/');
  });

  test('a fragment that comes before any ? is still the cut point', () => {
    page('https://nimiq.kids/app#/kid?token=s3cret');
    expect(pageContext().url).toBe('https://nimiq.kids/app');
  });

  // The other half of the trade: which page it was is the whole diagnostic value
  // of this field, so a plain URL has to survive untouched.
  test('a URL with neither is left exactly as it is', () => {
    page('https://nimiq.kids/kid/treasure');
    expect(pageContext().url).toBe('https://nimiq.kids/kid/treasure');
  });

  test('the referrer is trimmed the same way', () => {
    page('https://nimiq.kids/kid/', 'https://nimiq.life/apps?invite=8f3c1d2e-4b5a-6c7d-8e9f-0a1b2c3d4e5f');
    expect(pageContext().referrer).toBe('https://nimiq.life/apps');
  });

  test('an empty referrer stays empty rather than becoming a stray string', () => {
    page('https://nimiq.kids/kid/');
    expect(pageContext().referrer).toBe('');
  });

  test('no DOM at all: the fields are empty, not a crash', () => {
    delete g.location;
    delete g.document;
    expect(pageContext()).toMatchObject({ url: '', referrer: '', title: '' });
  });
});
