// Wallet-scoped, device-local history (recon C2-282).
//
// A phone gets handed around, so history is keyed by the connected wallet
// and is empty with none connected. A row is written when an order is
// CREATED, not when it settles, so a closed tab still leaves a trail. Only the
// identifying shell is kept (ref, kind, time, an optional label); amounts and
// status are re-read from the source when a row opens, never trusted from
// here. Storage cannot throw: Safari private mode and some WebViews reject
// localStorage, and then this runs on an in-memory shim for the session.

export interface HistoryEntry {
  /** Unique per order, e.g. an invoice id. Re-remembering a ref moves it to the top. */
  ref: string;
  kind: string;
  createdAt: number;
  label?: string;
}

interface Row extends HistoryEntry {
  owner: string;
}

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export interface DeviceHistoryOptions {
  /** Default globalThis.localStorage, falling back to memory. */
  storage?: StorageLike | null;
  key?: string;
  /** Rows kept per wallet. Default 50. */
  cap?: number;
}

export interface DeviceHistory {
  remember(owner: string | null | undefined, entry: HistoryEntry): void;
  /** Newest first. [] when no wallet is connected. */
  list(owner: string | null | undefined): HistoryEntry[];
  forget(owner: string | null | undefined, ref: string): void;
}

const ownerKey = (a: string | null | undefined): string | null => {
  if (typeof a !== 'string') return null;
  const k = a.replace(/\s+/g, '').toUpperCase();
  return k ? k : null;
};

function memory(): StorageLike {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

/** Wraps a storage so neither read nor write can throw. */
function safe(s: StorageLike | null | undefined): StorageLike {
  const fallback = memory();
  let broken = !s;
  return {
    getItem(k) {
      if (!broken) {
        try {
          return s!.getItem(k);
        } catch {
          broken = true;
        }
      }
      return fallback.getItem(k);
    },
    setItem(k, v) {
      if (!broken) {
        try {
          s!.setItem(k, v);
          return;
        } catch {
          broken = true;
        }
      }
      fallback.setItem(k, v);
    },
  };
}

export function createDeviceHistory(o: DeviceHistoryOptions = {}): DeviceHistory {
  let ls: StorageLike | null = null;
  if (o.storage !== undefined) ls = o.storage;
  else {
    try {
      ls = (globalThis as { localStorage?: StorageLike }).localStorage ?? null;
    } catch {
      ls = null; // accessing localStorage itself can throw
    }
  }
  const store = safe(ls);
  const key = o.key ?? 'nq-shell:history:v1';
  const c0 = o.cap ?? 50;
  if (!Number.isFinite(c0)) throw new RangeError('createDeviceHistory: cap must be finite');
  const cap = Math.max(1, Math.floor(c0));
  // Many wallets on one device: keep the whole store bounded too.
  const totalCap = cap * 20;

  const read = (): Row[] => {
    try {
      const v = JSON.parse(store.getItem(key) ?? '[]');
      return Array.isArray(v)
        ? v.filter((r): r is Row => r && typeof r.owner === 'string' && typeof r.ref === 'string' && typeof r.kind === 'string' && typeof r.createdAt === 'number')
        : [];
    } catch {
      return [];
    }
  };
  const write = (rows: Row[]) => store.setItem(key, JSON.stringify(rows));

  return {
    remember(owner, entry) {
      const k = ownerKey(owner);
      if (!k || !entry?.ref) return;
      const rows = read().filter((r) => !(r.owner === k && r.ref === entry.ref));
      const mine = rows.filter((r) => r.owner === k);
      const others = rows.filter((r) => r.owner !== k);
      const row: Row = { owner: k, ref: entry.ref, kind: entry.kind, createdAt: entry.createdAt };
      if (entry.label !== undefined) row.label = entry.label;
      const kept = [...others, row, ...mine.slice(0, cap - 1)];
      // Oldest wallets' rows go first once the device-wide bound is hit.
      write(kept.length > totalCap ? kept.slice(kept.length - totalCap) : kept);
    },
    list(owner) {
      const k = ownerKey(owner);
      if (!k) return [];
      return read()
        .filter((r) => r.owner === k)
        .map(({ owner: _o, ...e }) => e);
    },
    forget(owner, ref) {
      const k = ownerKey(owner);
      if (!k) return;
      write(read().filter((r) => !(r.owner === k && r.ref === ref)));
    },
  };
}
