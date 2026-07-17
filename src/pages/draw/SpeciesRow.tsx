/**
 * SpeciesRow.tsx — post-bake plant selection, Samara-clear.
 *
 * One card per real species (all seven — every one is a real structural option,
 * and the frame has room). Picking one calls the store's `setSpecies`, which
 * re-runs the real engine on the same drawn shape: the strut field and the
 * commission figure both re-tune from that one call, no plumbing here.
 *
 * Sits in the SAME real estate the draw toolbar holds pre-bake (`top-14`,
 * centered), and that slot changes meaning the instant you bake: tools become
 * options. Mutually exclusive with the toolbar by construction (that gates on
 * `soft`, this is mounted on `baked`), and DrawPage hides it while exploded or
 * dissolving, matching the explode chip's own pattern rather than inventing a
 * disabled state.
 *
 * Post-bake ONLY: species changes the real armature, which does not exist until
 * there is a baked lattice to apply it to. A picker over the soft skin would be
 * a control with no legible effect, exactly what the nudge-panel philosophy
 * argues against.
 */
import { useDesign } from '../../state/store';
import { SPECIES } from '../../engine/species';
import { deDash } from '../../ui/text';
import { swatchFor } from './speciesSwatch';

export function SpeciesRow() {
  const speciesId = useDesign((s) => s.params.speciesId);
  const setSpecies = useDesign((s) => s.setSpecies);

  return (
    <div className="absolute left-1/2 top-14 flex -translate-x-1/2 gap-1.5">
      {SPECIES.map((sp) => {
        const active = sp.id === speciesId;
        return (
          <button
            key={sp.id}
            onClick={() => setSpecies(sp.id)}
            aria-pressed={active}
            className={`min-w-[104px] rounded-lg border px-2.5 py-1.5 text-left backdrop-blur transition ${
              active
                ? 'border-accentOlive bg-accentOlive/10'
                : 'border-inkBlack/20 bg-paperVellum/80 hover:border-inkBlack/40'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: swatchFor(sp.id) }}
              />
              <span
                className={`font-serifDisplay text-[12px] leading-tight ${
                  active ? 'text-inkBlack' : 'text-inkBlack/75'
                }`}
              >
                {sp.common}
              </span>
            </div>
            <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-inkBlack/45">
              {sp.habit} · {deDash(sp.floweringMonths)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
