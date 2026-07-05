# Living Eden: Documentation & Generative Engine Design Direction

Status: proposed, awaiting Daniel's sign-off. Nothing in this document has been applied to the app yet.

Scope: this direction governs the Generative Engine explainer page and internal and LP-facing materials (pitch decks, technical diagrams, one-pagers). It is a second, coexisting visual layer, not a replacement for the configurator's current warm paper and moss look.

## 1. Direction summary

Editorial high-contrast serif typography set on flat, saturated "acid pastel" color fields, annotated with hairline technical linework in the vocabulary of architectural drawing: dimension lines, section marks, axonometric diagrams, tick-marked callouts. The type carries the emotional register (confident, considered, a little theatrical, the way a well-set type specimen or a Bauhaus-era manifesto reads). The linework carries the technical register (precise, restrained, legible at small sizes). The color fields are not decoration: each field is a page ground or a diagram background, never a stripe or a badge. Where the current app is organic, warm, and botanical, this layer is graphic, cool-warm contrasted, and drafting-table precise. It exists specifically to explain how the generative engine works and to give the accelerator's LPs something that reads like it came out of an architecture studio, not a SaaS deck.

## 2. Color tokens

These hex values are extrapolated by eye from the three reference specimens (Freight Big Pro type specimen, a lime-ground editorial serif specimen, and a yellow-ground "WØRKS" Bauhaus-referencing specimen), not sampled with a picker. Treat them as a starting palette to refine against real screens, not final production hex.

| Token | Approx. hex | Source | Proposed role |
|---|---|---|---|
| `field-blue` | `#C3DEF2` | Freight Big Pro specimen ground | Page ground, cool/quiet sections |
| `field-chartreuse` | `#D8F27E` | Lime specimen ground | Page ground, high-energy sections (e.g. "how it grows") |
| `field-yellow` | `#F0CE1B` | WØRKS specimen ground | Page ground, high-alert or "core mechanism" sections |
| `ink-navy` | `#232C5E` | Freight specimen body text | Primary ink on `field-blue`; also works as a deep neutral ink on paper |
| `ink-black` | `#17160F` | Lime/yellow specimen body text | Primary ink on `field-chartreuse` and `field-yellow`; near-black, slightly warm |
| `accent-olive` | `#ACC13A` | Freight specimen ampersand | The single functional accent across this layer: active states, key numerals, the one emphasized mark per diagram |
| `paper-vellum` | `#FBF9F3` | New, proposed | Neutral ground for drawing sheets and dense diagrams; warmer and slightly lighter than the app's existing `paper` (`#F6F4EE`) so technical sheets read as a distinct surface, not a copy of the configurator background |

Roles, stated plainly: the three field colors (`field-blue`, `field-chartreuse`, `field-yellow`) are section grounds, used one at a time, full-bleed, never combined on one screen. `ink-navy` and `ink-black` are text and linework ink, chosen per field for contrast (navy on blue, black on chartreuse or yellow). `accent-olive` is the single chromatic accent for this layer: use it the way the specimen used its ampersand, sparingly, for one emphasized element per composition (a key metric, an active diagram node, a pull-quote mark). `paper-vellum` is the neutral for diagram sheets that need to sit on their own, outside a saturated field, the way a drafting sheet does.

## 3. Type system

**Primary display: Freight Big Pro** (Adobe Fonts, license required). Weights observed in the specimen: light, book, medium, semibold, bold, black, each with a matching italic. This is a transitional serif with moderate-to-high contrast and a restrained, confident character, doing the "manifesto" register of the direction.

Free web fallback for Freight Big Pro: **Source Serif 4** (variable, wght 200 to 900, real italics, generous weight range that mirrors Freight's light-to-black span). It will not be a perfect match but holds the same transitional proportions and is easy to license-free self-host or pull from Google Fonts.

For the higher-contrast, more theatrical display moments that echo the lime and yellow specimens (section openers, the generative engine hero, pull-quotes): use a genuinely high-contrast serif rather than stretching Freight further. Recommendation: **Bodoni Moda** (variable, Google Fonts, very high stroke contrast, sharp serifs, strong italics). This is the "WØRKS" register: sharp, editorial, a little severe.

CSS stacks:

```css
--font-display: "Freight Big Pro", "Source Serif 4", "Fraunces", Georgia, serif;
--font-display-hairline: "Bodoni Moda", "Freight Big Pro", "Source Serif 4", Georgia, serif;
```

**Workhorse (UI and body): keep Inter.** It is already in the app, reads clean and neutral next to a high-contrast display serif, and supports tabular numerals, which this system should use everywhere numbers appear (dimensions, metrics, dates).

**Mono (technical annotation, dimensions, callouts): IBM Plex Mono** as the primary pick. Its slightly geometric, technical-drafting character suits dimension strings and section labels better than a code-editor mono. **JetBrains Mono** is an acceptable fallback if Plex is unavailable or if consistency with other Axon-fleet surfaces (which standardize on JetBrains Mono) matters more than the marginal character difference.

```css
--font-mono: "IBM Plex Mono", "JetBrains Mono", ui-monospace, "SFMono-Regular", monospace;
```

Scale guidance:

- Hero display: `clamp(2.75rem, 6vw, 5.5rem)`, Freight/Source Serif 4, weight black or bold, tight tracking (`-0.01em` to `-0.02em`).
- Section display: `clamp(1.75rem, 3.5vw, 3rem)`, same family, weight semibold.
- High-contrast display moments (Bodoni Moda stack): reserve for one headline per page, weight 500 to 700, tracked slightly looser than the Freight stack since Bodoni Moda's contrast already carries visual weight.
- Body: 16 to 18px Inter, 400, line-height 1.6.
- Mono annotation: 10 to 11px, uppercase, `+0.04em` tracking, tabular numerals.
- Italic usage follows the specimens directly: italicize a single word or short phrase within a headline for emphasis (the way "campaign" and "collective human experience" are italicized in the references), never a whole headline. Use italic body text sparingly, for one emphasized sentence per section at most.

## 4. Hairline technical drawing language

- **Stroke widths:** 0.5px for primary linework at standard screen density, 0.75px on high-density displays or print exports so lines do not disappear. Dimension extension lines: 0.5px. Dimension lines: 0.75px with small tick or arrow terminators (2px marks, not filled arrowheads, matching architectural drafting convention rather than engineering convention).
- **Line color by field:**
  - On `field-blue`: `ink-navy` hairlines. Secondary or de-emphasized lines: `ink-navy` at roughly 60 to 70 percent opacity.
  - On `field-chartreuse` or `field-yellow`: `ink-black` hairlines, same opacity rule for secondary lines.
  - On `paper-vellum` or the app's existing paper ground: `ink-black` for primary lines, the app's existing `inkSoft` for secondary or dimension-only lines, keeping continuity with the configurator's ink system.
- **White-on-color:** reserved for the rare case where linework sits over a dense photographic or rendered image inside a saturated field (a render thumbnail dropped into a chartreuse section, for example). Default everywhere else is ink-on-field. Do not use white-on-color as a general stylistic choice; it is a legibility exception.
- **Dimension and annotation style:** mono face (Plex Mono), uppercase or small-caps labels, tabular numerals, tick marks at line endpoints. Callout leader lines: 0.5px, dashed, terminating in a small open circle rather than an arrowhead, to keep the language closer to architectural annotation than engineering schematic.
- **Axonometric and system diagrams:** single hairline weight throughout, no bold outlines and no drop shadows. Fills, where used, are flat tints of the field colors at 8 to 15 percent opacity, never gradients. `accent-olive` is permitted as a single highlight fill or stroke per diagram, to mark the one active or emphasized node, consistent with its role as the system's one chromatic accent.
- **Section marks:** where a diagram implies a cut or section (an axonometric cutaway of the pavilion structure, for instance), use the standard architectural section-cut hatch at a light angle, 0.5px lines, spaced no tighter than 4px, in the field's paired ink color.

## 5. Application notes

This is an additive layer, not a reskin. The configurator itself (the living, botanical, warm-paper experience Daniel and Clay are building) keeps its current identity untouched: `paper`, `paperDeep`, `ink`, `inkSoft`, `inkFaint`, `line`, `moss`, `mossDeep`, `bloom`, `bark`, `amber`, and the Fraunces display plus Inter body pairing all stay exactly as they are in `tailwind.config.js` and `src/index.css`.

What this direction adds, as a second, clearly-scoped token set for the Generative Engine page and LP/internal materials only:

**Tailwind config additions (extend, do not replace):**

```js
colors: {
  // ...existing paper/moss/bloom system untouched...
  fieldBlue: '#C3DEF2',
  fieldChartreuse: '#D8F27E',
  fieldYellow: '#F0CE1B',
  inkNavy: '#232C5E',
  inkBlack: '#17160F',
  accentOlive: '#ACC13A',
  paperVellum: '#FBF9F3',
},
fontFamily: {
  // ...existing display/sans/mono untouched...
  displayHairline: ['"Bodoni Moda"', '"Freight Big Pro"', '"Source Serif 4"', 'Georgia', 'serif'],
  mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
},
```

Note the `mono` family is the one existing token this direction proposes changing in place, since the current `mono` stack (`ui-monospace, SFMono-Regular, monospace`) is a system-font fallback with no expressed personality yet; giving it a real technical mono benefits both layers.

**What stays:** the configurator's warm paper and moss palette, Fraunces for the configurator's own display moments, the botanical range-slider styling, the sway and grow-in animation system. None of that is touched by this direction.

**What changes, and where:** the Generative Engine explainer page adopts the field-color grounds (one field color per page section, full-bleed), Freight Big Pro or its Source Serif 4 fallback for headlines, Bodoni Moda for the single high-contrast hero or pull-quote moment, and the hairline diagram language for any illustration of how the generative engine actually works (parametric inputs, the pavilion's generative logic, site-to-form diagrams). Internal and LP-facing materials (decks, one-pagers, technical appendices) adopt the same system wholesale, since they are documentation artifacts rather than the live product experience.

**Coexistence:** because two systems now exist side by side (the organic configurator and the technical documentation layer), keep them visually distinct rather than blending them. Do not introduce `field-blue` or `accentOlive` into the configurator's own screens, and do not introduce `moss` or `bloom` into the documentation layer. The dividing line is: if the user is inside the tool shaping their pavilion, it is paper and moss; if they are reading about how the tool works, or an LP is reading a deck, it is field color and hairline.

**Next step:** this document is for sign-off, not build. Once Daniel approves the palette and type pairing, the Generative Engine page can move to a build spec (component-level: which sections use which field color, where diagrams live, exact clamp values in context).

---

**Amendment, 2026-07-05:** Daniel overrode the coexistence boundary above. The Eden documentation language now governs the whole app, including the configurator itself, not just the Generative Engine page and LP materials. The "Coexistence" paragraph above is preserved as written because it was the correct call at the time and records real reasoning, not because it still holds: `paper`, `moss`, and `bloom` are being retired from the configurator, and `paperVellum`, `inkBlack`, and `accentOlive` now apply app-wide. See `docs/CONFIGURATOR-OVERHAUL-SPEC.md` for the full build spec this change produced. This note exists so this document stays an honest record of a decision that changed, rather than silently rewriting history.
