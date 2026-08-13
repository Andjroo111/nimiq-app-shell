import { describe, expect, test } from 'bun:test';
import { areaPaths, donutArcs, donutPoint } from './chart-geometry';

/** Pull the "x,y" pairs out of a path so geometry can be asserted as numbers. */
function coords(path: string): Array<[number, number]> {
  return [...path.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
}

describe('areaPaths', () => {
  test('an empty series draws nothing rather than throwing', () => {
    expect(areaPaths([], 300, 56)).toEqual({ line: '', fill: '', band: '' });
  });

  test('spans the full width and inset height', () => {
    const { line } = areaPaths([0, 10], 300, 56, { pad: 2 });
    const pts = coords(line);
    expect(pts[0]?.[0]).toBe(0);
    expect(pts[1]?.[0]).toBe(300);
    // Lowest value sits at the inset floor, highest at the inset ceiling.
    expect(pts[0]?.[1]).toBeCloseTo(54, 1); // pad + innerH
    expect(pts[1]?.[1]).toBeCloseTo(2, 1); // pad
  });

  test('a single value is a flat line at mid-height, not a divide-by-zero', () => {
    const pts = coords(areaPaths([7], 300, 56).line);
    expect(pts).toHaveLength(1);
    expect(pts[0]?.[0]).toBe(150); // centred
    expect(pts[0]?.[1]).toBeCloseTo(28, 1);
    expect(Number.isFinite(pts[0]?.[1] ?? Number.NaN)).toBe(true);
  });

  test('an all-equal series is flat, because flat is the honest reading', () => {
    const ys = coords(areaPaths([5, 5, 5, 5], 300, 56).line).map(([, y]) => y);
    expect(new Set(ys).size).toBe(1);
    expect(ys[0]).toBeCloseTo(28, 1);
  });

  test('y is inverted: a bigger number sits higher on screen', () => {
    const ys = coords(areaPaths([1, 9], 300, 56).line).map(([, y]) => y);
    expect(ys[1]).toBeLessThan(ys[0]!);
  });

  test('fill closes down to the baseline', () => {
    const { fill } = areaPaths([1, 2, 3], 300, 56);
    expect(fill.endsWith('L0,56Z')).toBe(true);
    expect(fill).toContain('L300.0,56');
  });

  test('the band is a CONSTANT thickness below the line, at every x', () => {
    // The whole reason the band exists rather than a gradient: depth must not
    // vary with the value, or the shading just restates the line's height.
    const DEPTH = 14;
    const values = [1, 90, 3, 40, 2];
    const { line, band } = areaPaths(values, 300, 56, { bandDepth: DEPTH });
    const top = coords(line);
    const all = coords(band);
    const bottom = all.slice(top.length).reverse(); // retraced backwards

    expect(bottom).toHaveLength(top.length);
    top.forEach(([tx, ty], i) => {
      const [bx, by] = bottom[i]!;
      expect(bx).toBeCloseTo(tx, 1);
      expect(by - ty).toBeCloseTo(DEPTH, 1);
    });
  });

  test('the band is NOT clamped to the floor', () => {
    // Clamping was the first attempt and it squashed the band under low points
    // while high points kept full depth, reintroducing the varying thickness.
    // Running past the floor and letting the viewBox clip is deliberate.
    const H = 56;
    const { band } = areaPaths([0, 100], 300, H, { bandDepth: 14 });
    const maxY = Math.max(...coords(band).map(([, y]) => y));
    expect(maxY).toBeGreaterThan(H);
  });

  test('the band closes, so it can be filled', () => {
    expect(areaPaths([1, 2, 3], 300, 56).band.endsWith('Z')).toBe(true);
  });
});

describe('donutPoint', () => {
  test('starts at 12 o’clock, not 3', () => {
    const [x, y] = donutPoint(0, 10, 0, 0);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(-10, 6); // straight up in SVG coords
  });

  test('runs clockwise', () => {
    const [x, y] = donutPoint(0.25, 10, 0, 0);
    expect(x).toBeCloseTo(10, 6); // a quarter turn lands at 3 o'clock
    expect(y).toBeCloseTo(0, 6);
  });

  test('a full turn returns to the start', () => {
    const [x0, y0] = donutPoint(0, 10, 5, 5);
    const [x1, y1] = donutPoint(1, 10, 5, 5);
    expect(x1).toBeCloseTo(x0, 6);
    expect(y1).toBeCloseTo(y0, 6);
  });
});

describe('donutArcs', () => {
  test('no arcs when everything is zero, rather than a divide-by-zero', () => {
    expect(donutArcs([0, 0], 26, 30, 30)).toEqual([]);
    expect(donutArcs([], 26, 30, 30)).toEqual([]);
  });

  test('fractions are shares of the total and sum to 1', () => {
    const arcs = donutArcs([1, 1, 2], 26, 30, 30);
    expect(arcs.map((a) => a.fraction)).toEqual([0.25, 0.25, 0.5]);
    expect(arcs.reduce((n, a) => n + a.fraction, 0)).toBeCloseTo(1, 6);
  });

  test('skips non-positive values instead of painting a dot', () => {
    // A zero-length arc with a round linecap still renders, and reads as a real
    // slice that is not there.
    const arcs = donutArcs([5, 0, -3, 5], 26, 30, 30);
    expect(arcs).toHaveLength(2);
    expect(arcs.map((a) => a.index)).toEqual([0, 3]);
  });

  test('index maps back to the caller’s own array, gaps included', () => {
    const arcs = donutArcs([0, 7], 26, 30, 30);
    expect(arcs[0]?.index).toBe(1);
  });

  test('sets the large-arc flag only past a half turn', () => {
    const [small] = donutArcs([1, 3], 26, 30, 30); // 25%
    const [large] = donutArcs([3, 1], 26, 30, 30); // 75%
    expect(small?.path).toContain(' 0 1 ');
    expect(large?.path).toContain(' 1 1 ');
  });

  test('a single value draws a near-full ring instead of collapsing', () => {
    // start === end would be a zero-length arc, i.e. nothing drawn at all.
    const [only] = donutArcs([9], 26, 30, 30);
    expect(only?.fraction).toBe(1);
    const pts = coords(only?.path ?? '');
    expect(pts[0]?.[0]).not.toBeCloseTo(pts[pts.length - 1]?.[0] ?? 0, 3);
  });

  test('arcs start where the previous one ended', () => {
    const arcs = donutArcs([1, 1, 2], 26, 30, 30);
    for (let i = 1; i < arcs.length; i++) {
      const prevEnd = coords(arcs[i - 1]!.path).at(-1)!;
      const thisStart = coords(arcs[i]!.path)[0]!;
      expect(thisStart[0]).toBeCloseTo(prevEnd[0], 1);
      expect(thisStart[1]).toBeCloseTo(prevEnd[1], 1);
    }
  });
});
