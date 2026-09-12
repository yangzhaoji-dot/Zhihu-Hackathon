import type { WorldConfig, Zone } from "@/lib/opinion/types";
import type { CognitionFragmentSpec } from "@/lib/world/cognition-fragment-plan";
import { nearestWalkable } from "@/lib/world/spawn";
import type { GridPos } from "@/lib/world/geometry";

export interface CognitionSiteLayout {
  id: string;
  fragment: CognitionFragmentSpec;
  pos: GridPos;
}

const FALLBACK_OFFSETS: readonly GridPos[] = [
  { x: 4, y: 0 },
  { x: -4, y: 3 },
  { x: 6, y: 2 },
  { x: 3, y: 6 },
  { x: -6, y: 5 },
  { x: -7, y: -2 },
  { x: 7, y: -3 },
];

const TERRAIN_PREFERENCE: Record<CognitionFragmentSpec["role"], readonly Zone["terrain"][]> = {
  claim: ["monument", "station", "plaza", "road"],
  reason: ["road", "station", "bridge", "plaza"],
  condition: ["road", "bridge", "station", "plaza"],
  evidence: ["ruin", "monument", "station", "plaza"],
  boundary: ["ruin", "fog", "bridge", "road"],
};

function zoneAnchors(zone: Zone): GridPos[] {
  const { x, y, w, h } = zone.rect;
  const center = { x: x + w / 2, y: y + h / 2 };
  // Boundary/fog zones are often non-walkable in the middle. Supplying edge
  // anchors lets nearestWalkable keep the carrier visually associated with the
  // semantic region without dropping the player inside blocked terrain.
  return [
    center,
    { x: x + 0.75, y: center.y },
    { x: x + w - 0.75, y: center.y },
    { x: center.x, y: y + 0.75 },
    { x: center.x, y: y + h - 0.75 },
  ];
}

function fallbackOffset(index: number): GridPos {
  if (index < FALLBACK_OFFSETS.length) return FALLBACK_OFFSETS[index];
  const ring = 7 + Math.floor((index - FALLBACK_OFFSETS.length) / 4) * 2;
  const angle = (index * 2.399963229728653) % (Math.PI * 2);
  return { x: Math.cos(angle) * ring, y: Math.sin(angle) * ring };
}

function distance(a: GridPos, b: GridPos) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clampToWorld(config: WorldConfig, pos: GridPos): GridPos {
  return {
    x: Math.max(0.5, Math.min(config.size.w - 0.5, pos.x)),
    y: Math.max(0.5, Math.min(config.size.h - 0.5, pos.y)),
  };
}

function candidatesFor(
  config: WorldConfig,
  spawn: GridPos,
  fragment: CognitionFragmentSpec,
  index: number,
) {
  const preferred = TERRAIN_PREFERENCE[fragment.role];
  const semantic = preferred.flatMap((terrain) =>
    config.zones
      .filter((zone) => zone.terrain === terrain)
      .flatMap(zoneAnchors),
  );

  const offset = fallbackOffset(index);
  const fallback = [
    { x: spawn.x + offset.x, y: spawn.y + offset.y },
    { x: spawn.x + offset.x * 1.25, y: spawn.y + offset.y * 1.25 },
    { x: spawn.x - offset.y * 0.7, y: spawn.y + offset.x * 0.7 },
  ];

  return [...semantic, ...fallback]
    .map((candidate) => clampToWorld(config, candidate))
    .map((candidate) => nearestWalkable(config, {}, candidate) ?? candidate);
}

function siteScore(
  candidate: GridPos,
  spawn: GridPos,
  placed: readonly GridPos[],
  semanticRank: number,
) {
  const fromSpawn = distance(candidate, spawn);
  // A carrier should require a short walk, but it should not feel like a remote
  // loading screen. The ideal distance is roughly 5–9 grid cells.
  const travelPenalty = Math.abs(fromSpawn - 7) * 0.55;
  const nearestOther = placed.length
    ? Math.min(...placed.map((position) => distance(candidate, position)))
    : 99;
  const crowdPenalty = nearestOther < 3.2 ? (3.2 - nearestOther) * 8 : 0;
  const duplicatePenalty = nearestOther < 1.2 ? 40 : 0;
  return semanticRank * 0.08 + travelPenalty + crowdPenalty + duplicatePenalty;
}

/**
 * Place cognition carriers as scene destinations rather than a fixed ring
 * around the spawn. Semantic regions supply the first candidates; walkability
 * and minimum spacing then decide the actual physical positions.
 */
export function layoutCognitionSites(
  config: WorldConfig,
  spawn: GridPos,
  plan: readonly CognitionFragmentSpec[],
): CognitionSiteLayout[] {
  const placed: GridPos[] = [];

  return plan.map((fragment, index) => {
    const candidates = candidatesFor(config, spawn, fragment, index);
    const ranked = candidates
      .map((candidate, candidateIndex) => ({
        candidate,
        score: siteScore(candidate, spawn, placed, candidateIndex),
      }))
      .sort((left, right) => left.score - right.score);

    const offset = fallbackOffset(index);
    const fallback = nearestWalkable(config, {}, {
      x: spawn.x + offset.x,
      y: spawn.y + offset.y,
    }) ?? clampToWorld(config, { x: spawn.x + offset.x, y: spawn.y + offset.y });
    const pos = ranked[0]?.candidate ?? fallback;
    placed.push(pos);

    return {
      id: `carrier_${fragment.id}_${index}`,
      fragment,
      pos,
    };
  });
}
