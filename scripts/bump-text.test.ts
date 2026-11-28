import { describe, expect, test } from 'bun:test';
import { changelogEntry, commitMessage, noteProblem, prBody, type Bump } from './bump-text';

const NOTE =
  'Bug report capture now redacts long hex, long base64 and seed phrase lines before sending; adds `clearReportCapture`.';
const bump: Bump = { version: 'v0.34.2', from: 'v0.34.1', note: NOTE };

// Every shape a commit message and a PR body can take.
const commits = [
  commitMessage(bump, { model: 'cdn' }, 'x.js'),
  commitMessage(bump, { model: 'vendor-file', worktree: true }, 'x.js'),
  commitMessage(bump, { model: 'dep', commitsArtifact: true }, 'x.js'),
  commitMessage(bump, { model: 'dep', commitsArtifact: false }, 'x.js'),
];
const bodies = [prBody(bump, { commitsArtifact: true }), prBody(bump, { commitsArtifact: false })];

/** Undo the CHANGELOG fill so a note that wrapped can be compared whole. */
const unwrap = (s: string): string => s.replace(/\n {2}/g, ' ');

describe('the note reaches everything a reviewer reads', () => {
  test('the CHANGELOG entry carries it after the pin sentence', () => {
    const entry = changelogEntry(bump, '0.14.13');
    expect(entry.startsWith('## [0.14.13] — app-shell v0.34.2\n\n- Pins the mini wallet at `v0.34.2`, up from `v0.34.1`. ')).toBe(true);
    expect(unwrap(entry)).toContain(NOTE);
    expect(entry.endsWith('\n\n')).toBe(true);
  });

  test('the CHANGELOG bullet is filled to 88 columns with a hanging indent', () => {
    const lines = changelogEntry(bump, '0.14.13').trimEnd().split('\n').slice(2);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(88);
    for (const l of lines.slice(1)) expect(l.startsWith('  ')).toBe(true);
  });

  test('every commit message and PR body carries it', () => {
    for (const text of [...commits, ...bodies]) expect(text).toContain(NOTE);
  });
});

describe('nothing about a release is hard coded', () => {
  // The sentence that put seven v0.34.2 PRs on hold. With a note that does not
  // say it, no output may say it either.
  test('no template claims the API did not change', () => {
    for (const text of [changelogEntry(bump, '1.0.0'), ...commits, ...bodies]) {
      expect(text).not.toMatch(/no api change/i);
      expect(text).not.toContain('every option');
    }
  });

  test('no em or en dash in a commit message or a PR body', () => {
    for (const text of [...commits, ...bodies]) expect(text).not.toMatch(/[–—]/);
  });
});

describe('noteProblem', () => {
  test('accepts one plain line', () => {
    expect(noteProblem(NOTE)).toBeNull();
  });

  test('refuses a missing, empty, swallowed-flag, multi-line or dashed note', () => {
    expect(noteProblem(undefined)).not.toBeNull();
    expect(noteProblem('   ')).not.toBeNull();
    expect(noteProblem('--dry-run')).not.toBeNull();
    expect(noteProblem('one\ntwo')).not.toBeNull();
    expect(noteProblem('rebuilt — again')).not.toBeNull();
    expect(noteProblem('pages 1–2')).not.toBeNull();
  });
});
