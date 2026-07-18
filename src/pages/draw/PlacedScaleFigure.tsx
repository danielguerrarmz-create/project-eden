/**
 * PlacedScaleFigure.tsx — decides WHERE the scale figure stands.
 *
 * Split from `ScaleFigure` (which only knows how to be a person) because this
 * half has to be inside the Canvas to read the live camera, and the rule it
 * runs is worth testing on its own (`entryBearing.ts`).
 *
 * The bearing is solved ONCE, when the figure mounts, and then held. It is
 * deliberately not re-solved as the turntable turns: a figure that slides
 * around the building to stay in front of the camera is a horror, and would
 * be the most obviously fake thing in the shot. It picks its spot at the
 * moment the kit resolves and then it stands there like a person would.
 */
import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { useDesign } from '../../state/store';
import { entryBearingDeg, figurePositionM } from './entryBearing';
import { ScaleFigure } from './ScaleFigure';
import { DimensionCallout } from './DimensionCallout';

const DEG = Math.PI / 180;

export function PlacedScaleFigure() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as { target: { x: number; z: number } } | null;
  const geo = useDesign((s) => s.outputs.geometry);

  const placed = useMemo(() => {
    // Camera azimuth, projected to plan — the same measurement CinematicCamera
    // makes to keep your viewing direction through a framing move.
    const tx = controls?.target.x ?? 0;
    const tz = controls?.target.z ?? 0;
    const azDeg = Math.atan2(camera.position.x - tx, camera.position.z - tz) / DEG;

    const bearing = entryBearingDeg(geo.footBearingsDeg, azDeg);
    if (bearing === null) return null; // nothing to stand beside: no figure at all

    const { x, z } = figurePositionM(bearing, geo.planA, geo.planB);
    // Orientation is not decided here: the figure billboards to the camera.
    return [x, 0, z] as [number, number, number];
    // Solved at mount and held: see the note above about sliding figures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.footBearingsDeg, geo.planA, geo.planB]);

  if (!placed) return null;
  return (
    <>
      <ScaleFigure position={placed} />
      {/* The dimension that turns the figure into a measuring stick (Part E).
          Shares the figure's solved position so the two never drift. */}
      <DimensionCallout figurePos={placed} />
    </>
  );
}
