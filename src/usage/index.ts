// Client half of the judge-facing unique-wallet counter. The server half is
// createUsageLedger in nimiq-settlement; this file only does two things:
//
//   1. acquisitionSource(): first-touch ?ref= / ?utm_source= for this tab, in
//      sessionStorage. No cookie, no third-party tracker. Send it with the
//      login request; the server records it on the signed-in wallet.
//   2. fetchUsage(): read GET /api/usage and validate it. A bad or failed read
//      is { ok: false }, never a made-up number.
//
// There is no record() here on purpose: a wallet is counted by the server
// from a verified login or a paid settlement, never from a client POST.

import type { StorageLike } from '../session/token';

/** The public summary shape served by nimiq-settlement's createUsageHandler. */
export interface UsageSummary {
  updatedAt: number;
  uniqueWallets: number;
  signedInWallets: number;
  paidWallets: number;
  activatedWallets: number;
  repeatWallets: number;
  activeToday: number;
  active7Days: number;
  events: Array<{ event: string; wallets: number; count: number }>;
  sources: Array<{ source: string; wallets: number }>;
  minCohort: number;
  hiddenRows: number;
}

export type UsageRead = { ok: true; summary: UsageSummary } | { ok: false; reason: 'network' | 'status' | 'shape' };

const STORAGE_KEY = 'nimiq-shell:acquisition-source';
const COUNTS = [
  'updatedAt', 'uniqueWallets', 'signedInWallets', 'paidWallets', 'activatedWallets',
  'repeatWallets', 'activeToday', 'active7Days', 'minCohort', 'hiddenRows',
] as const;

/** Same rule as the server's safeSource: lowercase [a-z0-9_-], at most 32 chars. */
export function normalizeSource(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const s = value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 32).replace(/^-+|-+$/g, '');
  return s || undefined;
}

/** First-touch source for this tab, or undefined. Never throws (private mode, blocked storage). */
export function acquisitionSource(opts: { search?: string; storage?: StorageLike | null } = {}): string | undefined {
  try {
    const search = opts.search ?? globalThis.location?.search ?? '';
    const storage = opts.storage === undefined ? globalThis.sessionStorage : opts.storage;
    const params = new URLSearchParams(search);
    const incoming = normalizeSource(params.get('ref') ?? params.get('utm_source'));
    let existing: string | undefined;
    try {
      existing = normalizeSource(storage?.getItem(STORAGE_KEY));
    } catch {
      existing = undefined;
    }
    if (incoming && !existing) {
      try {
        storage?.setItem(STORAGE_KEY, incoming);
      } catch {
        // Storage blocked: still report this page's source.
      }
    }
    return existing ?? incoming;
  } catch {
    return undefined;
  }
}

const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

/** The summary, or null when the body is not one. Treats the server's JSON as untrusted. */
export function parseUsageSummary(body: unknown): UsageSummary | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (b.unavailable === true) return null;
  if (!COUNTS.every((k) => count(b[k]))) return null;
  if (!Array.isArray(b.events) || !Array.isArray(b.sources)) return null;
  const events: UsageSummary['events'] = [];
  for (const e of b.events as unknown[]) {
    const r = e as Record<string, unknown> | null;
    if (!r || typeof r.event !== 'string' || !count(r.wallets) || !count(r.count)) return null;
    events.push({ event: r.event, wallets: r.wallets, count: r.count });
  }
  const sources: UsageSummary['sources'] = [];
  for (const s of b.sources as unknown[]) {
    const r = s as Record<string, unknown> | null;
    if (!r || typeof r.source !== 'string' || !count(r.wallets)) return null;
    sources.push({ source: r.source, wallets: r.wallets });
  }
  const out = Object.fromEntries(COUNTS.map((k) => [k, b[k]])) as Omit<UsageSummary, 'events' | 'sources'>;
  return { ...out, events, sources };
}

/** GET the public summary. Default url '/api/usage'. Never throws. */
export async function fetchUsage(
  opts: { url?: string; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<UsageRead> {
  const { url = '/api/usage', fetchImpl = globalThis.fetch, timeoutMs = 10_000 } = opts;
  let res: Response;
  try {
    res = await fetchImpl(url, { method: 'GET', signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    return { ok: false, reason: 'network' };
  }
  if (!res.ok) return { ok: false, reason: 'status' };
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, reason: 'shape' };
  }
  const summary = parseUsageSummary(body);
  return summary ? { ok: true, summary } : { ok: false, reason: 'shape' };
}
