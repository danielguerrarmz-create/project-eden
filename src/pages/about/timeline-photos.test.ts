import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { CLUSTERS } from './CrossPathsTimeline';

/**
 * THE LEDGER MUST AGREE WITH THE FILES ON DISK, AND WITH WHAT GIT WILL ACTUALLY PUBLISH.
 *
 * Round 9 committed `bbebe11`, which wired five photographs into CLUSTERS and never `git add`ed the
 * five .webp files. It typechecked. It ran clean on the author's machine, because the files were
 * sitting right there in his working tree. It would have 404'd every one of them for everybody else
 * and in the deployed build. Nothing in the suite could see it: a missing asset is not a type error,
 * and the dev server serves the untracked file quite happily.
 *
 * So these two tests ask the questions the compiler cannot:
 *
 *  1. Is the authored `ratio` the file's REAL ratio? (`projects.ts` has said "ratios are MEASURED
 *     from the file, never guessed" for several rounds; this is the first thing that enforces it.)
 *  2. Will the asset actually EXIST for a stranger who clones this repo?
 *
 * (2) is the one that matters, and it is deliberately a git question rather than a filesystem
 * question, because the filesystem answers about THIS machine and the bug was about every other one.
 */

const PUBLIC = resolve(__dirname, '../../../public');

/**
 * Read a .webp's intrinsic dimensions straight out of the RIFF container, so the assertion is about
 * the file's own pixels and not about a number someone typed twice. Handles the three frame kinds a
 * webp can carry: lossy (`VP8 `), lossless (`VP8L`) and extended (`VP8X`, which our cwebp output
 * uses). No image library needed for a header read this small.
 */
function webpSize(file: string): { w: number; h: number } {
  const b = readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error(`not a webp: ${file}`);
  }
  let o = 12;
  while (o < b.length - 8) {
    const fourcc = b.toString('ascii', o, o + 4);
    const size = b.readUInt32LE(o + 4);
    const p = o + 8;
    if (fourcc === 'VP8X') return { w: 1 + b.readUIntLE(p + 4, 3), h: 1 + b.readUIntLE(p + 7, 3) };
    if (fourcc === 'VP8 ') return { w: b.readUInt16LE(p + 6) & 0x3fff, h: b.readUInt16LE(p + 8) & 0x3fff };
    if (fourcc === 'VP8L') {
      const bits = b.readUInt32LE(p + 1);
      return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
    }
    o = p + size + (size & 1); // RIFF chunks are word-aligned
  }
  throw new Error(`no frame header: ${file}`);
}

/** Every plate in the timeline that actually points at an image (held/`pending` slots carry no src). */
const withMedia = CLUSTERS.flatMap((c) =>
  c.nodes
    .filter((n) => n.media?.src && !n.media.pending)
    .map((n) => ({ cluster: c.id, src: n.media!.src, ratio: n.media!.ratio })),
);

describe('timeline photographs: the ledger vs the files', () => {
  it('has media to check (guards the probe itself)', () => {
    // If a refactor renames CLUSTERS' shape out from under the filter, every test below would pass
    // vacuously on an empty list and report success. Trap #6 of the 2026-07-16 session close: a test
    // that asserts nothing and reports green is worse than no test.
    expect(withMedia.length).toBeGreaterThan(0);
  });

  it.each(withMedia)('$src: authored ratio is the file\'s measured ratio', ({ src, ratio }) => {
    const file = resolve(PUBLIC, src.replace(/^\//, ''));
    expect(existsSync(file), `asset missing on disk: ${src}`).toBe(true);
    if (!file.endsWith('.webp')) return; // only webp is header-readable here; others are covered by tracking

    const { w, h } = webpSize(file);

    // TOLERANCE 1e-4, AND THE NUMBER IS LOAD-BEARING — it is the precision the ratios are authored
    // at (4 dp), so it admits honest rounding of w/h (worst case 5e-5) and nothing else.
    //
    // It was 5e-3 first. Sabotaging `studio-desks` from its measured 1.5009 to a plausible-looking
    // guess of 1.5 PASSED, because 9e-4 of error fit inside that tolerance with room to spare — the
    // test was green while failing to test the one rule it exists to enforce ("ratios are MEASURED
    // from the file, never guessed"). A guessed round number is the exact defect here, and it is
    // always going to be a SMALL error, because a plausible guess is by definition close. So the
    // tolerance has to be tighter than plausible-guess distance, not merely tighter than "wrong".
    // Re-sabotaged at 1e-4: fails, as it must.
    expect(Math.abs(ratio - w / h)).toBeLessThan(1e-4);
  });

  it('every referenced asset is tracked by git, so the published build has it', () => {
    // `git ls-files` answers "what does a stranger get when they clone", which is the actual
    // question. `existsSync` answers "what is on MY disk", which is what made bbebe11 look fine.
    // This also catches the inverse: an asset held out of the repo on purpose (the 2021 orientation
    // photograph is .gitignored pending a privacy ruling) can never be silently referenced.
    const tracked = new Set(
      execFileSync('git', ['ls-files', 'public'], { cwd: resolve(__dirname, '../../..'), encoding: 'utf8' })
        .split('\n')
        .filter(Boolean),
    );
    const dangling = withMedia
      .map(({ src }) => ({ src, path: `public${src}` }))
      .filter(({ path }) => !tracked.has(path))
      .map(({ src }) => src);

    expect(dangling, `referenced but not committed — these 404 for everyone but you:\n${dangling.join('\n')}`).toEqual([]);
  });
});
