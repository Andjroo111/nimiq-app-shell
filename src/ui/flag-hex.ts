// The fleet-standard flag-hex: a country flag clipped into the Nimiq rounded
// hexagon (the brand mark, pointed left/right), with one faint grey edge so
// white-fielded flags read on a white surface ("flags on white"). Self-contained
// — flag artwork is inlined (data URI), no external CDN and no asset files for
// consumer apps to vendor. Per-flag pan/zoom is looked up from FLAG_FIT.
//
// This is the single source of truth used by mountLanguageSwitcher (row) and
// mountLanguagePill (dropdown). Mirrors nimiq.tech's FlagHex.vue.

import { flagDataUrl } from "../flags/data";
import { FLAG_FIT, type FlagFit } from "../flags/fit";

// Verbatim Nimiq rounded-hexagon path, 20x18 viewBox.
const HEX =
  "M19.964 8.156 15.758.844A1.69 1.69 0 0014.299 0H5.887c-.6 0-1.156.32-1.456.844L.225 8.156c-.3.523-.3 1.165 0 1.688l4.206 7.312c.3.523.856.844 1.456.844h8.412c.6 0 1.156-.32 1.456-.844l4.206-7.312a1.69 1.69 0 00.003-1.688";

let uid = 0;

/** Size the image box to COVER the hexagon (+overscan), honoring aspect + pan/zoom. */
function flagBox(fit?: FlagFit): { x: number; y: number; w: number; h: number } {
  const a = fit?.aspect ?? 1;
  const s = fit?.scale ?? 1;
  const dx = fit?.dx ?? 0;
  const dy = fit?.dy ?? 0;
  const OVER = 1.08;
  const w = Math.max(20, 18 * a) * OVER * s;
  const h = w / a;
  return { x: 10 + dx - w / 2, y: 9 + dy - h / 2, w, h };
}

export interface FlagHexOptions {
  /** Rendered width in px (height = width * 0.9). Default 24. */
  size?: number;
  /** Override the per-flag fit (default: FLAG_FIT[code]). */
  fit?: FlagFit;
}

/** Build a flag-in-hexagon as a self-contained inline SVG element. */
export function buildFlagHex(code: string, options: FlagHexOptions = {}): SVGSVGElement {
  const size = options.size ?? 24;
  const fit = options.fit ?? FLAG_FIT[code.toLowerCase()];
  const { x, y, w, h } = flagBox(fit);
  // Aim for a ~1.1px edge at any size (thin at large sizes, still visible on a
  // small pill), never below 0.4 viewBox units.
  const stroke = Math.max(0.4, 22 / size);
  const id = `nq-flag-${(uid += 1)}`;
  const tmp = document.createElement("div");
  tmp.innerHTML =
    `<svg class="nq-flag-hex" viewBox="0 0 20 18" width="${size}" height="${(size * 0.9).toFixed(2)}" aria-hidden="true" style="display:block;overflow:visible">` +
    `<defs><clipPath id="${id}"><path d="${HEX}"/></clipPath></defs>` +
    `<image href="${flagDataUrl(code)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>` +
    `<path d="${HEX}" fill="none" stroke="rgba(31,35,72,0.4)" stroke-width="${stroke.toFixed(2)}" stroke-linejoin="round"/>` +
    `</svg>`;
  return tmp.firstElementChild as unknown as SVGSVGElement;
}
