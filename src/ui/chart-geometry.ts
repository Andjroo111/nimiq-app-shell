// Chart geometry: the SVG path maths behind a sparkline area and a donut.
//
// Extracted from hashmark's platform-stats panel (hashmark#1041), where the
// hard-won part was never the markup. It was two pieces of geometry that are
// easy to get subtly wrong and whose wrongness looks like a design choice
// rather than a bug. Both are reproduced here verbatim in behaviour, with the
// host app's nouns removed.
//
// WHAT THIS DOES NOT DO, on purpose:
//   - no fetching. The shell does no chain reads (see the README); these take
//     numbers you already have and return path strings.
//   - no colours, labels, CSS classes or markup. Those are the host's, and
//     they are where a chart stops being generic: "How markets resolved" and a
//     lime/coral pair belong to hashmark, not to the fleet.
//   - no <svg> element. You compose the paths into your own, with your own
//     viewBox, gradients and accessible labelling.
//
// So the split is: the app owns the data and the presentation, the shell owns
// the drawing maths. That is the only part every app would otherwise rewrite.
//
// ACCESSIBILITY NOTE, carried over from the source and worth keeping: a fill
// colour must never be the only thing distinguishing two series. In the panel
// this came from, lime against coral measured only 7.5 dE under a deuteranopia
// simulation, so every coloured mark was paired with a direct number. This
// module cannot enforce that — it never sees your colours — but anything built
// on it inherits the obligation.

/** The three path strings for one area sparkline. */
export interface AreaPaths {
  /** The line itself, an open path. Stroke this. */
  line: string;
  /** The line closed down to the baseline. Fill this, faintly. */
  fill: string;
  /** A constant-thickness ribbon hugging the line. Fill this, flat. */
  band: string;
}

/** Options for {@link areaPaths}. */
export interface AreaPathsOptions {
  /** Vertical inset, so a peak or trough is not clipped by the viewBox edge. */
  pad?: number;
  /** How far below the line the band extends, in viewBox units. */
  bandDepth?: number;
}

/**
 * Build the paths for an area sparkline over `values`, normalised into `w` x `h`.
 *
 * Takes plain numbers rather than dated points: the x axis is index order, so
 * the series can be days, blocks, prices or anything else evenly spaced. Uneven
 * spacing is deliberately not supported — it needs a real scale, and that is a
 * charting library, not a shell primitive.
 *
 * Degenerate inputs are handled as readings rather than as errors. A single
 * value, or an all-equal series, draws a flat line at mid-height instead of
 * dividing by zero or spiking: with no variation to show, flat is the honest
 * picture.
 *
 * THE BAND is the part worth understanding, because the obvious alternative
 * does not work. A single gradient on `fill` is anchored to that path's
 * BOUNDING BOX, whose top is the highest peak — so full strength lands only
 * under that one peak and every lower stretch begins partway down the ramp,
 * already faded. The shading then describes how tall each point is, which the
 * line is already saying, rather than hugging the line the way it appears to.
 *
 * `band` instead traces the line and retraces it backwards `bandDepth` lower,
 * so the closed shape is a ribbon of constant thickness following the curve.
 * Fill it flat and layer it over the wider, fainter `fill`; the softness comes
 * from the layering, not from a ramp.
 *
 * The band is NOT clamped to the floor. Clamping was tried first and recreated
 * the exact defect it was meant to fix: a point near the bottom had its band
 * squashed to a sliver while a high point kept full depth, so thickness varied
 * with value again. Letting it run past the floor and having the viewBox clip
 * it costs nothing and keeps the depth honestly constant.
 *
 * @param values Series in draw order, oldest first.
 * @param w Target width in viewBox units.
 * @param h Target height in viewBox units.
 */
export function areaPaths(
  values: readonly number[],
  w: number,
  h: number,
  options: AreaPathsOptions = {},
): AreaPaths {
  const pad = options.pad ?? 2;
  const bandDepth = options.bandDepth ?? 14;
  if (values.length === 0) return { line: '', fill: '', band: '' };

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min;
  const innerH = h - pad * 2;
  const x = (i: number): number => (values.length === 1 ? w / 2 : (i / (values.length - 1)) * w);
  const y = (v: number): number =>
    span === 0 ? pad + innerH / 2 : pad + innerH - ((v - min) / span) * innerH;

  const xy = values.map((v, i) => [x(i), y(v)] as const);
  const pts = xy.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`);
  const line = `M${pts.join('L')}`;
  const fill = `${line}L${w.toFixed(1)},${h}L0,${h}Z`;
  const down = xy
    .slice()
    .reverse()
    .map(([px, py]) => `${px.toFixed(1)},${(py + bandDepth).toFixed(1)}`);
  const band = `${line}L${down.join('L')}Z`;

  return { line, fill, band };
}

/**
 * A point on a circle at `frac` turns clockwise from 12 o'clock.
 *
 * Twelve o'clock rather than the 3 o'clock that `Math.cos`/`Math.sin` give you
 * unaided, because a ring of proportions is read starting from the top. Getting
 * this wrong rotates the whole chart a quarter turn, which looks intentional
 * and is therefore easy to ship.
 */
export function donutPoint(frac: number, r: number, cx: number, cy: number): [number, number] {
  const a = frac * Math.PI * 2 - Math.PI / 2;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/** One arc of a donut, as a strokeable path plus the share it represents. */
export interface DonutArc {
  /** An open arc path. Stroke it with your own width and colour. */
  path: string;
  /** This value's share of the total, 0..1. Use it to label the arc. */
  fraction: number;
  /** Index into the input, so a caller can map back to its own labels. */
  index: number;
}

/**
 * Arc paths for a donut, one per value, laid out clockwise from 12 o'clock.
 *
 * Returns strokeable arcs rather than filled wedges: a stroked ring reads as
 * one band of proportions and leaves the middle free for the total, which is
 * usually the number people actually came for. Filled wedges compete with it.
 *
 * Zero and negative values are skipped rather than drawn, since neither has a
 * meaningful arc, and a zero-length arc with a round linecap still paints a
 * visible dot that reads as a real slice.
 *
 * Callers should cap how many arcs they pass. Past a handful the arcs get too
 * small to label directly, and an unlabelled arc puts the whole chart back on
 * colour alone, which the header note rules out.
 */
export function donutArcs(
  values: readonly number[],
  r: number,
  cx: number,
  cy: number,
): DonutArc[] {
  const total = values.reduce((n, v) => n + (v > 0 ? v : 0), 0);
  if (total <= 0) return [];

  const arcs: DonutArc[] = [];
  let cursor = 0;
  values.forEach((value, index) => {
    if (value <= 0) return;
    const fraction = value / total;
    const [x0, y0] = donutPoint(cursor, r, cx, cy);
    const [x1, y1] = donutPoint(cursor + fraction, r, cx, cy);
    // A single value fills the ring, and start === end would collapse the arc
    // to nothing. Nudging the end back by a hair keeps it a full circle in one
    // path instead of special-casing the caller.
    const sweepEnd: [number, number] =
      fraction >= 1 ? donutPoint(0.9999, r, cx, cy) : ([x1, y1] as [number, number]);
    const largeArc = fraction > 0.5 ? 1 : 0;
    arcs.push({
      path: `M${x0.toFixed(2)},${y0.toFixed(2)}A${r},${r} 0 ${largeArc} 1 ${sweepEnd[0].toFixed(2)},${sweepEnd[1].toFixed(2)}`,
      fraction,
      index,
    });
    cursor += fraction;
  });
  return arcs;
}
