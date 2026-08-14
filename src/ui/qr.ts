// The receive QR, ported from the registry's qr-code component (which is the
// wallet's own QrCode.vue): rounded modules filled with the Nimiq light-blue
// radial, on a transparent background.
//
// It ships as a DEFAULT rather than staying a pure seam. `qr` was host-only for
// eleven versions, and the result was nineteen apps each about to hand-roll the
// one graphic in this menu that a camera has to read. The seam stays: pass `qr`
// and yours wins. Pass nothing and you get the wallet's.
//
// THE PLATE IS NOT DECORATION. Upstream draws on a transparent background
// because the wallet's receive screen is a white card. The mini wallet now
// themes, and a blue QR on swellet's forest-dark card is not a styling problem,
// it is an unscannable one: a reader needs dark modules on a light field. So
// the canvas sits on a white plate that is invisible on a white menu and
// becomes a white tile on a dark one, which is what every dark-mode wallet
// does. `--nq-cc-qr-plate` moves it; making it dark is a decision to break
// scanning, so it is not something the theme tokens do for you.
import QrCreator from 'qr-creator';

/** Nimiq light-blue radial, the `--nimiq-light-blue-bg` pair. */
const FILL_FROM = '#265DD7';
const FILL_TO = '#0582CA';

function cssVar(el: Element | null, name: string, fallback: string): string {
  if (!el || typeof getComputedStyle !== 'function') return fallback;
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

/** Render `text` as a Nimiq QR into a self-sized canvas.
 *
 *  Signature matches `CornerControlOptions['qr']`, so it drops in as the
 *  default and a host renderer replaces it with no other change.
 *
 *  `host` is the element the colours are read from; the corner passes the slot
 *  so `--nq-cc-qr-*` can be set anywhere above it, the same as every other
 *  token here. */
export function nimiqQr(text: string, sizePx: number, host?: Element | null): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'nq-cc-qr-canvas';
  // qr-creator sets width/height to `size` with no devicePixelRatio handling,
  // so on a 2x screen the modules are resampled. Render at the device ratio and
  // let CSS scale it back down, which is the one deviation from upstream here
  // and the difference between crisp corners and mush on a phone.
  const dpr = Math.min(3, Math.max(1, Math.round(globalThis.devicePixelRatio || 1)));
  QrCreator.render(
    {
      text,
      radius: 0.5,
      ecLevel: 'M',
      fill: {
        type: 'radial-gradient',
        // a circle centred on the bottom-right corner with the QR's diagonal as
        // its radius: the same bottom-right anchor every Nimiq gradient uses
        position: [1, 1, 0, 1, 1, Math.SQRT2],
        colorStops: [
          [0, cssVar(host ?? null, '--nq-cc-qr-from', FILL_FROM)],
          [1, cssVar(host ?? null, '--nq-cc-qr-to', FILL_TO)],
        ],
      },
      background: null,
      size: sizePx * dpr,
    },
    canvas,
  );
  canvas.style.width = `${sizePx}px`;
  canvas.style.height = `${sizePx}px`;
  return canvas;
}
