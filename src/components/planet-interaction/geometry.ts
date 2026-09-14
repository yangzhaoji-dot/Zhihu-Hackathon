import type { PlanetBody, PlanetProximity } from "./types";

const GRAVITY_PADDING = 55;
const COLLISION_PADDING = 16;

/** Resolve the nearest eligible planet and its semantic interaction state. */
export function resolvePlanetProximity(
  source: PlanetBody,
  planets: readonly PlanetBody[],
  position: Pick<PlanetBody, "x" | "y">,
): PlanetProximity {
  let nearest: PlanetBody | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of planets) {
    if (candidate.id === source.id) continue;
    const distance = Math.hypot(
      position.x - candidate.x,
      position.y - candidate.y,
    );
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  if (!nearest) {
    return { targetId: null, collisionReady: false, state: "idle" };
  }

  const bodyDistance = source.radius + nearest.radius;
  if (nearestDistance > bodyDistance + GRAVITY_PADDING) {
    return { targetId: null, collisionReady: false, state: "idle" };
  }

  const collisionReady = nearestDistance <= bodyDistance + COLLISION_PADDING;
  return {
    targetId: nearest.id,
    collisionReady,
    state: collisionReady ? "collision" : "gravity",
  };
}
