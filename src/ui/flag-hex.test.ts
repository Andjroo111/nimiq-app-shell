// Flag-hex markup pins (the DOM wrapper is verified by consumer apps' browser
// passes — this repo has no DOM harness, by convention).
//
// The load-bearing one is the clip STRUCTURE. Safari renders the flag as a raw
// rounded rectangle when the hexagon clip is referenced directly by the <image>,
// because WebKit skips a clip-path on an <image> whose data-URI artwork decodes
// after first paint. Chromium clips it either way, so this cannot be caught by
// the Playwright pass any fleet app runs, and it reached a real iPhone.
import { describe, expect, test } from 'bun:test';
import { flagHexMarkup } from './flag-hex';

describe('flagHexMarkup clip structure', () => {
  test('clips a <g> wrapper, never the <image> itself', () => {
    const svg = flagHexMarkup('de');

    // The <image> carries no clip of its own. This is the regression: an <image>
    // with clip-path on it is exactly what Safari drops.
    const image = svg.match(/<image\b[^>]*>/)!;
    expect(image).not.toBeNull();
    expect(image[0]).not.toContain('clip-path');

    // The clip lives on a group, and that group actually wraps the image.
    expect(svg).toMatch(/<g clip-path="url\(#nq-flag-\d+\)"><image\b[^>]*><\/g>/);
  });

  test('the clipped group references the clipPath this call defined', () => {
    const svg = flagHexMarkup('fr');
    const defined = svg.match(/<clipPath id="(nq-flag-\d+)">/)![1];
    expect(svg).toContain(`<g clip-path="url(#${defined})">`);
  });

  test('ids are unique per call, so two flags on one page cannot share a clip', () => {
    const a = flagHexMarkup('de').match(/<clipPath id="(nq-flag-\d+)">/)![1];
    const b = flagHexMarkup('de').match(/<clipPath id="(nq-flag-\d+)">/)![1];
    expect(a).not.toBe(b);
  });

  test('keeps the hex edge stroke outside the clip, so it is never clipped away', () => {
    const svg = flagHexMarkup('us');
    const afterGroup = svg.slice(svg.indexOf('</g>'));
    expect(afterGroup).toMatch(/<path d="[^"]+" fill="none" stroke=/);
  });
});
