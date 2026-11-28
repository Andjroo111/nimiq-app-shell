// What a bump SAYS: the CHANGELOG entry, the commit message and the PR body.
// Split from bump-fleet.ts because that file runs the fleet as it is imported,
// so nothing in it can be tested, and this text is what a reviewer reads.
//
// WHY THE NOTE IS AN ARGUMENT. Until v0.34.2 all three carried a hard coded "No
// API change. The mount call and every option are the same." v0.34.2 added an
// export (clearReportCapture) and changed what bug report text leaves the page,
// and seven PRs went out saying nothing had changed; every one was put on hold.
// A sentence about a release cannot live in a template, so it is passed in once
// per run (`--note`) and used in all three places, and a run that writes anything
// refuses to start without it.

import type { App } from './fleet';

/** Why `note` cannot be used, or null when it can. */
export function noteProblem(note: string | undefined): string | null {
  if (!note?.trim()) return 'it is missing or empty';
  if (note.trim().startsWith('--')) return 'it starts with "--", so the flag took the next flag as its value';
  if (/[\r\n]/.test(note)) return 'it must be one line; it becomes one CHANGELOG bullet';
  if (/[–—]/.test(note)) return 'it has an em or en dash; recast with a period, comma or colon';
  return null;
}

/** Fill `text` to `width` columns, continuation lines indented by `indent`. */
function wrap(text: string, width: number, indent: string): string {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const lead = lines.length ? indent : '';
    if (line && lead.length + line.length + 1 + word.length > width) {
      lines.push(lead + line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push((lines.length ? indent : '') + line);
  return lines.join('\n');
}

export interface Bump {
  /** The shell tag being moved to, `v0.34.2`. */
  version: string;
  /** The pin on origin/main before the bump. */
  from: string;
  /** What this release changes for an app, one line, the same in every repo. */
  note: string;
}

// The heading keeps the dash every existing entry in the fleet's CHANGELOGs has;
// changing it here would split each file into two heading styles.
export function changelogEntry(b: Bump, appVersion: string): string {
  const bullet = `- Pins the mini wallet at \`${b.version}\`, up from \`${b.from}\`. ${b.note.trim()}`;
  return `## [${appVersion}] — app-shell ${b.version}\n\n${wrap(bullet, 88, '  ')}\n\n`;
}

export function commitMessage(
  b: Bump,
  app: Pick<App, 'model' | 'commitsArtifact' | 'worktree'>,
  vendorFile: string,
): string {
  return (
    `chore: point the mini wallet at app-shell ${b.version}\n\n` +
    `${b.from} to ${b.version}. ` +
    (app.model === 'cdn'
      ? 'One CDN URL; nothing here is vendored, so the browser picks up the new bundle on the next load.'
      : app.model === 'vendor-file'
        ? `${vendorFile} replaced with the ${b.version} dist. No dep and no build script, so the copy IS the upgrade.`
        : app.commitsArtifact
          ? 'The committed bundle is REBUILT, without which the bump is a no-op live.'
          : 'The browser bundle is gitignored here and built at deploy time, so there is nothing to commit but the pin. It was built and its resolution checked anyway.') +
    `\n\n${b.note.trim()}\n` +
    (app.worktree ? `\nDone in a git worktree, so this repo's checkout was not disturbed.\n` : '') +
    `\nOpened by scripts/bump-fleet.ts.\n`
  );
}

export function prBody(b: Bump, app: Pick<App, 'commitsArtifact'>): string {
  return (
    `Pins the mini wallet at \`${b.version}\`, up from \`${b.from}\`.\n\n` +
    (app.commitsArtifact ? 'The committed bundle is REBUILT. Without that rebuild the bump is a no-op live.\n\n' : '') +
    `${b.note.trim()}\n\n` +
    'Opened by `scripts/bump-fleet.ts` in nimiq-app-shell. **Not auto-merged.**\n'
  );
}
