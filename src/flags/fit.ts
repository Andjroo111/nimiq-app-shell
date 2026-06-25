// Per-flag pan/zoom inside the Nimiq hexagon, keyed by flag-icons code. SVG units
// on the 20x18 hex; +dx right, +dy down. `aspect` (w/h) sizes the image box for
// wide flags so they cover the hexagon with no white gap. These are the hard-won
// values tuned against real renders (Andrew, via nimiq.tech + nimiq.life):
//   - US needs aspect 4:3 or the canton stretches / the stars get cropped.
//   - China pans the 5 stars (top-left) into the visible hexagon.
//   - Korea zooms out so the four black trigrams sit clear of the hexagon edge
//     (0.72, tightened from 0.84 — at 0.84 the edge rests on the trigram bars).

export interface FlagFit {
  scale?: number;
  dx?: number;
  dy?: number;
  /** Flag width/height ratio (default 1). Wider flags (US 4:3) size the image box
   *  to their aspect so they fill the hexagon with no white gap. */
  aspect?: number;
}

export const FLAG_FIT: Record<string, FlagFit> = {
  us: { aspect: 4 / 3 },
  cn: { scale: 1.2, dx: 2.2, dy: 2.8 },
  kr: { scale: 0.72 },
};
