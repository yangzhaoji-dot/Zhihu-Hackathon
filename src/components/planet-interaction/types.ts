/**
 * Coarse interaction state exposed to the universe shell.
 *
 * Hover and selection stay private to the planet interaction feature. The
 * shell only needs semantic states that can drive cross-feature feedback.
 */
export type InteractionState =
  | "idle"
  | "gravity"
  | "collision"
  | "analysis"
  | "fusion";

export interface PlanetInteractionEvent {
  state: InteractionState;
  opinionIds: readonly string[];
}

export interface PlanetCollision {
  key: string;
  aId: string;
  bId: string;
  center: { x: number; y: number };
}

export interface FusionPresentation {
  candidateId: string;
  parentIds: readonly [string, string];
  origin: { x: number; y: number };
}

export interface PlanetMotion {
  id: string;
  x: number;
  y: number;
  targetId: string | null;
  collisionReady: boolean;
}

export interface PlanetBody {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface PlanetProximity {
  targetId: string | null;
  collisionReady: boolean;
  state: "idle" | "gravity" | "collision";
}
