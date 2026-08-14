// Report a bug — the fleet's drop-in bug/feedback submitter.
//
// One sheet, opened from the corner control's "Report a bug" row (the fleet has
// exactly ONE header button, so a bug reporter does not get to add a second
// permanent control to the page — this is why there is no floating dot here).
// It collects {type, title, description} plus OPT-IN diagnostics and POSTs JSON
// to whatever endpoint the host names; the host's server is what turns that into
// a GitHub issue, an email, or anything else. The shell never holds a token.
//
// Ported from the Hashmark widget that proved the flow (hashmark
// app/src/client/feature/feedback-widget.ts), keeping its two hard-won fixes:
//   • backdrop dismiss on `pointerdown`, NOT `click` — iOS Safari never fires
//     `click` on a bare backdrop div, which left iPhone users with only Cancel;
//   • a failed send renders its error INSIDE the sheet with the user's text
//     intact, so a 503 (server not wired yet) never eats what they typed.
// What changed: the lime-on-black inline styling is gone. This is corner-menu
// furniture, so it wears the corner's own --nq-cc-* tokens and reads as part of
// the menu it opened from.
//
// The host decides what the page IS via `context` — the surface (kid vs parent
// app), version, anything else. Keep it free of personal data: apps in this
// fleet include ones used by minors, and this payload leaves the device.

import type { I18n } from '../i18n';
import { pageContext } from './report-capture';
import { applyTheme, type ShellTheme } from './theme';

export type ReportBugType = 'bug' | 'idea' | 'question';

/** File through nimiq.bot, the fleet's shared issue service. This is the path
 *  most apps want: no endpoint of your own, no GitHub token anywhere near your
 *  server, an AI-written issue, and reports that read the same as the ones the
 *  bot.nimiq.tech widget files. */
export interface ReportBugBot {
  /** The GitHub repo to file into, as nimiq.bot knows it (e.g. 'nimiq.kids'). */
  repo: string;
  /** Service origin. Default https://bot.nimiq.tech. */
  service?: string;
  /** Extra labels on every issue, on top of the ones the draft chooses. */
  labels?: string[];
}

export interface ReportBugOptions {
  /** File through nimiq.bot. Mutually exclusive with `endpoint`. */
  bot?: ReportBugBot;
  /** POST the raw payload to your OWN server instead, which is then responsible
   *  for filing it. Use this only when the report must not leave your origin. */
  endpoint?: string;
  /** Static fields merged into every submission (surface, app version, …).
   *  Values are sent verbatim — never put a name, address or account id here. */
  context?: Record<string, string>;
  /** Attach page context: URL, browser, viewport, and the last few console
   *  errors and failed requests (see report-capture.ts). Default true, and the
   *  sheet still lets the person untick it. */
  diagnostics?: boolean;
  /** Called after a successful submit (analytics, a host toast, …). */
  onSubmitted?: (result: SubmitFeedbackResult) => void;
  /** The host brand, same tokens the mini wallet takes.
   *
   *  It has to be passed rather than inherited: the sheet is a PORTAL onto
   *  document.body, so it sits outside the mounted control and never sees vars
   *  stamped on it. The corner forwards its own `theme` here, so wiring one
   *  themes both. */
  theme?: ShellTheme;
}

const BOT_SERVICE = 'https://bot.nimiq.tech';

/** Redact anything identifier-shaped: NQ addresses (spaced and compact forms)
 *  and UUIDs. This runs CLIENT-side and it has to, because in bot mode the
 *  browser talks to the issue service directly — there is no server of the app's
 *  own left in the path to scrub on the way out. Fleet apps include one used by
 *  children, where an account id in a public issue is not an acceptable
 *  debugging aid.
 *
 *  The UUID half was learned the hard way in nimiq.kids: nearly every call that
 *  app makes is addressed by CHILD UUID, so a kid tapping Buy on a pack she
 *  already owned put `POST /api/kids/8f3c…/buy → 400` — captured by
 *  report-capture, sent as context, written up by an LLM — into a PUBLIC issue.
 *  That app had to switch its diagnostics off wholesale because the shell's only
 *  redaction was the address regex. This is the half that turns them back on.
 *
 *  Deliberately ANY UUID shape (8-4-4-4-12 hex), not just v4: the version and
 *  variant nibbles are a generator's business, and a v7 or a non-conforming id
 *  from some other system identifies a person just as well. Kept to the
 *  hyphenated form — a bare 32-hex run is as likely to be a hash or a tx id, and
 *  redacting those costs real diagnostics for no privacy gain.
 *
 *  The boundary is "no hex digit either side", not `\b`. `\b` counts `_` as a
 *  word character, so `kid_<uuid>` — a cache key, a storage key, an avatar
 *  filename — would sail straight through the very regex written to catch it.
 *  Written as a captured leading character rather than a lookbehind on purpose:
 *  a lookbehind is a SYNTAX error on Safari below 16.4, and a syntax error in a
 *  regex literal takes the whole module down with it, in a shell every app in
 *  the fleet loads.
 *
 *  The name stays `scrubAddresses` because fleet apps import it. */
export function scrubAddresses(text: string): string {
  return text
    .replace(/NQ\d{2}[\s]?(?:[0-9A-HJ-NP-VXY]{4}[\s]?){8}/gi, '[address redacted]')
    .replace(
      /(^|[^0-9a-f])([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?![0-9a-f])/gi,
      '$1[id redacted]',
    );
}

function scrubDeep<T>(value: T): T {
  if (typeof value === 'string') return scrubAddresses(value) as unknown as T;
  if (Array.isArray(value)) return value.map(scrubDeep) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = scrubDeep(v);
    return out as unknown as T;
  }
  return value;
}

export interface FeedbackInput {
  type: ReportBugType | '';
  title: string;
  description: string;
  /** Free-text diagnostic block, built by the sheet when the box is ticked.
   *  Endpoint mode only — bot mode sends `pageContext` as structured JSON. */
  diagnostic?: string;
  /** Host-supplied context (surface, version). Flattened into the payload. */
  context?: Record<string, string>;
  /** Captured page context (bot mode): URL, browser, console errors, failed
   *  requests. Set by the sheet when diagnostics are on. */
  pageContext?: Record<string, unknown>;
}

export interface SubmitFeedbackResult {
  ok: boolean;
  status: number;
  /** Server error message when `ok` is false; undefined on success. */
  error?: string;
  /** Server-provided mailto fallback for the unconfigured / disabled case. */
  fallbackMailto?: string;
  /** Issue number, when the server files one and says so. */
  issueNumber?: number;
  /** Link to the filed issue, when the service returns one (bot mode). */
  issueUrl?: string;
}

interface BotDraft {
  title: string;
  body: string;
  labels?: string[];
}

/** File through nimiq.bot: draft, then file. Two calls because the service
 *  writes the issue with an LLM and hands back a draft first; the widget shows
 *  that draft to an internal user for editing, and files straight through in its
 *  `data-mode="public"` path. This is the public path — the person reporting a
 *  bug from a kid's tablet has no use for a GitHub issue draft, and asking them
 *  to approve one is asking them to proofread our bug tracker.
 *
 *  Everything is scrubbed before it leaves, including the captured context:
 *  in this mode there is no server of ours in the path to do it later. */
export async function submitToBot(
  bot: ReportBugBot,
  input: FeedbackInput,
): Promise<SubmitFeedbackResult> {
  const service = (bot.service ?? BOT_SERVICE).replace(/\/$/, '');
  const context = scrubDeep({ ...(input.pageContext ?? {}), ...(input.context ?? {}) });
  const text = scrubAddresses(
    [
      `[${input.type}] ${input.title.trim()}`,
      '',
      input.description.trim(),
      ...diagnosticLines(input),
    ].join('\n'),
  );

  const post = async (path: string, body: unknown): Promise<{ res: Response; json: Record<string, unknown> }> => {
    const res = await globalThis.fetch(`${service}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    let json: Record<string, unknown> = {};
    try { json = (await res.json()) as Record<string, unknown>; } catch { /* not JSON */ }
    return { res, json };
  };

  try {
    const drafted = await post('/api/draft', { repo: bot.repo, text, context });
    if (!drafted.res.ok) {
      return { ok: false, status: drafted.res.status, error: botError(drafted.json) };
    }
    const draft = drafted.json.draft as BotDraft | undefined;
    const reportId = drafted.json.reportId as string | undefined;
    if (!draft || !reportId) {
      return { ok: false, status: drafted.res.status, error: 'The issue service sent back nothing to file.' };
    }

    const labels = [...new Set([...(draft.labels ?? []), ...(bot.labels ?? [])])];
    const issue = {
      reportId,
      repo: bot.repo,
      title: scrubAddresses(draft.title),
      body: scrubAddresses(draft.body),
    };
    let filed = await post('/api/file', { ...issue, labels });

    // A label the repo does not have takes the WHOLE issue down with it (GitHub
    // 422s the create, the service reports github_failed, and the person is told
    // to try again — which fails identically, forever). Verified against a live
    // repo: `user-report` was missing and every report died on it. A report is
    // worth more than its labels, so drop them and file it anyway.
    if (!filed.res.ok && labels.length && String(filed.json.error ?? '') === 'github_failed') {
      filed = await post('/api/file', { ...issue, labels: [] });
    }
    // The service can answer non-2xx and STILL have filed the issue (it returns
    // the url when that happens), which the widget also treats as success.
    const url = filed.json.url as string | undefined;
    if (!filed.res.ok && !url) {
      return { ok: false, status: filed.res.status, error: botError(filed.json) };
    }
    return {
      ok: true,
      status: filed.res.status,
      issueNumber: filed.json.number as number | undefined,
      issueUrl: url,
    };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

/** The part of the host's context that nimiq.bot does not render.
 *
 *  It builds an Environment block from `context` and DOES render `consoleErrors`
 *  and `networkFailures` from it (src/issue.ts) — an earlier version of this
 *  function repeated both into the text, on the strength of one filed issue that
 *  showed neither. That issue simply had no errors to show. What the service
 *  genuinely drops is everything it does not have a field for, which is the
 *  host's own: surface, app version, whatever else an app passes.
 *
 *  So only those travel here. The captured errors keep going as structured
 *  context, where they get proper fenced sections rather than a second copy. */
function diagnosticLines(input: FeedbackInput): string[] {
  const host = input.context ?? {};
  const hostLine = Object.entries(host).map(([k, v]) => `${k}: ${v}`).join(' · ');
  return hostLine ? ['', '---', hostLine] : [];
}

/** nimiq.bot answers with machine codes; these are the human versions, matching
 *  the widget's wording so the fleet says the same thing about the same failure. */
function botError(json: Record<string, unknown>): string {
  const code = String(json.error ?? '');
  return {
    rate_limited: 'Too many reports just now. Give it a minute.',
    unknown_repo: "The issue service doesn't know this app.",
    empty_report: 'Please describe the problem first.',
    github_not_configured: "The issue service isn't connected to GitHub yet.",
    github_failed: 'GitHub rejected the issue. Try again shortly.',
    already_filed: 'That report was already filed.',
  }[code] ?? 'Something went wrong.';
}

/** Validation rules: type required from the fixed set, title ≥ 5 chars,
 *  description ≥ 10. Returns an i18n KEY for the first failure, or null when the
 *  input is valid. Pure — tests call it directly, with no DOM. */
export function validateFeedbackInput(input: FeedbackInput): string | null {
  const validTypes: ReportBugType[] = ['bug', 'idea', 'question'];
  if (!input.type || !validTypes.includes(input.type as ReportBugType)) {
    return 'shell.fbErrType';
  }
  if ((input.title ?? '').trim().length < 5) return 'shell.fbErrTitle';
  if ((input.description ?? '').trim().length < 10) return 'shell.fbErrDetails';
  return null;
}

/** POST the payload. Uses `globalThis.fetch` so tests can stub it. 2xx →
 *  `{ ok: true }`. Non-2xx → `{ ok: false, error, fallbackMailto? }`. A thrown
 *  fetch (offline) surfaces as a result too — callers never see an exception. */
export async function submitFeedback(
  endpoint: string,
  input: FeedbackInput,
): Promise<SubmitFeedbackResult> {
  const payload: Record<string, string> = {
    ...(input.context ?? {}),
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim(),
  };
  if (input.diagnostic) payload.diagnostic = input.diagnostic;

  let res: Response;
  try {
    res = await globalThis.fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }

  let body: { error?: string; fallbackMailto?: string; issueNumber?: number } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    /* not JSON — fall through with an empty body */
  }
  if (res.ok) return { ok: true, status: res.status, issueNumber: body.issueNumber };
  return {
    ok: false,
    status: res.status,
    error: body.error ?? `Server returned ${res.status}.`,
    fallbackMailto: body.fallbackMailto,
  };
}

/** The opt-in diagnostic block. Deliberately boring and readable — it lands in
 *  an issue body a human reads. Path WITHOUT the query string (see options). */
export function collectDiagnostics(): string {
  const lines: string[] = [];
  try {
    if (typeof location !== 'undefined') lines.push(`page: ${location.pathname}${location.hash}`);
    if (typeof navigator !== 'undefined') {
      lines.push(`ua: ${navigator.userAgent}`);
      lines.push(`lang: ${navigator.language}`);
    }
    if (typeof window !== 'undefined') {
      lines.push(`viewport: ${window.innerWidth}×${window.innerHeight}`);
    }
  } catch {
    /* diagnostics are best-effort — never block a submission */
  }
  return lines.join('\n');
}

const SHEET_STYLE_ID = 'nimiq-shell-report-bug-style';

/** The bug glyph, in the corner's stroke-icon language (the same weight as the
 *  wallet/scan glyphs), sized by .nq-cc-cashlink-slot's 24px box. */
/** The bug, and its legs reach the shell.
 *
 *  Andrew picked the plain one out of six drawn together (plain, ladybug,
 *  beetle, ant, capsule, spider), each judged at 24, 48 and 96 and in the menu
 *  row rather than on its own, because 24px is the only size that ships. A
 *  ladybug with spots read as a picture of a ladybug; a menu row wants a glyph
 *  you recognise without studying it, and the extra marks were noise at the one
 *  size that matters.
 *
 *  Nothing here is decoration, which is why it is also the version with no
 *  clipPath and no minted ids: the ladybug needed both to cut its spots at the
 *  rim, and neither survives a shape that has no spots.
 *
 *  THE LEGS CROSS 0.2 INTO the shell, so each one reads as continuing under it
 *  rather than stopping at it (Andrew). That number is the whole range: the
 *  stroke is 0.76, so the round cap has a radius of 0.38 and sits flush with
 *  the shell's inner edge at 0, which reads as a butt join. Past about 0.3 the
 *  cap clears that edge and every leg wears a visible blob, which is what 0.35
 *  did on the first attempt. 0.2 crosses without one. Drawn at 0, 0.2, 0.35 and
 *  0.5 at 150px before choosing, because none of it is visible at 24.
 *
 *  Before any of that they did not reach the shell at all: they
 *  ran outward from (6.5,18.5) while the body's lower arc is a radius-6 circle
 *  about (12,14), so the inner end sat 1.1 units off the shell it was supposed
 *  to grow from. The antennae land on the shell for the same reason; they used
 *  to start inside the head and leave two stubs floating in it. Every one of
 *  those is invisible at 24px and obvious the moment anyone zooms, which is how
 *  Andrew found all three.
 *
 *  There is no bug in the official Nimiq asset library (searched: bug, beetle,
 *  ladybug, insect, feedback, report), which is why this glyph is hand-drawn.
 *  It follows the house icon rules rather than a registry entry: one weight,
 *  currentColor, no baked colour.
 *
 *  The viewBox is the ARTWORK's bounds plus half a stroke, not a round 24.
 *  Declaring 24x24 around a 16x13 drawing rendered it visibly smaller than the
 *  hexagon beside it in the corner's shared 24px slot. Stroke 0.76 holds 0.96px
 *  at this crop, the same weight as the cashlink and switch glyphs. */
export const BUG_ICON =
  '<svg viewBox="3.4 5.9 17.2 14.3" fill="none" stroke="currentColor" stroke-width="0.76" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 8.2a6 5.8 0 1 1-.01 0Z"/>' +
  '<path d="M12 10.404V19.65"/>' +
  '<path d="M6.425 12.456 4.118 11.795M6.2 14H3.8M6.977 16.8 4.899 18' +
  'M17.575 12.456 19.882 11.795M17.8 14h2.4M17.023 16.8 19.101 18"/>' +
  '<path d="M10.232 8.767 9 6.3M13.768 8.767 15 6.3"/></svg>';

function ensureSheetStyles(doc: Document): void {
  if (doc.getElementById(SHEET_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = SHEET_STYLE_ID;
  style.textContent = `
.nq-fb-scrim { position:fixed; inset:0; z-index:10000; display:flex; align-items:center;
  justify-content:center; padding:16px;
  background:color-mix(in srgb, var(--nq-cc-scrim, #1f2348) 50%, transparent);
  font-family:var(--nq-cc-font, 'Mulish','Muli',system-ui,sans-serif); }
.nq-fb-card { width:100%; max-width:400px; max-height:calc(100dvh - 32px); overflow:auto; padding:20px;
  border-radius:10px; background:var(--nq-cc-menu-bg, #fff); color:var(--nq-cc-menu-fg, #1f2348);
  box-shadow:var(--nq-cc-menu-shadow, 0 4px 28px rgba(0,0,0,.16)); }
.nq-fb-head { display:flex; align-items:center; gap:8px; margin:0 0 14px; }
.nq-fb-head svg { display:block; width:22px; height:22px; flex:none; }
.nq-fb-title { margin:0; font-size:17px; font-weight:700; }
.nq-fb-field { display:block; margin-bottom:12px; }
.nq-fb-label { display:block; margin-bottom:5px; font-size:12px; font-weight:600;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-fb-input { width:100%; padding:9px 10px; border:1px solid var(--nq-cc-menu-line, rgba(31,35,72,.14));
  border-radius:6px; background:var(--nq-cc-card-bg, #fff); color:var(--nq-cc-menu-fg, #1f2348);
  font-family:inherit; font-size:15px; font-weight:600; }
.nq-fb-input:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:-1px; }
textarea.nq-fb-input { min-height:104px; resize:vertical; font-weight:400; line-height:1.35; }
.nq-fb-diag { display:flex; align-items:center; gap:8px; margin-bottom:12px; font-size:13px;
  font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); cursor:pointer; }
.nq-fb-error { display:none; margin:0 0 12px; font-size:13px; font-weight:600;
  color:var(--nq-cc-danger, #d94432); }
.nq-fb-error a { color:inherit; }
.nq-fb-actions { display:flex; align-items:center; justify-content:flex-end; gap:8px; }
.nq-fb-cancel { padding:10px 12px; border:none; border-radius:6px; background:none; cursor:pointer;
  font-family:inherit; font-size:13px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5));
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-fb-cancel:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
.nq-fb-send { padding:10px 18px; border:none; border-radius:500px;
  background:var(--nq-cc-send-bg, #0582ca); color:var(--nq-cc-send-fg, #fff);
  cursor:pointer; font-family:inherit; font-size:14px; font-weight:700;
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-fb-send:hover { background:color-mix(in srgb, var(--nq-cc-send-bg, #0582ca) 88%, black); }
.nq-fb-send[disabled] { opacity:.6; cursor:default; }
.nq-fb-cancel:focus-visible, .nq-fb-send:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
.nq-fb-toast { position:fixed; left:50%; bottom:24px; transform:translateX(-50%); z-index:10001;
  padding:11px 16px; border-radius:6px;
  background:var(--nq-cc-connect-bg, #1f2348); color:var(--nq-cc-connect-fg, #fff);
  font-family:var(--nq-cc-font, 'Mulish','Muli',system-ui,sans-serif); font-size:14px; font-weight:600;
  box-shadow:0 4px 14px rgba(31,35,72,.25); }
`;
  doc.head.appendChild(style);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toast(doc: Document, msg: string, theme?: ShellTheme): void {
  const node = doc.createElement('div');
  node.className = 'nq-fb-toast';
  node.setAttribute('role', 'status');
  node.textContent = msg;
  if (theme) applyTheme(node, theme);
  doc.body.appendChild(node);
  setTimeout(() => node.remove(), 3000);
}

/** Open the report-a-bug sheet. Idempotent: a second call while one is open is
 *  a no-op rather than a stacked overlay. */
export function openReportBugSheet(doc: Document, i18n: I18n, options: ReportBugOptions): void {
  if (doc.getElementById('nq-fb-scrim')) return;
  ensureSheetStyles(doc);
  const t = (key: string): string => i18n.t(key);
  const wantsDiagnostics = options.diagnostics !== false;

  const scrim = doc.createElement('div');
  scrim.id = 'nq-fb-scrim';
  scrim.className = 'nq-fb-scrim';
  if (options.theme) applyTheme(scrim, options.theme);
  scrim.innerHTML = `
    <div class="nq-fb-card" role="dialog" aria-modal="true" aria-labelledby="nq-fb-title">
      <div class="nq-fb-head">${BUG_ICON}<h2 class="nq-fb-title" id="nq-fb-title">${escapeHtml(t('shell.reportBug'))}</h2></div>
      <label class="nq-fb-field">
        <span class="nq-fb-label">${escapeHtml(t('shell.fbType'))}</span>
        <select class="nq-fb-input" id="nq-fb-type">
          <option value="bug">${escapeHtml(t('shell.fbBug'))}</option>
          <option value="idea">${escapeHtml(t('shell.fbIdea'))}</option>
          <option value="question">${escapeHtml(t('shell.fbQuestion'))}</option>
        </select>
      </label>
      <label class="nq-fb-field">
        <span class="nq-fb-label">${escapeHtml(t('shell.fbSummary'))}</span>
        <input class="nq-fb-input" type="text" id="nq-fb-summary" maxlength="120" autocomplete="off" />
      </label>
      <label class="nq-fb-field">
        <span class="nq-fb-label">${escapeHtml(t('shell.fbDetails'))}</span>
        <textarea class="nq-fb-input" id="nq-fb-details" maxlength="4000"></textarea>
      </label>
      ${wantsDiagnostics ? `<label class="nq-fb-diag">
        <input type="checkbox" id="nq-fb-diag" checked />${escapeHtml(t('shell.fbIncludeDiag'))}
      </label>` : ''}
      <p class="nq-fb-error" id="nq-fb-error" role="alert"></p>
      <div class="nq-fb-actions">
        <button type="button" class="nq-fb-cancel" id="nq-fb-cancel">${escapeHtml(t('shell.cancel'))}</button>
        <button type="button" class="nq-fb-send" id="nq-fb-send">${escapeHtml(t('shell.fbSend'))}</button>
      </div>
    </div>`;
  doc.body.appendChild(scrim);

  const q = <T extends HTMLElement>(id: string): T => scrim.querySelector(`#${id}`) as T;
  const typeEl = q<HTMLSelectElement>('nq-fb-type');
  const summaryEl = q<HTMLInputElement>('nq-fb-summary');
  const detailsEl = q<HTMLTextAreaElement>('nq-fb-details');
  const diagEl = wantsDiagnostics ? q<HTMLInputElement>('nq-fb-diag') : null;
  const errEl = q<HTMLElement>('nq-fb-error');
  const sendBtn = q<HTMLButtonElement>('nq-fb-send');

  const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') close(); };
  function close(): void {
    scrim.remove();
    doc.removeEventListener('keydown', onKey);
  }
  q<HTMLButtonElement>('nq-fb-cancel').addEventListener('click', close);
  // pointerdown, NOT click: iOS Safari doesn't fire click on a bare backdrop.
  scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim) close(); });
  doc.addEventListener('keydown', onKey);
  summaryEl.focus();

  // Editing anything clears the complaint. Leaving "give it a summary of at
  // least 5 characters" under a summary that now has forty of them reads as the
  // form still refusing, and people re-read the message instead of pressing Send.
  for (const field of [typeEl, summaryEl, detailsEl]) {
    field.addEventListener('input', () => { errEl.style.display = 'none'; });
  }

  sendBtn.addEventListener('click', async () => {
    const input: FeedbackInput = {
      type: (typeEl.value as ReportBugType | '') || '',
      title: summaryEl.value,
      description: detailsEl.value,
      context: options.context,
    };
    if (diagEl?.checked) {
      if (options.bot) input.pageContext = pageContext() as unknown as Record<string, unknown>;
      else input.diagnostic = collectDiagnostics();
    }

    const errKey = validateFeedbackInput(input);
    if (errKey) {
      errEl.textContent = t(errKey);
      errEl.style.display = 'block';
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = t('shell.fbSending');
    errEl.style.display = 'none';

    const result = options.bot
      ? await submitToBot(options.bot, input)
      : await submitFeedback(options.endpoint!, input);
    sendBtn.disabled = false;
    sendBtn.textContent = t('shell.fbSend');

    if (result.ok) {
      close();
      toast(doc, t('shell.fbThanks'), options.theme);
      options.onSubmitted?.(result);
      return;
    }
    // Failed: keep the sheet and the user's text; offer email when the server
    // hands back a mailto (its channel isn't configured yet).
    const msg = result.error ?? t('shell.fbFailed');
    errEl.innerHTML = result.fallbackMailto
      ? `${escapeHtml(msg)} <a href="${escapeHtml(result.fallbackMailto)}">${escapeHtml(t('shell.fbFailEmail'))}</a>`
      : escapeHtml(msg);
    errEl.style.display = 'block';
  });
}
