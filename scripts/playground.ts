// Static server for the mini-wallet playground (`bun run playground`).
//
// It reaches OUTSIDE playground/ on purpose, because the page imports the real
// bundle at ../dist/app-shell.js. That is the point: the playground has to
// exercise the artifact the fleet actually loads from jsDelivr, not a
// separately-compiled copy that could drift from it. Rebuild with
// `bun run build:dist` and reload, no server restart.
//
// SERVING IS ALLOW-LISTED, not rooted at the repo. This gets put behind a
// Cloudflare tunnel so it can be reviewed from a phone, and a repo-rooted static
// server on a public hostname hands out `.git/`, `node_modules/`, and every
// source file to anyone who guesses a path. Two directories is all the page
// needs, so two directories is all it gets.

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = Number(process.env.PORT ?? 4321);

/** The only prefixes reachable over HTTP. Everything else is a 404. */
const ALLOWED = ['playground/', 'dist/'];

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
};

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname);
    if (path === '/' || path === '/playground' || path === '/playground/') {
      path = '/playground/index.html';
    }
    const rel = path.replace(/^\/+/, '');

    // Resolve first, THEN check: a check against the raw string is defeated by
    // any encoding the URL parser normalises afterwards.
    const resolved = new URL(rel, `file://${ROOT}`).pathname;
    if (!resolved.startsWith(ROOT)) return new Response('not found', { status: 404 });
    const inRepo = resolved.slice(ROOT.length);
    if (!ALLOWED.some((p) => inRepo.startsWith(p))) {
      return new Response('not found', { status: 404 });
    }

    const file = Bun.file(resolved);
    if (!(await file.exists())) return new Response('not found', { status: 404 });

    const ext = path.slice(path.lastIndexOf('.'));
    return new Response(file, {
      headers: {
        'content-type': TYPES[ext] ?? 'application/octet-stream',
        // The whole workflow is edit, rebuild, reload. A cached bundle here
        // means testing the previous build and not knowing it.
        'cache-control': 'no-store',
        // It is a dev harness, not a page anyone should be framing.
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
      },
    });
  },
});

console.log(`\n  mini wallet playground -> http://localhost:${server.port}/\n`);
console.log(`  serving ${ALLOWED.map((p) => ROOT + p).join('\n          ')}`);
console.log(`  rebuild the bundle with:  bun run build:dist\n`);
