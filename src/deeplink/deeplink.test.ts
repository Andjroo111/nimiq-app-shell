// URL shapes and the opener ladder.
//
// The URL strings are pinned character for character. Pay parses them with no
// tolerance: an encoded slash opens the app on its home screen instead of the
// page (C2-144), and a missing `package=` sends Android to the browser.
import { describe, expect, test } from 'bun:test';
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  buildOpenInPayUrl,
  detectInAppBrowser,
  detectMobilePlatform,
  openInNimiqPay,
  type DeeplinkDocument,
  type DeeplinkWindow,
} from './index';

const PLAY_ENC = encodeURIComponent(PLAY_STORE_URL);

describe('buildOpenInPayUrl', () => {
  test('a bare origin sends host only', () => {
    const u = buildOpenInPayUrl('https://nimiq.gift');
    expect(u.https).toBe('https://nimpay.app/miniapps/open/nimiq.gift');
    expect(u.scheme).toBe('nimiqpay://miniapp?url=nimiq.gift');
    expect(u.androidIntent).toBe(
      `intent://nimpay.app/miniapps/open/nimiq.gift#Intent;scheme=https;package=com.nimiq.pay;S.browser_fallback_url=${PLAY_ENC};end`,
    );
    expect(u.store).toEqual({ ios: APP_STORE_URL, android: PLAY_STORE_URL });
  });

  test('a trailing slash is the same bare origin', () => {
    expect(buildOpenInPayUrl('https://nimiq.gift/').scheme).toBe('nimiqpay://miniapp?url=nimiq.gift');
  });

  test('an origin with a port keeps the port', () => {
    const u = buildOpenInPayUrl('http://localhost:5173');
    expect(u.https).toBe('https://nimpay.app/miniapps/open/localhost:5173');
    expect(u.scheme).toBe('nimiqpay://miniapp?url=localhost:5173');
  });

  test('a path with a query becomes a full absolute URL in the scheme', () => {
    const u = buildOpenInPayUrl('https://nimiq.gift/claim/abc?ref=x&n=2');
    expect(u.https).toBe('https://nimpay.app/miniapps/open/nimiq.gift/claim/abc?ref=x&n=2');
    expect(u.scheme).toBe('nimiqpay://miniapp?url=https://nimiq.gift/claim/abc%3Fref%3Dx%26n%3D2');
    expect(u.androidIntent.startsWith('intent://nimpay.app/miniapps/open/nimiq.gift/claim/abc?ref=x&n=2#Intent;')).toBe(true);
  });

  // The whole of C2-144: a plain encodeURIComponent turns every slash into
  // %2F, and Pay then opens the mini app but drops the page.
  test('the scheme never carries %2F or %3A', () => {
    const u = buildOpenInPayUrl('https://win.nimiq.fun:8443/hunt/room/7');
    expect(u.scheme).toBe('nimiqpay://miniapp?url=https://win.nimiq.fun:8443/hunt/room/7');
    expect(u.scheme).not.toMatch(/%2F|%3A/i);
    expect(encodeURIComponent('https://a.b/c')).toContain('%2F');
  });

  test('a target without a scheme is read as https', () => {
    expect(buildOpenInPayUrl('nimiq.gift/claim').https).toBe('https://nimpay.app/miniapps/open/nimiq.gift/claim');
  });

  test('store URLs can be overridden', () => {
    const u = buildOpenInPayUrl('https://a.com', { playStoreUrl: 'https://p.example', appStoreUrl: 'https://i.example' });
    expect(u.store).toEqual({ ios: 'https://i.example', android: 'https://p.example' });
    expect(u.androidIntent).toContain(`S.browser_fallback_url=${encodeURIComponent('https://p.example')};end`);
  });
});

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  ipadAsMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
};

describe('detectMobilePlatform', () => {
  test('iPhone and Android', () => {
    expect(detectMobilePlatform({ userAgent: UA.iphone })).toBe('ios');
    expect(detectMobilePlatform({ userAgent: UA.android })).toBe('android');
    expect(detectMobilePlatform({ userAgent: UA.desktop })).toBeNull();
  });

  test('iPadOS reporting itself as a Mac is iOS when it has touch points', () => {
    expect(detectMobilePlatform({ userAgent: UA.ipadAsMac, maxTouchPoints: 5 })).toBe('ios');
    // a real Mac: same UA, no touch
    expect(detectMobilePlatform({ userAgent: UA.ipadAsMac, maxTouchPoints: 0 })).toBeNull();
  });

  test('no navigator is null', () => {
    expect(detectMobilePlatform(undefined)).toBeNull();
  });
});

describe('detectInAppBrowser', () => {
  const cases: Array<[string, string]> = [
    [`${UA.iphone} Snapchat/12.80.0.40`, 'snapchat'],
    [`${UA.iphone} Instagram 330.0.0.40.92 (iPhone15,2; iOS 17_4)`, 'instagram'],
    [`${UA.iphone} [FBAN/FBIOS;FBAV/460.0.0.37.106;FBBV/1]`, 'facebook'],
    [`${UA.android} [FB_IAB/FB4A;FBAV/460.0.0.48.109;]`, 'facebook'],
    [`${UA.android} FBAV/460.0.0.48.109`, 'facebook'],
    [`${UA.iphone} musical_ly_33.8.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en Region/US TikTok`, 'tiktok'],
    [`${UA.android} BytedanceWebview/d8a21c6`, 'tiktok'],
    [`${UA.iphone} Safari Line/14.5.0`, 'line'],
  ];
  for (const [ua, name] of cases) {
    test(name + ': ' + ua.slice(-32), () => {
      expect(detectInAppBrowser(ua)).toBe(name as never);
    });
  }

  test('plain Safari, Chrome and a missing UA are null', () => {
    expect(detectInAppBrowser(UA.iphone)).toBeNull();
    expect(detectInAppBrowser(UA.android)).toBeNull();
    expect(detectInAppBrowser(undefined)).toBeNull();
  });
});

/** A window with a hand-cranked clock, so the 5 s fallback runs in 0 ms. */
function fakeEnv(ua: string, extra: Partial<DeeplinkWindow> = {}) {
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const listeners = new Set<() => void>();
  const doc: DeeplinkDocument & { visibilityState: string } = {
    visibilityState: 'visible',
    addEventListener: (_t, fn) => listeners.add(fn),
    removeEventListener: (_t, fn) => listeners.delete(fn),
  };
  const win: DeeplinkWindow = {
    navigator: { userAgent: ua, maxTouchPoints: 5 },
    setTimeout: (fn, ms) => {
      const id = nextId++;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimeout: (id) => timers.delete(id as number),
    ...extra,
  };
  const visited: string[] = [];
  return {
    win,
    doc,
    visited,
    navigate: (url: string) => visited.push(url),
    listeners,
    pending: () => timers.size,
    advance(ms: number) {
      now += ms;
      for (const [id, t] of [...timers]) {
        if (t.at <= now) {
          timers.delete(id);
          t.fn();
        }
      }
    },
    hide() {
      doc.visibilityState = 'hidden';
      for (const fn of [...listeners]) fn();
    },
  };
}

describe('openInNimiqPay', () => {
  const TARGET = 'https://nimiq.gift/claim/abc';

  test('inside Pay navigates straight to the target', () => {
    for (const key of ['nimiqPay', 'nimiq'] as const) {
      const env = fakeEnv(UA.iphone, { [key]: {} });
      const r = openInNimiqPay(TARGET, { win: env.win, doc: env.doc, navigate: env.navigate });
      expect(r.route).toBe('inside-pay');
      expect(env.visited).toEqual([TARGET]);
      expect(env.pending()).toBe(0);
    }
  });

  test('Android uses the intent URL and sets no timer', () => {
    const env = fakeEnv(UA.android);
    const r = openInNimiqPay(TARGET, { win: env.win, doc: env.doc, navigate: env.navigate });
    expect(r.route).toBe('android');
    expect(env.visited).toEqual([buildOpenInPayUrl(TARGET).androidIntent]);
    expect(env.pending()).toBe(0);
  });

  test('iOS tries the scheme, then the App Store after 5 s if the page stayed visible', () => {
    const env = fakeEnv(UA.iphone);
    const r = openInNimiqPay(TARGET, { win: env.win, doc: env.doc, navigate: env.navigate });
    expect(r.route).toBe('ios');
    expect(env.visited).toEqual([buildOpenInPayUrl(TARGET).scheme]);
    env.advance(4999);
    expect(env.visited).toHaveLength(1);
    env.advance(1);
    expect(env.visited).toEqual([buildOpenInPayUrl(TARGET).scheme, APP_STORE_URL]);
    expect(env.listeners.size).toBe(0);
  });

  test('iOS: visibilitychange to hidden cancels the store fallback', () => {
    const env = fakeEnv(UA.iphone);
    openInNimiqPay(TARGET, { win: env.win, doc: env.doc, navigate: env.navigate });
    env.advance(1200);
    env.hide();
    expect(env.pending()).toBe(0);
    env.doc.visibilityState = 'visible'; // the visitor comes back from Pay
    env.advance(10_000);
    expect(env.visited).toEqual([buildOpenInPayUrl(TARGET).scheme]);
    expect(env.listeners.size).toBe(0);
  });

  test('iOS: cancel() stops the fallback too', () => {
    const env = fakeEnv(UA.iphone);
    openInNimiqPay(TARGET, { win: env.win, doc: env.doc, navigate: env.navigate }).cancel();
    env.advance(6000);
    expect(env.visited).toHaveLength(1);
  });

  test('iPadOS-as-Mac takes the iOS route', () => {
    const env = fakeEnv(UA.ipadAsMac);
    expect(openInNimiqPay(TARGET, { win: env.win, doc: env.doc, navigate: env.navigate }).route).toBe('ios');
  });

  test('desktop gets the https App Link and the in-app browser is reported', () => {
    const env = fakeEnv(UA.desktop);
    env.win.navigator = { userAgent: UA.desktop, maxTouchPoints: 0 };
    const r = openInNimiqPay(TARGET, { win: env.win, doc: env.doc, navigate: env.navigate });
    expect(r.route).toBe('desktop');
    expect(env.visited).toEqual([buildOpenInPayUrl(TARGET).https]);

    const ig = fakeEnv(`${UA.iphone} Instagram 330.0`);
    const r2 = openInNimiqPay(TARGET, { win: ig.win, doc: ig.doc, navigate: ig.navigate });
    expect(r2.inAppBrowser).toBe('instagram');
    r2.cancel();
  });
});
