// Builds the committed CDN bundle: same output as
//   bun build src/index.ts --target browser --format esm --minify --outfile dist/app-shell.js
// except that @nimiqnames/core's published reserved-word list is left out.
//
// Why the bundle can drop it: this repo is public and dist/ is committed, and
// nothing on the read path consults the list. Their resolver releases every
// query from reservation before parsing it (`parseQuery(query, new Set([name]))`
// in resolver/dist/resolve.js), and nameQuery does the same. So the list is
// only ever data the bundle carries, because CONSTANTS holds it and the resolver
// reads CONSTANTS. Their own build of the resolver (nns.js) carries it too, so
// importing something else from their packages is not a way out.
//
// names.test.ts fails if the list comes back, including if an upgrade moves the
// file this filter names.

const result = await Bun.build({
  entrypoints: ['src/index.ts'],
  target: 'browser',
  format: 'esm',
  minify: true,
  outdir: 'dist',
  naming: 'app-shell.js',
  plugins: [
    {
      name: 'nns-reserved-list-out',
      setup(build) {
        build.onLoad({ filter: /@nimiqnames\/core\/dist\/reserved-names\.js$/ }, () => ({
          contents: 'export const RESERVED_NAMES = Object.freeze([]);',
          loader: 'js',
        }));
      },
    },
  ],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
console.log(`dist/app-shell.js ${result.outputs[0]!.size} bytes`);
