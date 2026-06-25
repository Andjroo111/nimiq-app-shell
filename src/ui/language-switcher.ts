// Vanilla flag-hex language switcher — the FlagPicker.vue idea, no Vue.
//
// Renders a row of flag-hexagon buttons (one per language) into a container.
// Clicking one calls i18n.setLanguage(id); the active button is marked. Flags
// render via the shared buildFlagHex (inlined artwork, Nimiq-orientation hexagon,
// per-flag fit, and the flags-on-white grey edge) — no CDN. The hexagon clip +
// Nimiq tooltip styling mirror nimiq.tech's FlagPicker.

import type { I18n } from '../i18n';
import { SHELL_LANGUAGES, type ShellLanguage } from '../locales';
import { buildFlagHex } from './flag-hex';

export interface LanguageSwitcherOptions {
  /** The i18n instance to drive. The switcher calls setLanguage and listens to
   *  onChange to keep its active state in sync. */
  i18n: I18n;
  /** Languages to show. Default: the 5 the shell ships strings for. (For the full
   *  featured set, pass FEATURED_LANGUAGES — but prefer mountLanguagePill for >~6,
   *  a row that wide wraps awkwardly.) */
  languages?: ShellLanguage[];
  /** Flag width in px. Default 40. */
  size?: number;
  /** @deprecated Flags are now inlined; this is ignored. */
  flagUrl?: (code: string) => string;
  /** Inject the component's <style> once. Default true. */
  injectStyles?: boolean;
}

const STYLE_ID = 'nimiq-shell-lang-switcher-style';

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.nq-langsw { list-style:none; margin:0; padding:0; display:flex; flex-wrap:wrap; justify-content:center; gap:calc(var(--nq-flag-w,40px)*0.3); }
.nq-langsw li { display:block; }
.nq-langsw__btn { position:relative; display:block; padding:0; border:none; background:none; cursor:pointer; line-height:0; }
.nq-langsw__btn:hover { z-index:2; }
.nq-langsw__art { display:block; transition: transform .18s cubic-bezier(.25,0,0,1); }
.nq-langsw__btn:hover .nq-langsw__art { transform:scale(1.18); }
.nq-langsw__btn.is-active .nq-langsw__art { outline:2px solid #0582ca; outline-offset:2px; border-radius:4px; }
.nq-langsw__btn:focus-visible { outline:2px solid #0582ca; outline-offset:3px; border-radius:6px; }
.nq-langsw__tip { position:absolute; left:50%; bottom:calc(100% + 12px); transform:translateX(-50%) translateY(3px);
  padding:8px 12px; border-radius:4px; background:#1f2348; color:#fff; font-size:13px; font-weight:600; line-height:1;
  white-space:nowrap; pointer-events:none; opacity:0; z-index:30; box-shadow:0 9px 18px rgba(0,0,0,.11);
  transition:opacity 80ms ease, transform 80ms ease; }
.nq-langsw__tip::after { content:''; position:absolute; left:50%; top:100%; transform:translateX(-50%);
  border:6px solid transparent; border-top-color:#1f2348; border-bottom-width:0; }
.nq-langsw__btn:hover .nq-langsw__tip, .nq-langsw__btn:focus-visible .nq-langsw__tip { opacity:1; transform:translateX(-50%) translateY(0); }
`;
  document.head.appendChild(style);
}

export interface LanguageSwitcherHandle {
  /** The root <ul> element. */
  el: HTMLUListElement;
  /** Tear down: remove the element and stop listening to i18n changes. */
  destroy(): void;
}

/** Mount a flag-hex language switcher row into `container`. */
export function mountLanguageSwitcher(
  container: HTMLElement,
  options: LanguageSwitcherOptions,
): LanguageSwitcherHandle {
  const { i18n } = options;
  const languages = options.languages ?? SHELL_LANGUAGES;
  const size = options.size ?? 40;
  if (options.injectStyles !== false) ensureStyles();

  const ul = document.createElement('ul');
  ul.className = 'nq-langsw';
  ul.setAttribute('role', 'listbox');
  ul.setAttribute('aria-label', i18n.t('shell.language'));
  ul.style.setProperty('--nq-flag-w', `${size}px`);

  const buttons = new Map<string, HTMLButtonElement>();

  for (const lang of languages) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nq-langsw__btn';
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-label', lang.name);

    const art = document.createElement('span');
    art.className = 'nq-langsw__art';
    art.appendChild(buildFlagHex(lang.flag, { size }));

    const tip = document.createElement('span');
    tip.className = 'nq-langsw__tip';
    tip.setAttribute('aria-hidden', 'true');
    tip.textContent = lang.name;

    btn.appendChild(art);
    btn.appendChild(tip);
    btn.addEventListener('click', () => i18n.setLanguage(lang.id));

    li.appendChild(btn);
    ul.appendChild(li);
    buttons.set(lang.id, btn);
  }

  function markActive(id: string): void {
    for (const [langId, btn] of buttons) {
      const active = langId === id;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    }
  }
  markActive(i18n.getLanguage());

  const unsubscribe = i18n.onChange((id) => markActive(id));
  container.appendChild(ul);

  return {
    el: ul,
    destroy() {
      unsubscribe();
      ul.remove();
    },
  };
}
