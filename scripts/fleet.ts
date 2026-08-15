// The fleet registry: every app that mounts the mini wallet, and how it takes an
// update. Split from bump-fleet.ts so the list is editable without reading the
// driver, and so `bun run check` type-checks a new entry rather than letting a
// typo surface as "no change" halfway through a nineteen-repo run.
//
// WHY A REGISTRY AND NOT DISCOVERY: the models are not inferable. A repo with a
// `build:shell` script may or may not COMMIT what it builds, and the difference
// decides whether a bump is real or a no-op live. That fact lives here.

/** How the shell reaches the browser. This is the only thing that decides the work. */
export type Model =
  /** Fetched at RUNTIME from jsDelivr. Bumping is one URL; no build, no deploy. */
  | 'cdn'
  /** A git dep, compiled into the app's own bundle. Bump + install + rebuild. */
  | 'dep'
  /** A dist file copied in by hand. No dep, no build script: replacing it IS the upgrade. */
  | 'vendor-file';

export interface App {
  /** GitHub repo under Andjroo111. Also the assertion made against `git remote -v`. */
  repo: string;
  /** Local checkout. */
  dir: string;
  model: Model;
  /** The script that rebuilds the app's own bundle, for `dep` apps that have one. */
  build?: string;
  /** True when the built bundle is COMMITTED. False when it is gitignored and built
   *  at deploy time, where a bump legitimately touches package.json alone. Getting
   *  this wrong is the difference between a real bump and a silent no-op. */
  commitsArtifact?: boolean;
  /** House rule: every PR bumps package.json AND adds a CHANGELOG entry. */
  law?: boolean;
  /** Gate scripts, in order. Named explicitly because they are not uniform:
   *  swellet calls them `typecheck`/`test:unit`, and ninja has no scripts at all. */
  gates: string[];
  /** Work in a git worktree instead of the checkout. Set for a CONTESTED clone (a
   *  parallel session builds there), a repo whose checkout serves live traffic, or
   *  a repo whose own rules demand it. */
  worktree?: boolean;
  /** Anything else the app needs. `sale` alone has one. */
  quirk?: 'sale-shell-cache';
  /** Why this entry is unusual, printed by --dry-run so the plan reads honestly. */
  note?: string;
}

const P = `${process.env.HOME}/gdkc/projects`;

export const FLEET: App[] = [
  // ---- CDN: one URL, no build, no deploy -----------------------------------
  { repo: 'nimiq.cards', dir: `${P}/nimiq.cards`, model: 'cdn', law: true,
    gates: ['check', 'test'],
    note: 'its `lint` needs a Playwright browser CI installs and a laptop may not; left out of the gate set on purpose' },
  { repo: 'nimiq.gives', dir: `${P}/nimiq.gives`, model: 'cdn', law: true, gates: ['check', 'test', 'lint'] },
  { repo: 'nimiq.ninja', dir: `${P}/nimiq.ninja`, model: 'cdn', gates: [],
    note: 'no package scripts at all, and its app lives under app/ rather than public/' },
  { repo: 'nimiq.software', dir: `${P}/nimiq.software`, model: 'cdn', law: true, gates: ['check', 'test'] },
  { repo: 'nimiq.stream', dir: `${P}/nimiq.stream`, model: 'cdn', law: true, gates: ['check', 'test', 'lint'],
    note: 'carries the URL on four pages' },
  { repo: 'swellet', dir: `${P}/swellet`, model: 'cdn', law: true, gates: ['typecheck', 'test:unit'],
    note: 'brands the control through its own --nq-cc-* block; a bump must not touch that' },
  { repo: 'nimiq.vote', dir: `${P}/nimiq.vote`, model: 'cdn', gates: ['check', 'test', 'lint'],
    note: 'the URL is in public/js/i18n.js, not an html file' },

  // ---- dep: compiled into the app's own bundle -----------------------------
  { repo: 'nimiq.casino', dir: `${P}/nimiq.casino`, model: 'dep', build: 'build', commitsArtifact: true, law: true, gates: ['check', 'test'] },
  { repo: 'nimiq.life', dir: `${P}/nimiq.life`, model: 'dep', build: 'build', commitsArtifact: false, law: true, gates: ['check', 'test', 'lint'] },
  { repo: 'nimiq.work', dir: `${P}/nimiq.work`, model: 'dep', build: 'build', commitsArtifact: false, law: true, gates: ['check', 'test', 'lint'],
    note: 'the only app in the fleet that wires reportBug, so the bug glyph is visible here and nowhere else' },
  { repo: 'nimiq.party', dir: `${P}/nimiq.party`, model: 'dep', build: 'build:shell', commitsArtifact: true, law: true, gates: ['check', 'test'],
    note: 'its CI greps the built bundle for API symbols; an API rename needs that list moved too, over SSH' },
  { repo: 'nimiq.gift', dir: `${P}/nimiq.gift`, model: 'dep', build: 'build:shell', commitsArtifact: true, gates: ['check', 'test'] },
  { repo: 'nimiq.name', dir: `${P}/nimiq.name`, model: 'dep', build: 'build:shell', commitsArtifact: true, gates: ['check', 'test'] },
  { repo: 'nimiq.talk', dir: `${P}/nimiq.talk`, model: 'dep', build: 'build:shell', commitsArtifact: false, law: true, gates: ['check', 'test'] },
  { repo: 'nimiq.cool', dir: `${P}/nimiq.cool`, model: 'dep', build: 'build:shell', commitsArtifact: true, gates: ['check'], worktree: true,
    note: 'CONTESTED clone, a parallel session builds here. Its tests can be red for reasons that are not yours; check against origin/main before believing them' },
  { repo: 'nimiq.money', dir: `${P}/nimiq.money`, model: 'dep', build: 'build:shell', commitsArtifact: true, law: true, gates: ['check', 'test', 'lint'], worktree: true,
    note: 'house rule: agents work in worktrees' },
  { repo: 'nimiq.tax', dir: `${P}/nimiq.tax`, model: 'dep', build: 'build:shell', commitsArtifact: true, gates: ['check', 'test'], worktree: true,
    note: 'its checkout has carried another session s uncommitted work for weeks' },
  { repo: 'nimiq.tips', dir: `${P}/nimiq.tips`, model: 'dep', build: 'build:shell', commitsArtifact: true, law: true, gates: ['check', 'test'], worktree: true,
    note: 'house rule: agents work in worktrees. Nine pages carry chrome. Its deploy job reports SUCCESS while skipping, for want of a Fly token' },

  // ---- vendor-file: the copy IS the upgrade --------------------------------
  { repo: 'nimiq.sale', dir: `${process.env.HOME}/Projects/nimiq.sale`, model: 'vendor-file',
    gates: ['check', 'test'], worktree: true, quirk: 'sale-shell-cache',
    note: 'its checkout SERVES LIVE via launchd, and its shell is fingerprinted, so the cache version and hash move with the file' },
];

/** Where a `vendor-file` app keeps its copy, and where the shell's own dist is. */
export const SALE_VENDOR = 'public/js/vendor/app-shell.js';
