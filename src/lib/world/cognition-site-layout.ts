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

function hash01(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  // Avalanche the FNV state so similar ids such as o_route_a / o_route_b do
  // not collapse to nearly identical angles after world-grid rounding.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 0xffffffff;
}

function zoneAnchors(zone: Zone): GridPos[] {
  const { x, y, w, h } = zone.rect;
  const center = { x: x + w / 2, y: y + h / 2 };
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

function normalized(from: GridPos, to: GridPos): GridPos {
  const x = to.x - from.x;
  const y = to.y - from.y;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function routeTargets(
  config: WorldConfig,
  spawn: GridPos,
  count: number,
  routeSeed: string,
): GridPos[] {
  const rocket = config.pois.find((poi) => poi.kind === "rocket")?.pos;
  const seed = hash01(routeSeed);
  const baseDirection = rocket
    ? normalized(spawn, rocket)
    : { x: Math.cos(seed * Math.PI * 2), y: Math.sin(seed * Math.PI * 2) };

  const jitter = (seed - 0.5) * 1.45;
  const cos = Math.cos(jitter);
  const sin = Math.sin(jitter);
  const direction = {
    x: baseDirection.x * cos - baseDirection.y * sin,
    y: baseDirection.x * sin + baseDirection.y * cos,
  };
  const side = { x: -direction.y, y: direction.x };
  const rocketDistance = rocket ? distance(spawn, rocket) : Math.min(config.size.w, config.size.h) * 0.58;
  const maxDepth = Math.min(Math.max(9, count * 2.6 + 3.5), rocketDistance * 0.72);
  const firstDepth = Math.min(4.4, maxDepth * 0.5);

  return Array.from({ length: count }, (_, index) => {
    const progress = count <= 1 ? 0 : index / (count - 1);
    const depth = firstDepth + (maxDepth - firstDepth) * progress;
    const wave = Math.sin(seed * Math.PI * 2 + index * 1.43) * (1.6 + progress * 0.85);
    return clampToWorld(config, {
      x: spawn.x + direction.x * depth + side.x * wave,
      y: spawn.y + direction.y * depth + side.y * wave,
    });
  });
}

function candidatesFor(
  config: WorldConfig,
  spawn: GridPos,
  fragment: CognitionFragmentSpec,
  index: number,
  routeTarget: GridPos,
) {
  const preferred = TERRAIN_PREFERENCE[fragment.role];
  const semantic = preferred.flatMap((terrain) =>
    config.zones
      .filter((zone) => zone.terrain === terrain)
      .flatMap(zoneAnchors),
  );

  const offset = fallbackOffset(index);
  const fallback = [
    routeTarget,
    { x: routeTarget.x + offset.x * 0.32, y: routeTarget.y + offset.y * 0.32 },
    { x: spawn.x + offset.x, y: spawn.y + offset.y },
  ];

  return [...semantic, ...fallback]
    .map((candidate) => clampToWorld(config, candidate))
    .map((candidate) => nearestWalkable(config, {}, candidate) ?? candidate);
}

function siteScore(
  candidate: GridPos,
  routeTarget: GridPos,
  previous: GridPos | null,
  placed: readonly GridPos[],
  semanticRank: number,
) {
  const routePenalty = distance(candidate, routeTarget) * 0.78;
  const stepPenalty = previous
    ? Math.abs(distance(candidate, previous) - 4.7) * 0.34
    : 0;
  const nearestOther = placed.length
    ? Math.min(...placed.map((position) => distance(candidate, position)))
    : 99;
  const crowdPenalty = nearestOther < 3.1 ? (3.1 - nearestOther) * 9 : 0;
  const duplicatePenalty = nearestOther < 1.15 ? 45 : 0;
  return semanticRank * 0.055 + routePenalty + stepPenalty + crowdPenalty + duplicatePenalty;
}

/**
 * Place cognition carriers as a progressive, viewpoint-specific journey.
 *
 * The underlying question canvas is reusable, but each opinion receives a
 * stable route seed. Early cognition sits close to landing; later fragments
 * pull the seeker deeper into the scene. Semantic terrain still matters, so
 * this is not a decorative spline painted over arbitrary objects.
 */
export function layoutCognitionSites(
  config: WorldConfig,
  spawn: GridPos,
  plan: readonly CognitionFragmentSpec[],
  routeSeed = plan[0]?.opinionId || config.questionId,
): CognitionSiteLayout[] {
  const placed: GridPos[] = [];
  const targets = routeTargets(config, spawn, plan.length, routeSeed);

  return plan.map((fragment, index) => {
    const routeTarget = targets[index] ?? spawn;
    const previous = placed.at(-1) ?? null;
    const candidates = candidatesFor(config, spawn, fragment, index, routeTarget);
    const ranked = candidates
      .map((candidate, candidateIndex) => ({
        candidate,
        score: siteScore(candidate, routeTarget, previous, placed, candidateIndex),
      }))
      .sort((left, right) => left.score - right.score);

    const fallback = nearestWalkable(config, {}, routeTarget) ?? routeTarget;
    const pos = ranked[0]?.candidate ?? fallback;
    placed.push(pos);

    return {
      id: `carrier_${fragment.id}_${index}`,
      fragment,
      pos,
    };
  });
}
