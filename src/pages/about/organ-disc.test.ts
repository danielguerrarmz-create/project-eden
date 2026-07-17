import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * THE ORGAN DISC MASK — "the strange blur on our flowers" (Daniel, 2026-07-17), guarded as a CLASS.
 *
 * WHY THIS TEST READS SOURCE TEXT, which is not how this suite normally works. The bug was **three
 * byte-identical copies of the same four lines**, in two different files, owned by two different
 * people. Edward measured and fixed two (`#coda-organ-disc`, `#paren-organ-disc`, `2a77821`) and said
 * plainly that the third was not his; the third (`#sub-organ-disc`) sat wrong for another commit
 * until someone went looking. **A guard on any one of them would have gone green while the other two
 * were broken** — which is exactly what "our flowers" (plural, from across the room) was telling us.
 * The invariant is not about a component. It is about every disc that exists, including the fourth one
 * nobody has written yet, so the only honest place to assert it is over the source.
 *
 * THE MECHANISM, because the numbers look like taste until you know it: **SVG mask alpha is
 * LUMINANCE.** `<stop offset="0.45" stopColor="#fff"/><stop offset="1" stopColor="#000"/>` does not
 * feather an edge — it makes the disc fully opaque only inside r = 0.45R and ramps to nothing after.
 * Measured against `ORGAN_DISC_R` = 85: mean applied alpha **0.551**, with only **20.3%** of the
 * disc's area ever reaching full opacity, at STEADY STATE — camera settled, reveal over, nothing
 * growing. Two thirds of every flower was semi-transparent, permanently.
 *
 * AND IT IS NOT THE TIMING BUG IT LOOKS LIKE. Round 10 found `organAt` keyed to a growth saturating
 * at 1 while asking for `t + LAG + FADE`, so 87 of 218 organs could never reach full opacity. That was
 * real and it was fixed and **this survived it**, because a mask constant is not a function of scroll:
 * no reveal change could ever reach it. Same symptom, two mechanisms, and fixing the first made the
 * second read as a style choice. That is why the second stop matters too — `stopOpacity=0` on the
 * black stop, because mask children composite SOURCE-OVER, so an OPAQUE black rim paints over an
 * earlier disc's revealed core and an organ gets dimmed by its NEIGHBOUR's edge.
 */
describe('the organ disc mask: every copy of it, including ones not written yet', () => {
  /** Every tracked source file — asked of git, so a file a stranger would clone is a file we check.
   *  Globbing the working tree would also scan untracked scratch and miss nothing that matters; git is
   *  the list that says what actually ships. */
  const files = execFileSync('git', ['ls-files', 'src'], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));

  /** Every `<radialGradient id="...organ-disc">` block in the codebase, with its stops. */
  const discs = files.flatMap((f) => {
    const src = readFileSync(resolve(f), 'utf8');
    const out: Array<{ file: string; id: string; body: string }> = [];
    const re = /<radialGradient\s+id="([a-z-]*organ-disc)"\s*>([\s\S]*?)<\/radialGradient>/g;
    for (let m = re.exec(src); m; m = re.exec(src)) out.push({ file: f, id: m[1], body: m[2] });
    return out;
  });

  it('finds every disc there is — a probe that scans nothing passes everything', () => {
    // THE VACUITY GUARD, and it is the one that matters most here: every assertion below iterates
    // `discs`, so an empty list satisfies all of them. `qa/project-media.mjs` once printed
    // "PASS across all 0 projects" while the page would not compile. If the regex drifts, or the
    // markup is reformatted, this test would go quietly green while checking nothing.
    expect(discs.map((d) => d.id).sort(), 'the disc scan found the wrong set — is the regex stale?').toEqual([
      'coda-organ-disc',
      'paren-organ-disc',
      'sub-organ-disc',
    ]);
  });

  it('is opaque out to where the organ actually IS — the core is not a wash', () => {
    for (const d of discs) {
      const core = /offset="([\d.]+)"\s+stopColor="#fff"/.exec(d.body);
      expect(core, `${d.id} (${d.file}) has no white core stop`).not.toBeNull();
      const at = parseFloat(core![1]);
      // 0.45 was the shipped value: opaque only to r=38.25 of 85, mean alpha 0.551. At 0.9 the core
      // reaches 76.5 of 85 (81.0% of the area, mean alpha 0.903) and the softness is a rim feather,
      // which is what the comment always claimed it was. Asserted as a FLOOR, not an equality: the
      // exact feather is a look call and Daniel's to move; a core that retreats back toward the middle
      // of the organ is the bug and cannot come back.
      expect(at, `${d.id} (${d.file}) is a wash, not a feather — two thirds of the flower is transparent`).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('...and its rim is TRANSPARENT black, so one organ cannot paint over its neighbour', () => {
    for (const d of discs) {
      const rim = /offset="1"\s+stopColor="#000"([^/]*)\/>/.exec(d.body);
      expect(rim, `${d.id} (${d.file}) has no black rim stop`).not.toBeNull();
      // Mask children composite source-over. An OPAQUE black rim is not "no contribution" — it is a
      // contribution of BLACK, i.e. it actively erases whatever an earlier disc already revealed. The
      // sub-branch layer alone resolves 332 discs and they overlap constantly.
      expect(
        rim![1],
        `${d.id} (${d.file}): the rim is OPAQUE black — a later disc's edge erases an earlier disc's core`,
      ).toContain('stopOpacity="0"');
    }
  });
});
