// Compact language pill — the nimiq.school NavBar switcher idea, vanilla. Shows
// ONLY the current language's flag-hex + a caret; clicking opens a white dropdown
// listbox of every language (flag + name). The fleet-standard alternative to the
// full flag ROW (mountLanguageSwitcher) for headers that want a compact control.
//
// Theme-adaptive: the trigger uses currentColor, so it reads on a navy header
// (white text) or a light one (dark text); the dropdown is always a white card.
// Flags use the shared buildFlagHex (inlined artwork + flags-on-white grey edge).

import type { I18n } from '../i18n';
import { FEATURED_LANGUAGES, type ShellLanguage } from '../locales';
import { buildFlagHex } from './flag-hex';

export interface LanguagePillOptions {
  /** The i18n instance to drive (setLanguage on pick, onChange to stay in sync). */
  i18n: I18n;
  /** Languages to offer. Default: the 11 featured languages. */
  languages?: ShellLanguage[];
  /** Flag size in px. Default 24. */
  size?: number;
  /** Inject the component's <style> once. Default true. */
  injectStyles?: boolean;
}

export interface LanguagePillHandle {
  el: HTMLDivElement;
  destroy(): void;
}

const STYLE_ID = 'nimiq-shell-langpill-style';

function ensureStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.nq-langpill { position: relative; }
.nq-langpill__btn { display:inline-flex; align-items:center; gap:7px; height:40px; padding:0 12px;
  border:1px solid color-mix(in srgb, currentColor 20%, transparent); border-radius:999px;
  background:transparent; color:inherit; cursor:pointer; font:inherit;
  transition:border-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), background-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-langpill__btn:hover { border-color: color-mix(in srgb, currentColor 40%, transparent); background: color-mix(in srgb, currentColor 6%, transparent); }
.nq-langpill__btn:focus-visible { outline:2px solid #0582ca; outline-offset:3px; }
.nq-langpill__caret { width:10px; height:6px; color:currentColor; opacity:.6; }
.nq-langpill__menu { position:absolute; top:calc(100% + 10px); right:0; z-index:40; width:224px;
  max-height:min(64vh,392px); overflow-y:auto; overscroll-behavior:contain; scrollbar-width:thin;
  margin:0; padding:6px; list-style:none; background:#fff; border-radius:10px;
  box-shadow:0 12px 36px rgba(13,11,36,.28); }
.nq-langpill__menu li { display:block; }
.nq-langpill__option { display:flex; align-items:center; gap:10px; width:100%; padding:8px 10px;
  border:none; border-radius:7px; background:none; font:inherit; font-size:14px; font-weight:600;
  color:#1f2348; text-align:left; cursor:pointer;
  transition:background-color .12s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-langpill__option:hover { background:rgba(31,35,72,.06); }
.nq-langpill__option.is-active { color:#0582ca; }
.nq-langpill__name { white-space:nowrap; }
@media (max-width:560px){
  .nq-langpill { position:static; }
  .nq-langpill__menu { left:clamp(16px,4vw,28px); right:clamp(16px,4vw,28px); width:auto; }
}
`;
  document.head.appendChild(style);
}

const CARET =
  '<svg class="nq-langpill__caret" viewBox="0 0 10 6" aria-hidden="true">' +
  '<path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Mount the compact language pill into `container`. */
export function mountLanguagePill(
  container: HTMLElement,
  options: LanguagePillOptions,
): LanguagePillHandle {
  const { i18n } = options;
  const languages = options.languages ?? FEATURED_LANGUAGES;
  const size = options.size ?? 24;
  if (options.injectStyles !== false) ensureStyles();

  const root = document.createElement('div');
  root.className = 'nq-langpill';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nq-langpill__btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', i18n.t('shell.language'));

  const menu = document.createElement('ul');
  menu.className = 'nq-langpill__menu';
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-label', i18n.t('shell.language'));
  menu.hidden = true;

  const optionEls = new Map<string, HTMLButtonElement>();
  for (const lang of languages) {
    const li = document.createElement('li');
    const opt = document.createElement('button');
    opt.type = 'button';
    opt.className = 'nq-langpill__option';
    opt.setAttribute('role', 'option');
    opt.appendChild(buildFlagHex(lang.flag, { size }));
    const name = document.createElement('span');
    name.className = 'nq-langpill__name';
    name.textContent = lang.name;
    opt.appendChild(name);
    opt.addEventListener('click', () => {
      i18n.setLanguage(lang.id);
      close();
    });
    li.appendChild(opt);
    menu.appendChild(li);
    optionEls.set(lang.id, opt);
  }

  root.appendChild(btn);
  root.appendChild(menu);
  container.appendChild(root);

  function renderTrigger(): void {
    const id = i18n.getLanguage();
    const lang = languages.find((l) => l.id === id) ?? languages[0];
    btn.textContent = '';
    if (lang) btn.appendChild(buildFlagHex(lang.flag, { size }));
    btn.insertAdjacentHTML('beforeend', CARET);
  }

  function markActive(id: string): void {
    for (const [langId, opt] of optionEls) {
      const active = langId === id;
      opt.classList.toggle('is-active', active);
      opt.setAttribute('aria-selected', String(active));
    }
  }

  function open(): void {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('keydown', onKeydown);
  }
  function close(): void {
    if (menu.hidden) return;
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onKeydown);
  }
  function onDocClick(e: MouseEvent): void {
    if (!root.contains(e.target as Node)) close();
  }
  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      close();
      btn.focus();
    }
  }

  btn.addEventListener('click', () => (menu.hidden ? open() : close()));

  renderTrigger();
  markActive(i18n.getLanguage());
  const unsubscribe = i18n.onChange((id) => {
    renderTrigger();
    markActive(id);
  });

  return {
    el: root,
    destroy() {
      unsubscribe();
      close();
      root.remove();
    },
  };
}
