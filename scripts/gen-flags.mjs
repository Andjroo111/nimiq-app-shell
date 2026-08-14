import { readFileSync, writeFileSync, readdirSync } from "node:fs";

// NOTE (2026-08-13): this SRC directory no longer exists, so this script cannot
// currently be run end to end. It is kept for the day the flag set is rebuilt.
// If you do rebuild it, read RASTERIZED below FIRST.
const SRC = "/Users/andjroo/gdkc/projects/nimiq.life/public/flags";

// Flags whose vector art is too heavy to inline, kept as a small raster wrapped
// in an SVG so the renderer and the exported FLAG_SVG shape do not change.
//
// Mexico was 80 KB of its own: 351 paths of eagle, serpent, cactus and laurel,
// already at 1 decimal place, so there was no precision left to squeeze. That
// one flag was 83% of the flag payload and 37% of the whole shipped bundle,
// for detail that renders inside a ~26px hexagon where none of it is legible.
// A 192px raster is visually identical at that size and 91% smaller.
//
// Regenerating from SRC would silently restore the 80 KB version, so anything
// listed here must be re-rasterized rather than re-inlined.
const RASTERIZED = new Set(["mx"]);
const OUT = "/Users/andjroo/gdkc/projects/nimiq-app-shell/src/flags/data.ts";

const codes = readdirSync(SRC)
  .filter((f) => f.endsWith(".svg"))
  .map((f) => f.replace(".svg", ""))
  .sort();

let out = `// AUTO-GENERATED flag artwork (flag-icons / nimiq.tech-tuned SVGs, public domain).
// Inlined as strings so the flag-hex renders self-contained — no asset files for
// consumer apps to vendor (the #1 cause of broken flags across the fleet).
// Regenerate with scripts/gen-flags.mjs.

export const FLAG_SVG: Record<string, string> = {
`;

for (const c of codes) {
  if (RASTERIZED.has(c)) {
    throw new Error(
      `${c} is in RASTERIZED: re-inlining its vector would undo a deliberate ` +
      `size fix (see the note above). Rasterize it to a PNG at ~192px, wrap it ` +
      `in <svg><image href="data:image/png;base64,..."/></svg>, and paste that in.`,
    );
  }
  const svg = readFileSync(`${SRC}/${c}.svg`, "utf8").replace(/\s+$/, "");
  out += `  ${JSON.stringify(c)}: ${JSON.stringify(svg)},\n`;
}

out += `};

/** A data: URI for a flag's SVG, suitable for an <image href>. */
export function flagDataUrl(code: string): string {
  const svg = FLAG_SVG[code.toLowerCase()];
  return svg ? "data:image/svg+xml," + encodeURIComponent(svg) : "";
}
`;

writeFileSync(OUT, out);
console.log("wrote data.ts with", codes.length, "flags:", codes.join(" "));
