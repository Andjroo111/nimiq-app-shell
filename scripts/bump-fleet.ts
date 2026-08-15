// Move the whole fleet to a new mini-wallet release.
//
//   bun run bump-fleet -- v0.20.4 --dry-run
//   bun run bump-fleet -- v0.20.4
//   bun run bump-fleet -- v0.20.4 --only nimiq.gift,swellet --no-pr
//
// It opens a PR per app and NEVER merges. The gate stays where it was: CI on each
// repo, and Andrew on the merge button.
//
// WHY THIS EXISTS. The fleet is pinned on purpose (docs/NEXT-SESSION.md, "How the
// fleet takes an update"): a floating jsDelivr tag would move the 7 CDN apps and
// reach none of the 12 that bake the shell into their own artifact, and it would
// put an unreviewed tag on live apps that hold a Send button. So the pin stays and
// the BUMP gets cheap instead. The pin was never the slow part; the rebuilds and
// the per-repo version-and-CHANGELOG law were.
//
// WHY BUN AND NOT BASH. macOS ships /bin/bash 3.2, which has no associative
// arrays. A nineteen-record registry in it becomes parallel arrays, and on
// 2026-08-15 that failure mode printed "committed <hash>" for seven repos while
// committing nothing, because the hash it echoed was the pre-existing HEAD. Every
// gate here is `bun run` anyway. bump-fleet.sh is a wrapper onto this file.
//
// WHAT IT REFUSES TO GUESS:
//   - the target tag must exist and be on jsDelivr before any repo is touched
//   - `git remote -v` must name the expected repo (splitlink was nimiq.party
//     renamed, and a push would have fought another app's branch)
//   - a `dep` app must RESOLVE to the target, checked in node_modules, not assumed
//     from the string that was written into package.json
//   - an app that commits its artifact must show that artifact actually moved
//   - a commit is confirmed by re-reading HEAD, never by the fact the call returned

import { $ } from 'bun';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FLEET, SALE_VENDOR, type App } from './fleet';

const ROOT = new URL('..', import.meta.url).pathname;

// ---- args -------------------------------------------------------------------

const argv = process.argv.slice(2);
const version = argv.find((a) => /^v\d+\.\d+\.\d+$/.test(a));
const dryRun = argv.includes('--dry-run');
const noPr = argv.includes('--no-pr');
const keepWorktrees = argv.includes('--keep-worktrees');
const onlyArg = argv.find((a) => a.startsWith('--only'));
const only = onlyArg
  ? (onlyArg.includes('=') ? onlyArg.split('=')[1]! : argv[argv.indexOf(onlyArg) + 1] ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean)
  : null;

if (!version) {
  console.error('usage: bun run bump-fleet -- v0.20.4 [--dry-run] [--only a,b] [--no-pr] [--keep-worktrees]');
  process.exit(2);
}
const bare = version.slice(1); // 0.20.4

const apps = FLEET.filter((a) => !only || only.includes(a.repo));
if (only && apps.length !== only.length) {
  const missing = only.filter((r) => !FLEET.some((a) => a.repo === r));
  console.error(`unknown repo(s) in --only: ${missing.join(', ')}`);
  process.exit(2);
}

// ---- helpers ----------------------------------------------------------------

/** Thrown to end an app cleanly as "nothing to do", which is not a failure. */
class SkipApp extends Error {}

type Status = 'ok' | 'skip' | 'fail';
interface Result { repo: string; status: Status; from: string; detail: string; pr?: string }
const results: Result[] = [];

const sh = async (cwd: string, cmd: string): Promise<{ ok: boolean; out: string }> => {
  const r = await $`sh -c ${cmd}`.cwd(cwd).quiet().nothrow();
  return { ok: r.exitCode === 0, out: (r.stdout.toString() + r.stderr.toString()).trim() };
};

/** The pin ON origin/main, which is what a bump is based on, and the "from" in the
 *  report.
 *
 *  READ FROM origin/main AND NOT THE WORKING TREE. Half these checkouts sit on some
 *  other session's branch — nimiq.tax has been parked on `chore/app-shell-v0.2.0`
 *  for weeks — and reading the tree makes the plan describe a branch nobody is
 *  shipping.
 *
 *  MATCH THE jsDelivr URL, not any `nimiq-app-shell@v…` in the repo. A CHANGELOG
 *  that names an old release sorts before the real URL and the pin reads years out
 *  of date, which is exactly what the first dry run reported. */
function readPin(dir: string, model: App['model']): string {
  if (model === 'vendor-file') return 'vendored';
  if (model === 'dep') {
    const pkg = Bun.spawnSync(['git', 'show', 'origin/main:package.json'], { cwd: dir }).stdout.toString();
    return pkg.match(/nimiq-app-shell#(v[\d.]+)/)?.[1] ?? '?';
  }
  const hit = Bun.spawnSync(['sh', '-c',
    `git grep -h -o "cdn\\.jsdelivr\\.net/gh/Andjroo111/nimiq-app-shell@v[0-9.]*" origin/main 2>/dev/null | head -1`,
  ], { cwd: dir }).stdout.toString().trim();
  return hit ? `v${hit.split('@v')[1]!}` : '?';
}

/** Bump the patch and return the new string. Apps version independently of the shell. */
function bumpPatch(dir: string): string {
  const p = join(dir, 'package.json');
  const s = readFileSync(p, 'utf8');
  const m = s.match(/"version":\s*"(\d+)\.(\d+)\.(\d+)"/);
  if (!m) throw new Error('no semver "version" in package.json');
  const next = `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
  writeFileSync(p, s.replace(/("version":\s*")[\d.]+(")/, `$1${next}$2`));
  return next;
}

function prependChangelog(dir: string, appVersion: string, from: string): void {
  const p = join(dir, 'CHANGELOG.md');
  if (!existsSync(p)) return;
  const s = readFileSync(p, 'utf8');
  const at = s.search(/^## /m);
  const entry =
    `## [${appVersion}] — app-shell ${version}\n\n` +
    `- Pins the mini wallet at \`${version}\`, up from \`${from}\`. No API change; the mount\n` +
    `  call and every option are the same.\n\n`;
  writeFileSync(p, at < 0 ? s + '\n' + entry : s.slice(0, at) + entry + s.slice(at));
}

// ---- preflight --------------------------------------------------------------
// Before nineteen repos are touched: the tag has to exist here, and jsDelivr has
// to be serving it. A CDN app pinned at a tag the CDN cannot resolve is a blank
// header on a live site, and it would ship to seven of them at once.

const tagged = await sh(ROOT, `git tag --list ${version}`);
if (!tagged.out) {
  console.error(`✗ ${version} is not a tag in this repo. Tag and push the release first.`);
  process.exit(1);
}
const cdn = `https://cdn.jsdelivr.net/gh/Andjroo111/nimiq-app-shell@${version}/dist/app-shell.js`;
const head = await fetch(cdn, { method: 'HEAD' }).catch(() => null);
if (!head?.ok) {
  console.error(`✗ jsDelivr does not serve ${version} yet (${cdn}).`);
  console.error('  Push the tag and wait for the CDN, or the CDN apps will point at nothing.');
  process.exit(1);
}
console.log(`app-shell ${version}: tagged locally, live on jsDelivr.`);
console.log(`${apps.length} app(s)${dryRun ? ' — DRY RUN, nothing will be written' : ''}\n`);

// ---- per app ----------------------------------------------------------------

for (const app of apps) {
  const label = app.repo.padEnd(15);
  if (!existsSync(app.dir)) {
    results.push({ repo: app.repo, status: 'fail', from: '?', detail: `no checkout at ${app.dir}` });
    console.log(`${label}✗ no checkout at ${app.dir}`);
    continue;
  }

  // The splitlink lesson: a directory name is not an identity. splitlink was
  // nimiq.party renamed, byte-identical chrome and all, and pushing would have
  // fought party's own branch.
  const remote = await sh(app.dir, 'git remote -v');
  if (!remote.out.includes(`/${app.repo}`)) {
    results.push({ repo: app.repo, status: 'fail', from: '?', detail: 'remote does not match the registry' });
    console.log(`${label}✗ ${app.dir} does not point at ${app.repo}`);
    continue;
  }

  // Fetch first: `from` is read off origin/main, and a stale remote ref would
  // describe a plan against a main that moved hours ago.
  await sh(app.dir, 'git fetch -q origin');
  const from = readPin(app.dir, app.model);
  if (from === version) {
    results.push({ repo: app.repo, status: 'skip', from, detail: 'already on target' });
    console.log(`${label}· already on ${version}`);
    continue;
  }

  if (dryRun) {
    const plan = [
      app.model,
      app.worktree ? 'worktree' : 'in place',
      app.build ? `build:${app.build}` : 'no build',
      app.commitsArtifact ? 'commits artifact' : 'artifact gitignored/none',
      app.law ? 'version+CHANGELOG' : 'no version law',
      app.gates.length ? `gates:${app.gates.join('+')}` : 'no gates',
    ].join(', ');
    console.log(`${label}${from} → ${version}  [${plan}]`);
    if (app.note) console.log(`${' '.repeat(15)}⚠ ${app.note}`);
    results.push({ repo: app.repo, status: 'ok', from, detail: 'planned' });
    continue;
  }

  const branch = `chore/app-shell-${version}`;
  let work = app.dir;
  let wt: string | null = null;

  try {
    if (app.worktree) {
      wt = `${process.env.HOME}/gdkc/projects/_worktrees/${app.repo}-${version}`;
      await sh(app.dir, `git worktree remove --force ${wt} 2>/dev/null; true`);
      const add = await sh(app.dir, `git worktree add -q -B ${branch} ${wt} origin/main`);
      if (!add.ok) throw new Error(`worktree: ${add.out}`);
      work = wt;
    } else {
      const co = await sh(app.dir, `git checkout -q main && git pull -q --ff-only && git checkout -q -B ${branch}`);
      if (!co.ok) throw new Error(`checkout: ${co.out}`);
    }

    // ---- apply the bump ----------------------------------------------------
    if (app.model === 'cdn') {
      // Search the WHOLE repo minus the noise. ninja keeps its app under app/,
      // and a `public src` grep reported "no change" while doing nothing.
      const files = await sh(work,
        `grep -rl "cdn.jsdelivr.net/gh/Andjroo111/nimiq-app-shell@v" . ` +
        `--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=vendor || true`);
      const list = files.out.split('\n').map((s) => s.trim()).filter(Boolean);
      if (!list.length) throw new Error('no jsDelivr URL found anywhere in the repo');
      for (const f of list) {
        const p = join(work, f);
        writeFileSync(p, readFileSync(p, 'utf8').replace(/(nimiq-app-shell)@v[\d.]+/g, `$1@${version}`));
      }
      console.log(`${label}${from} → ${version}  (${list.length} file${list.length > 1 ? 's' : ''})`);
    } else if (app.model === 'dep') {
      const p = join(work, 'package.json');
      writeFileSync(p, readFileSync(p, 'utf8').replace(/(nimiq-app-shell#)v[\d.]+/, `$1${version}`));
      const inst = await sh(work, 'bun install');
      if (!inst.ok) throw new Error(`bun install: ${inst.out.slice(-300)}`);
      // Assert RESOLUTION, not the string we just wrote. A dep can be pinned to a
      // tag and still resolve to something else; then every later check passes on
      // the old code and the bump is a lie.
      const resolved = JSON.parse(
        readFileSync(join(work, 'node_modules/nimiq-app-shell/package.json'), 'utf8'),
      ).version;
      if (resolved !== bare) throw new Error(`resolved ${resolved}, expected ${bare}`);
    } else {
      // vendor-file: the copy IS the upgrade. There is no pin to compare, so
      // compare the BYTES — otherwise a re-run of an already-current fleet fails
      // here on "nothing staged" every single time.
      const dist = readFileSync(join(ROOT, 'dist/app-shell.js'));
      const vend = join(work, SALE_VENDOR);
      if (existsSync(vend) && Buffer.compare(dist, readFileSync(vend)) === 0) {
        throw new SkipApp('vendored copy already matches this dist');
      }
      writeFileSync(vend, dist);
    }

    // ---- rebuild the app's own bundle --------------------------------------
    if (app.build) {
      const b = await sh(work, `bun run ${app.build}`);
      if (!b.ok) throw new Error(`build ${app.build}: ${b.out.slice(-300)}`);
    }
    if (app.commitsArtifact) {
      const st = await sh(work, `git status --porcelain -- '*dist/*' '*vendor/*'`);
      if (!st.out) throw new Error('commitsArtifact is set but no artifact changed — the rebuild did not take');
    }

    // ---- the app's own quirks ----------------------------------------------
    if (app.quirk === 'sale-shell-cache') {
      // The shell is immutable within a CACHE_VERSION, and a committed fingerprint
      // guards it. Bump, then let the guard TELL us the new hash, then write it —
      // and do it AFTER the last shell edit, which is the mistake that shipped a
      // stale hash on 2026-08-15.
      const pol = join(work, 'public/sw-policy.js');
      const s = readFileSync(pol, 'utf8');
      const m = s.match(/CACHE_VERSION:\s*"v(\d+)"/);
      if (!m) throw new Error('no CACHE_VERSION in public/sw-policy.js');
      const next = `v${Number(m[1]) + 1}`;
      writeFileSync(pol, s.replace(/(CACHE_VERSION:\s*")v\d+(")/, `$1${next}$2`));
      const probe = await sh(work, 'bun test src/sw-shell-version.test.ts');
      const hash = probe.out.match(/"hash":\s*"([a-f0-9]{64})"/)?.[1];
      const files = probe.out.match(/"files":\s*(\d+)/)?.[1];
      if (!hash || !files) throw new Error('could not read the new shell fingerprint from the guard');
      writeFileSync(
        join(work, 'src/sw-shell.fingerprint.json'),
        `{\n  "version": "${next}",\n  "files": ${files},\n  "hash": "${hash}"\n}\n`,
      );
    }

    // ---- per-repo law -------------------------------------------------------
    let appVersion = '';
    if (app.law) {
      appVersion = bumpPatch(work);
      prependChangelog(work, appVersion, from);
    }

    // ---- gates --------------------------------------------------------------
    const failed: string[] = [];
    for (const g of app.gates) {
      const r = await sh(work, `bun run ${g}`);
      if (!r.ok) failed.push(`${g}: ${r.out.split('\n').slice(-3).join(' ').slice(0, 200)}`);
    }
    if (failed.length) throw new Error(`gates failed — ${failed.join(' | ')}`);

    // ---- commit -------------------------------------------------------------
    const before = (await sh(work, 'git rev-parse HEAD')).out;
    await sh(work, 'git add -A');
    const staged = await sh(work, 'git diff --cached --name-only');
    if (!staged.out) throw new Error('nothing staged after a bump that reported changes');

    const msg =
      `chore: point the mini wallet at app-shell ${version}\n\n` +
      `${from} to ${version}. ` +
      (app.model === 'cdn'
        ? 'One CDN URL; nothing here is vendored, so the browser picks up the new bundle on the next load.'
        : app.model === 'vendor-file'
          ? `${SALE_VENDOR} replaced with the ${version} dist. No dep and no build script, so the copy IS the upgrade.`
          : app.commitsArtifact
            ? 'The committed bundle is REBUILT, without which the bump is a no-op live.'
            : 'The browser bundle is gitignored here and built at deploy time, so there is nothing to commit but the pin. It was built and its resolution checked anyway.') +
      `\n\nNo API change. The mount call and every option are the same.\n` +
      (app.worktree ? `\nDone in a git worktree, so this repo's checkout was not disturbed.\n` : '') +
      `\nOpened by scripts/bump-fleet.ts.\n`;
    writeFileSync('/tmp/bump-fleet-msg.txt', msg);
    await sh(work, 'git commit -q -F /tmp/bump-fleet-msg.txt');

    // Confirm by RE-READING head. On 2026-08-15 a bash loop reported success for
    // seven repos while committing nothing at all.
    const after = (await sh(work, 'git rev-parse HEAD')).out;
    if (after === before) throw new Error('git commit did not move HEAD');

    // ---- push + PR ----------------------------------------------------------
    let pr = '';
    if (!noPr) {
      const push = await sh(work, `git push -q -u origin ${branch}`);
      if (!push.ok) throw new Error(`push: ${push.out.slice(-200)}`);
      const body =
        `Pins the mini wallet at \`${version}\`, up from \`${from}\`.\n\n` +
        (app.commitsArtifact ? 'The committed bundle is REBUILT — without that rebuild the bump is a no-op live.\n\n' : '') +
        'No API change. The mount call and every option are the same.\n\n' +
        'Opened by `scripts/bump-fleet.ts` in nimiq-app-shell. **Not auto-merged.**\n';
      writeFileSync('/tmp/bump-fleet-body.txt', body);
      const made = await sh(work,
        `gh pr create --title "Point the mini wallet at app-shell ${version}" --body-file /tmp/bump-fleet-body.txt`);
      pr = made.out.split('\n').filter((l) => l.startsWith('http')).pop() ?? '';
      if (!pr) throw new Error(`gh pr create: ${made.out.slice(-200)}`);
    }

    results.push({
      repo: app.repo, status: 'ok', from,
      detail: [app.model, appVersion && `app ${appVersion}`, app.gates.length ? 'gates green' : 'no gates']
        .filter(Boolean).join(', '),
      pr,
    });
    console.log(`${label}✓ ${pr || 'committed, no PR'}`);
  } catch (err) {
    if (err instanceof SkipApp) {
      results.push({ repo: app.repo, status: 'skip', from, detail: err.message });
      console.log(`${label}· ${err.message}`);
    } else {
      results.push({ repo: app.repo, status: 'fail', from, detail: String(err instanceof Error ? err.message : err) });
      console.log(`${label}✗ ${err instanceof Error ? err.message : err}`);
    }
  } finally {
    // A worktree that failed is left in place ON PURPOSE: it holds the state the
    // failure happened in, which is the only thing worth having at that point.
    const failedHere = results[results.length - 1]?.status === 'fail';
    if (wt && !keepWorktrees && !failedHere) {
      await sh(app.dir, `git worktree remove --force ${wt}`);
    } else if (wt && failedHere) {
      console.log(`${' '.repeat(15)}worktree kept for inspection: ${wt}`);
    }
  }
}

// ---- report -----------------------------------------------------------------

console.log('\n' + '-'.repeat(72));
for (const r of results) {
  const mark = r.status === 'ok' ? '✓' : r.status === 'skip' ? '·' : '✗';
  console.log(`${mark} ${r.repo.padEnd(15)} ${r.from.padEnd(9)} ${r.detail}${r.pr ? `  ${r.pr}` : ''}`);
}
const bad = results.filter((r) => r.status === 'fail').length;
const done = results.filter((r) => r.status === 'ok').length;
console.log('-'.repeat(72));
console.log(`${done} ok, ${results.filter((r) => r.status === 'skip').length} already there, ${bad} failed`);
if (!dryRun && !noPr && done) console.log('\nPRs are OPEN and unmerged. Review, then merge.');
process.exit(bad ? 1 : 0);
