import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const SRC = "/Users/andjroo/gdkc/projects/nimiq.life/public/flags";
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
