// Builds the committed CDN bundle: same output as
//   bun build src/index.ts --target browser --format esm --minify --outfile dist/app-shell.js
// except for two pieces of NNS data that nothing on the read path consults.
//
// 1. @nimiqnames/anchor's compiled contract bytecode. Only deploy.js reads it,
// and that is not in this bundle; the resolver wants ARTIFACT.anchoredTopic0 from
// the same object, so the object stays and the two long hex values go. That is
// about 1 KB of dead weight and the only reason: the privacy gate did not flag
// them, and CI's gate was already clean at 09e7ac8 with them in the bundle.
//
// 2. @nimiqnames/core's published reserved-word list. Their resolver releases every
// query from reservation before parsing it (`parseQuery(query, new Set([name]))`
// in resolver/dist/resolve.js), and nameQuery does the same. So the list is
// only ever data the bundle carries, because CONSTANTS holds it and the resolver
// reads CONSTANTS. Their own build of the resolver (nns.js) carries it too, so
// importing something else from their packages is not a way out.
//
// names.test.ts fails if either comes back, including if an upgrade moves a file
// these filters name.

const ANCHOR_BYTECODE = /"(bytecode|deployedBytecode)": "0x[0-9a-f]+"/g;

const result = await Bun.build({
  entrypoints: ['src/index.ts'],
  target: 'browser',
  format: 'esm',
  minify: true,
  outdir: 'dist',
  naming: 'app-shell.js',
  plugins: [
    {
      name: 'nns-unread-data-out',
      setup(build) {
        build.onLoad({ filter: /@nimiqnames\/anchor\/dist\/artifact\.js$/ }, async ({ path }) => ({
          contents: (await Bun.file(path).text()).replace(ANCHOR_BYTECODE, '"$1": ""'),
          loader: 'js',
        }));
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
