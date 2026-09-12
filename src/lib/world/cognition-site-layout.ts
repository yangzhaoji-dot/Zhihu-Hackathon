import type { WorldConfig } from "@/lib/opinion/types";
import type { CognitionFragmentSpec } from "@/lib/world/cognition-fragment-plan";
import { nearestWalkable } from "@/lib/world/spawn";
import type { GridPos } from "@/lib/world/geometry";

export interface CognitionSiteLayout {
  id: string;
  fragment: CognitionFragmentSpec;
  pos: GridPos;
}

const OFFSETS: readonly GridPos[] = [
  { x: 3, y: 0 },
  { x: -3, y: 3 },
  { x: 5, y: 2 },
  { x: 3, y: 5 },
  { x: -5, y: 5 },
  { x: -6, y: -2 },
  { x: 6, y: -3 },
];

function spiralOffset(index: number): GridPos {
  if (index < OFFSETS.length) return OFFSETS[index];
  const ring = 6 + Math.floor((index - OFFSETS.length) / 4) * 2;
  const angle = (index * 2.399963229728653) % (Math.PI * 2);
  return { x: Math.cos(angle) * ring, y: Math.sin(angle) * ring };
}

export function layoutCognitionSites(
  config: WorldConfig,
  spawn: GridPos,
  plan: readonly CognitionFragmentSpec[],
): CognitionSiteLayout[] {
  return plan.map((fragment, index) => {
    const offset = spiralOffset(index);
    const desired = { x: spawn.x + offset.x, y: spawn.y + offset.y };
    const pos = nearestWalkable(config, {}, desired) ?? desired;
    return {
      id: `carrier_${fragment.id}_${index}`,
      fragment,
      pos,
    };
  });
}
