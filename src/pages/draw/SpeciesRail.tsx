/**
 * SpeciesRail.tsx — post-bake plant selection, relocated to the right edge.
 *
 * Round 2 shipped this as a top-centre row (`SpeciesRow`), which collided with
 * the dome at tight zoom (round-3 brief item 1). Same content, same gating, same
 * one-call `setSpecies` that re-tunes the armature and the commission figure;
 * only the shape and place change. It is now a vertical rail of fixed-width
 * cards on the right, out of the drawing workflow and clear of the crown, with a
 * defensive `max-h` + scroll for a short laptop viewport.
 *
 * Under the cards sit the three growth-year pills (spec C3): the studio's own
 * Year 0/1/3 mechanism (`params.year` / `setYear`, computed `outputs.growth`),
 * wired into the draw page so a viewer can see potential growth over time. They
 * share this column because they are one control surface: which plant, and how
 * grown-in.
 *
 * The swatch dot is the plant's real bloom colour (`speciesVisual.ts`, spec B3),
 * so it previews the flower the structure will actually carry rather than a
 * decorative hue.
 */
import { useDesign } from '../../state/store';
import { SPECIES } from '../../engine/species';
import { GROWTH } from '../../data/config';
import { deDash } from '../../ui/text';
import { swatchFor } from './speciesSwatch';

export function SpeciesRail() {
  const speciesId = useDesign((s) => s.params.speciesId);
  const setSpecies = useDesign((s) => s.setSpecies);
  const year = useDesign((s) => s.params.year);
  const setYear = useDesign((s) => s.setYear);

  return (
    <div className="absolute right-4 top-1/2 flex max-h-[80vh] w-[168px] -translate-y-1/2 flex-col gap-1.5 overflow-y-auto">
      {SPECIES.map((sp) => {
        const active = sp.id === speciesId;
        return (
          <button
            key={sp.id}
            onClick={() => setSpecies(sp.id)}
            aria-pressed={active}
            className={`w-full rounded-lg border px-2.5 py-1.5 text-left backdrop-blur transition ${
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

      {/* Growth over time. Same three-stage mechanism as the studio, native to
          this rail's register: mono labels, vellum, accentOlive selected. */}
      <div className="mt-0.5 flex items-center gap-1 rounded-lg border border-inkBlack/15 bg-paperVellum/80 p-1 backdrop-blur">
        {GROWTH.years.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            aria-pressed={year === y}
            className={`flex-1 rounded-md px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] transition ${
              year === y
                ? 'bg-inkBlack text-paperVellum'
                : 'text-inkBlack/55 hover:text-inkBlack'
            }`}
          >
            yr {y}
          </button>
        ))}
      </div>
    </div>
  );
}
