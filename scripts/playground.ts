// Static server for the mini-wallet playground (`bun run playground`).
//
// It serves the REPO ROOT, not just playground/, because the page imports the
// real bundle at ../dist/app-shell.js. That is the point: the playground has to
// exercise the artifact the fleet actually loads from jsDelivr, not a
// separately-compiled copy that could drift from it. Rebuild with
// `bun run build:dist` and reload — no server restart.

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = Number(process.env.PORT ?? 4321);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname);
    if (path === '/' || path === '/playground' || path === '/playground/') {
      path = '/playground/index.html';
    }
    // Refuse to climb out of the repo. This binds to localhost, but a traversal
    // that reads ~/.ssh because someone typed the URL wrong is not a tradeoff
    // worth making for six lines saved.
    const file = Bun.file(ROOT + path.replace(/^\/+/, ''));
    const resolved = ROOT + path.replace(/^\/+/, '');
    if (!resolved.startsWith(ROOT) || path.includes('..')) {
      return new Response('nope', { status: 403 });
    }
    if (!(await file.exists())) return new Response('not found', { status: 404 });

    const ext = path.slice(path.lastIndexOf('.'));
    return new Response(file, {
      headers: {
        'content-type': TYPES[ext] ?? 'application/octet-stream',
        // The whole workflow is edit → rebuild → reload. A cached bundle here
        // means testing the previous build and not knowing it.
        'cache-control': 'no-store',
      },
    });
  },
});

console.log(`\n  mini wallet playground → http://localhost:${server.port}/\n`);
console.log(`  serving ${ROOT}`);
console.log(`  rebuild the bundle with:  bun run build:dist\n`);
