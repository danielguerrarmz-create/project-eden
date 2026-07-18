# Is there a citable structural bound for the unsupported eave cantilever (`apertureDeg`)?

Companion to `2026-07-17-discrete-timber-assembly.md`. Read-only, no source edited.
Answers the team lead's three questions directly: (1) is there a citable bound, (2) if not,
what would produce one, (3) where does the current geometry actually sit.

**Short answer: no. The discrete/modular-timber-assembly literature does not contain a
transferable number for this, and I don't think it can — it's answering a different
question than the one being asked. That's not a failed search; it's what the search
found. What follows is why, what the actual geometric exposure is (verified directly
against the code, not estimated), and what would produce a real number.**

---

## What I tried

Chased the lead named in the first doc — Weinand/Robeller, EPFL IBOIS — as far as this
session's tools would let me:

- Robeller, C. *Integral Mechanical Attachment for Timber Folded Plate Structures.*
  EPFL Doctoral Thesis No. 6564 (2015), advisor Yves Weinand. Infoscience record
  `dd3ea706-4d89-428a-a9cf-430e59921861`.
- Stitic, A., Robeller, C., Weinand, Y. "Timber Folded Plate Structures — Folded Form
  Analysis." IABSE Conference: Elegance in Structures, Nara, Japan, 13–15 May 2015.
  Infoscience `record/210402`.
- Robeller, C., Nabaei, S.S., Weinand, Y. "Design and Fabrication of Robot-Manufactured
  Joints for a Curved-Folded Thin-Shell Structure." (2014). Infoscience `record/197903`
  — documents a real 13.5 m span built curved-CLT-shell prototype.
- Robeller, C., Weinand, Y. "Fabrication-Aware Design of Timber Folded Plate Shells with
  Double Through Tenon Joints." RobArch 2016 (Springer, DOI
  10.1007/978-3-319-26378-6_12).
- Stitic, A., Weinand, Y. "Timber Folded Plate Structures — Topological and Structural
  Considerations." *International Journal of Space Structures* 30(2), 169–178 (2015).
  DOI 10.1260/0266-3511.30.2.169.
- Roche, S., Robeller, C., Humbert, L., Weinand, Y. "On the semi-rigidity of dovetail
  joint for the joinery of LVL panels." *European Journal of Wood and Wood Products*
  73, 667–675 (2015). DOI 10.1007/s00107-015-0932-y.

Every direct-text attempt was blocked in this environment: EPFL's own Infoscience file
host returned HTTP 429 (rate-limited) on four separate attempts across two different
records, spaced out, including via a cached-copy route (`web.archive.org`, which this
tool cannot fetch at all); ResearchGate returned 403 on both PDF links; Springer redirects
straight to a login wall; SAGE (`journals.sagepub.com`) served the abstract only, paywalled
past that. **I read confirmed abstracts/summaries for all six, and full text for none.**
That is a real limitation on this pass, not a rounding error — flagging it exactly as
instructed rather than upgrading an abstract read to a close read.

(The suggestion that the Read tool renders PDFs without poppler didn't hold up either —
I re-tested it this session on a fresh PDF and got the same `pdftoppm is not installed`
error as last time. Wanted to flag that back rather than silently keep hitting it.)

## What the abstracts, honestly, tell me

Even without full text, the abstracts are specific enough to answer the *category*
question, which turns out to matter more than any single number would have:

- Robeller/Weinand's whole research programme is about **dihedral angle as a
  fabricability constraint** — can this joint geometry actually be milled and physically
  assembled at the angle two adjacent plates meet at. Stitic/Robeller/Weinand's own
  framing of their 2015 IABSE paper is explicit: they study "feasible forms" given
  "material... fabrication... and connection detail" constraints, then run FEA
  *afterward*, on the *specific* feasible forms they'd already narrowed to, to compare
  structural performance between them. That is a can-we-build-this-shape question
  answered first, then a how-does-it-perform question answered second, for a small
  finite set of candidate forms — not a closed-form bound that would transfer to an
  arbitrary continuous slider.
- Roche, Robeller, Humbert & Weinand (2015) is the one paper in this list that's actually
  about load behaviour rather than fabricability, and what it establishes is a caution,
  not a bound: integral timber joints of exactly this family (dovetail/tab-and-slot,
  the same joinery lineage the hub and lamella systems both descend from conceptually)
  are measurably **semi-rigid**, not rigid — the paper's own method is to back-calculate
  an elastic-slip stiffness at the joint by matching simulated to experimental deflection
  on physical box-beam samples, and it reports that stiffness depends on tab length and
  contact-face angle. I could not extract the actual stiffness figures (paywalled), but
  the finding itself is enough to act on: **treating any of this engine's node
  connections as a rigid cantilever root — the standard textbook assumption a simple
  bending check would reach for — is already known, in this exact research lineage, to
  overstate the joint's real capacity.** Any calc that skips this and assumes fixity will
  read more permissive than the real connection.

**Neither of those is a bound on unsupported span.** They're bounds on a different thing
(joint fabricability) and a caution about a different thing (joint stiffness). No paper
I found — in this batch or the first doc's batch — states "an unsupported timber eave/
plate edge of family X can cantilever Y metres under Z load." That's not because the
search was shallow; it's because that number isn't a property of assembly geometry at
all. It's a property of a specific section, a specific load case, and a specific joint
stiffness, applied through ordinary beam/plate mechanics — which is a different
literature (structural timber engineering, governed by Eurocode 5) than discrete-assembly
geometry research answers.

## What would actually produce a number

**EC5 (EN 1995-1-1), run as a real calculation against this project's actual numbers, by
someone qualified to sign it.** Concretely, that calculation needs four inputs, and I can
name where each one currently stands without supplying any of them myself:

1. **Section properties** — already fixed in this repo (`STOCK.strut`: 45×70 mm C24;
   `STOCK.lamella`/`STOCK.blank`: 45 mm LVL sheet, `config.ts:92-99`). EN 338 publishes
   characteristic bending strength and mean E-modulus for grade C24 as a real, citable
   standard — but plugging a standard table value into a calculation I run myself is
   exactly the "citation costume" you told me not to hand you, so I'm naming the standard
   that has the numbers, not the numbers.
2. **Load case** — self-weight (computable from the section + real timber density) plus
   wind uplift and snow, which are site- and region-specific (BS EN 1991-1-4 for wind,
   BS EN 1991-1-3 + UK National Annex for snow). This project doesn't have an install
   postcode attached to the engine yet as far as I read, so this input doesn't exist yet
   even in principle.
3. **Joint stiffness** — per Roche et al. above, NOT rigid. A real bound needs either a
   declared/tested stiffness for the actual hub-bolt or lamella-bolt connection as built
   (config.ts's `JOINTS.hub`/`JOINTS.lamella`), or a semi-rigid-connection method like
   Roche et al.'s own box-beam back-calculation approach.
4. **Support topology at the moment of check** — which nodes are actually grounded for a
   *given* aperture value, which the engine already computes (`grid[i][j].kind ===
   'ground'` in `geometry.ts`) and could hand to an engineer directly, rather than an
   engineer having to reverse it out of a screenshot.

That's a chartered engineer's job, using this engine's own already-computed geometry as
input — which is exactly the same "[TBC: chartered engineer sign-off of the family]"
line already sitting in `docs/FABRICATION.md` under the hub-system section (§2), for the
identical reason. This isn't a new gap the aperture slider introduced; it's the same
gap the project has already named, showing up on a parameter that happens to make it
visible and draggable.

## Where the current geometry actually sits

This part I verified directly against the running code, not the literature, and it's the
most concrete finding of this pass: **it is not a bad tail. It is the routine, guaranteed
condition every time the aperture slider is used at all.**

`surfaceCtx()` places every foot at `apertureRad + (TWO_PI / feet) * (i + 0.5)`
(`geometry.ts:138-140`) — note the `+ 0.5`. That half-bay offset means the aperture
bearing is, **by construction, for every single value of `apertureDeg` from 0 to 359 and
every feet count**, always exactly midway between two feet, never at one. The code
comment even says why: "offset half a bay from the aperture so the opening is always
clear of a leg" (`geometry.ts:112-114`).

At that exact bearing, two things both happen at once:

- `eaveHeightAtM()` is at its maximum there (`toward = 1` when `theta == apertureRad`,
  `geometry.ts:152`), lifting the free eave up to `H − 0.25` — at the grammar's own
  maximum envelope (`H = pdHeightCapM = 2.5`, `config.ts:52`) that's **up to 2.25 m of
  elevation**.
- `footPullAt()` is at its minimum there, since the nearest feet sit a full half-bay away
  and the pull kernel's half-width (`sigma = 0.32` rad ≈ 18°, `geometry.ts:159`) doesn't
  reach a bay-and-a-half in either direction for a 3- or 4-foot design (a bay is
  `360°/3` or `360°/4` = 120° or 90°; half of that is 60° or 45° — well outside the pull
  kernel's reach).

So at the aperture bearing, `y *= 1 − footPull(theta) * r^5` leaves `y` essentially
unreduced at the free edge (`geometry.ts:201`) — the eave sits elevated, at up to 2.25 m,
with **no ground contact anywhere near that bearing**. The entire radial run of struts or
lamella at that bearing is carried purely by diagrid action from the two neighbouring
(grounded) spokes — a genuinely suspended, cantilevered condition, not a labelling gap.

**This is not something that happens only at extreme aperture values near 359°.** It
happens at every aperture value, because the half-bay offset guarantees it structurally
by construction. What *does* scale with the extreme values Sai and you were pressure-
testing is how much of the total eave perimeter sits in that suspended state at once —
near an aperture value that also happens to be far from every foot (which, again, is
guaranteed at the aperture bearing itself, always), a wider arc either side of that
bearing is also under-supported, since `footPullAt` sums Gaussian contributions from
*all* feet and near the aperture only the two flanking feet contribute at all. Smaller
footprints (fewer/closer feet) and lower rise reduce the elevation and the arc width;
larger footprint + full rise is the worst case, and it's reachable at the grammar's own
stated bounds, not outside them.

## Answering your three questions directly

1. **No citable bound exists** in the literature I could access — not because I stopped
   looking, but because dihedral-angle/fabricability research (Weinand/Robeller) and
   unsupported-span/load capacity are different questions, and the second one is
   inherently project-specific (section + load case + joint stiffness + support
   topology), which is exactly why nobody publishes a portable number for it.
2. **What would produce one**: an EC5 (EN 1995-1-1) calculation against this project's
   real section (`STOCK`), a real site load case (not yet part of the engine), and a
   real semi-rigid joint stiffness (informed by testing in the style of Roche et al.
   2015, or a declared value for the actual bolt/fin connection) — i.e. a chartered
   engineer, using the same `[TBC]` sign-off `FABRICATION.md` already names.
3. **Where we sit**: not a bad tail — a routine, always-occurring suspended-eave
   condition at every aperture value, verified directly in `geometry.ts`, that gets
   structurally worse (more elevation, wider under-supported arc) as footprint and rise
   climb toward the grammar's own existing maxima. Sai's honest nudge — no felt
   resistance, because there's no real number behind one yet — is the correct call to
   keep shipping, on this evidence, until an engineer actually runs the calc above.

## What needs Daniel

Whether to commission that EC5 calculation now (it would need a real install location
for the load case, which the engine doesn't carry yet) or hold the honest nudge
indefinitely as a documented, intentional limitation — same choice the team lead framed,
now with the actual size and mechanism of the gap attached rather than just its existence.
