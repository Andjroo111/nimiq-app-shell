// The wallet session token, carried as a header as well as (or instead of) a
// cookie (recon C2-270).
//
// Nimiq Pay's WebView drops SameSite cookies, so a signed-in user looks
// signed out on the next request. The server's login returns a token (e.g.
// nimiq-settlement createAuth().login -> token); the client keeps it here and
// sends it as `Authorization: Bearer <token>` on its own API calls only.
//
// Scope rules, because a bearer token is a key:
//   - attached only to same-origin URLs, or to origins the app lists;
//   - never written into a URL;
//   - bound to the wallet it was issued for: switching account clears it.

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export interface SessionTokenStore {
  get(address?: string | null): string | null;
  set(token: string, address: string, expiresAt: number): void;
  clear(): void;
  /** fetch that adds the bearer header to allowed origins. */
  fetch: typeof fetch;
}

export interface SessionTokenOptions {
  key?: string;
  storage?: StorageLike | null;
  /** Origins besides the page's own that may receive the token. */
  allowedOrigins?: readonly string[];
  /** Defaults to location.origin. */
  pageOrigin?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

const compact = (a: string) => a.replace(/\s+/g, '').toUpperCase();

export function createSessionTokenStore(o: SessionTokenOptions = {}): SessionTokenStore {
  const key = o.key ?? 'nq-shell:session:v1';
  const now = o.now ?? Date.now;
  let mem: string | null = null;
  let store: StorageLike | null = null;
  if (o.storage !== undefined) store = o.storage;
  else {
    try {
      store = (globalThis as { localStorage?: StorageLike }).localStorage ?? null;
    } catch {
      store = null;
    }
  }
  const read = (): string | null => {
    try {
      return store ? store.getItem(key) : mem;
    } catch {
      return mem;
    }
  };
  const write = (v: string | null) => {
    mem = v;
    try {
      if (!store) return;
      if (v === null) store.removeItem(key);
      else store.setItem(key, v);
    } catch {
      /* memory copy already holds it */
    }
  };

  const pageOrigin = o.pageOrigin ?? (globalThis as { location?: Location }).location?.origin ?? null;
  const allowed = new Set([...(o.allowedOrigins ?? []), ...(pageOrigin ? [pageOrigin] : [])].map((x) => x.replace(/\/+$/, '')));
  const baseFetch = o.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));

  const api: SessionTokenStore = {
    get(address) {
      const raw = read();
      if (!raw) return null;
      try {
        const v = JSON.parse(raw) as { token?: unknown; address?: unknown; expiresAt?: unknown };
        if (typeof v.token !== 'string' || typeof v.address !== 'string' || typeof v.expiresAt !== 'number') return null;
        if (now() >= v.expiresAt) {
          write(null);
          return null;
        }
        if (address != null && compact(address) !== compact(v.address)) {
          write(null); // another wallet is connected now
          return null;
        }
        return v.token;
      } catch {
        return null;
      }
    },
    set(token, address, expiresAt) {
      if (!token || !address) return;
      write(JSON.stringify({ token, address, expiresAt }));
    },
    clear() {
      write(null);
    },
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      let origin: string | null = null;
      try {
        origin = new URL(url, pageOrigin ?? undefined).origin;
      } catch {
        origin = null;
      }
      const token = api.get();
      if (!token || !origin || !allowed.has(origin)) return baseFetch(input, init);
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      if (!headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
      return baseFetch(input, { ...init, headers });
    }) as typeof fetch,
  };
  return api;
}
