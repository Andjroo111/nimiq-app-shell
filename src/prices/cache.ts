// A price cache that survives rate limits (recon C2-254).
//
// Price APIs (CoinGecko and friends) 429 a busy page fast. Fresh quotes are
// served for `ttlMs`; when a refresh fails, a quote up to `staleMaxMs` old is
// still served; anything older is null, never a guess. A 429's Retry-After
// pauses refreshes. Quotes persist to storage so a reload is not a cold start.
// The fetcher is injected: this file makes no network calls of its own.

export class PriceRateLimitError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super(`price source rate limited for ${retryAfterMs}ms`);
    this.name = 'PriceRateLimitError';
  }
}

export interface PriceCacheOptions {
  /** Fetch current quotes for ids. Throw PriceRateLimitError on a 429. */
  fetchQuotes(ids: string[]): Promise<Record<string, number>>;
  /** Default 60 s. */
  ttlMs?: number;
  /** Oldest quote ever served. Default 10 min. */
  staleMaxMs?: number;
  storage?: { getItem(k: string): string | null; setItem(k: string, v: string): void } | null;
  key?: string;
  now?: () => number;
}

export interface PriceCache {
  /** id -> price, or null when no quote young enough exists. */
  get(ids: string[]): Promise<Record<string, number | null>>;
}

type Entry = { price: number; at: number };

export function createPriceCache(o: PriceCacheOptions): PriceCache {
  const ttl = Math.max(0, o.ttlMs ?? 60_000);
  const staleMax = Math.max(ttl, o.staleMaxMs ?? 600_000);
  const now = o.now ?? Date.now;
  const key = o.key ?? 'nq-shell:prices:v1';
  let storage = o.storage;
  if (storage === undefined) {
    try {
      storage = (globalThis as { localStorage?: PriceCacheOptions['storage'] }).localStorage ?? null;
    } catch {
      storage = null;
    }
  }

  const cache = new Map<string, Entry>();
  try {
    const raw = JSON.parse(storage?.getItem(key) ?? '{}') as Record<string, Entry>;
    for (const [id, e] of Object.entries(raw)) {
      if (e && Number.isFinite(e.price) && e.price > 0 && Number.isFinite(e.at) && now() - e.at <= staleMax) cache.set(id, e);
    }
  } catch {
    /* corrupt or blocked storage: start cold */
  }
  const persist = () => {
    try {
      storage?.setItem(key, JSON.stringify(Object.fromEntries(cache)));
    } catch {
      /* quota or private mode: memory only */
    }
  };

  let pausedUntil = 0;
  let inflight: Promise<void> | null = null;
  let inflightIds = new Set<string>();

  const refresh = async (ids: string[]) => {
    if (now() < pausedUntil) return;
    try {
      const q = await o.fetchQuotes(ids);
      const at = now();
      for (const id of ids) {
        const p = q[id];
        if (typeof p === 'number' && Number.isFinite(p) && p > 0) cache.set(id, { price: p, at });
      }
      persist();
    } catch (e) {
      if (e instanceof PriceRateLimitError) pausedUntil = now() + Math.max(1000, e.retryAfterMs);
      // Any failure: fall through to whatever stale-but-allowed quotes exist.
    }
  };

  return {
    async get(ids) {
      const t = now();
      const due = ids.filter((id) => {
        const e = cache.get(id);
        return !e || t - e.at >= ttl;
      });
      if (due.length > 0) {
        // One refresh at a time. A caller that joined someone else's refresh
        // for other ids runs its own once that one is done.
        const start = (ids: string[]) => {
          inflightIds = new Set(ids);
          inflight = refresh(ids).finally(() => (inflight = null));
          return inflight;
        };
        if (inflight === null) {
          await start(due);
        } else {
          const covered = inflightIds;
          await inflight;
          // Ids the joined refresh never asked for get their own, once.
          const missed = due.filter((id) => !covered.has(id));
          if (missed.length > 0) await (inflight ?? start(missed));
        }
      }
      const out: Record<string, number | null> = {};
      const t2 = now();
      for (const id of ids) {
        const e = cache.get(id);
        out[id] = e && t2 - e.at <= staleMax ? e.price : null;
      }
      return out;
    },
  };
}
