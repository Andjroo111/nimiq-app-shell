// Bug reporter — drops the fleet's nimiq.bot issue widget into any app.
//
// It's a thin loader for the shared service's widget (bot.nimiq.tech/widget.js)
// with this app's `repo`, so every shell-wired app gets the same in-app issue
// reporter — voice + text, AI-triaged, files into the app's OWN GitHub repo —
// without copy-pasting the <script> tag. The widget itself (UI, voice capture,
// context collection, confirm card) lives in the nimiq.bot service and updates
// centrally; the shell just mounts it.
//
// Standalone apps can still use the raw one-liner instead:
//   <script src="https://bot.nimiq.tech/widget.js" data-repo="nimiq.x" defer></script>

export interface BugReporterOptions {
  /** Target repo for issues from this app, e.g. 'nimiq.gives'. Required. */
  repo: string;
  /** The nimiq.bot service origin. Default 'https://bot.nimiq.tech'. */
  endpoint?: string;
  /** Brand accent for the button/panel. Defaults to the widget's Nimiq blue. */
  accent?: string;
  /** Floating position. Default 'bottom-right'. */
  position?: 'bottom-right' | 'bottom-left';
}

export interface BugReporterHandle {
  /** The injected <script> element (null in non-DOM / already-mounted cases). */
  el: HTMLScriptElement | null;
  /** Remove the widget and its loader script from the page. */
  destroy(): void;
}

const MARKER = 'data-nimiq-bot-shell';

function removeWidget(scriptEl: HTMLScriptElement | null): void {
  if (scriptEl && scriptEl.parentNode) scriptEl.parentNode.removeChild(scriptEl);
  const host = document.getElementById('nimiq-bot-host');
  if (host && host.parentNode) host.parentNode.removeChild(host);
  // The widget guards against double-mount with this flag; reset so it can
  // re-mount if mountBugReporter is called again.
  try {
    (window as unknown as { __nimiqBot?: boolean }).__nimiqBot = false;
  } catch {
    /* ignore */
  }
}

export function mountBugReporter(options: BugReporterOptions): BugReporterHandle {
  const noop: BugReporterHandle = { el: null, destroy() {} };
  if (typeof document === 'undefined' || !options || !options.repo) return noop;

  // Idempotent: if a reporter is already on the page (mounted here or loaded as
  // a standalone <script>), don't add a second one.
  const existing = document.querySelector<HTMLScriptElement>(`script[${MARKER}]`);
  if (existing) return { el: existing, destroy: () => removeWidget(existing) };

  const endpoint = (options.endpoint || 'https://bot.nimiq.tech').replace(/\/$/, '');
  const s = document.createElement('script');
  s.src = `${endpoint}/widget.js`;
  s.defer = true;
  s.setAttribute('data-repo', options.repo);
  s.setAttribute('data-endpoint', endpoint);
  s.setAttribute(MARKER, '');
  if (options.accent) s.setAttribute('data-accent', options.accent);
  if (options.position) s.setAttribute('data-position', options.position);
  document.head.appendChild(s);

  return { el: s, destroy: () => removeWidget(s) };
}
