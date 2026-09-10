import type { Opinion, Relation, Stance } from "@/lib/opinion/types";

/**
 * The shared contract both the 2D DOM engine (CosmosEngine) and the 3D WebGL
 * engine (CosmosEngine3D) satisfy. cosmos-app talks to this interface so it can
 * hold either implementation — the 3D engine when WebGL is available, the 2D
 * engine as a graceful fallback — without knowing which one it has.
 *
 * Callbacks receive a node that always carries at least an Opinion's fields
 * (both EngineNode and Node3D extend Opinion), so `.id` / `.title` are safe.
 */
export interface OpinionNodeLike extends Opinion {
  cx: number;
  cy: number;
  stance?: Stance;
}

export interface OpinionEngineCallbacks {
  onTap: (node: OpinionNodeLike) => void;
  onLongPress: (node: OpinionNodeLike) => void;
  onCollision: (a: OpinionNodeLike, b: OpinionNodeLike, mx: number, my: number) => void;
}

export interface OpinionEngine {
  setData(opinions: Opinion[], relations: Relation[], stances: Record<string, Stance>): void;
  setStance(id: string, stance: Stance): void;
  zoom(factor: number): void;
  locate(id: string): void;
  resetFocus(): void;
  fuse(aId: string, bId: string, candidate: Opinion): Promise<void>;
  layout(): void;
  getNode(id: string): OpinionNodeLike | null;
  destroy(): void;
}
