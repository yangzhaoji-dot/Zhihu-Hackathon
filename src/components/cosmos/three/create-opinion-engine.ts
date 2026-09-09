import { CosmosEngine } from "../engine";
import type { OpinionEngine, OpinionEngineCallbacks } from "./engine-contract";
import { detectTier, hasWebGL, profileFor } from "./webgl-support";

export interface EngineHandle {
  engine: OpinionEngine;
  is3D: boolean;
}

/**
 * Build the best available opinion-space engine for this device:
 *   • WebGL present → the 3D CosmosEngine3D (dynamically imported so Three.js
 *     stays out of the initial bundle and never runs during SSR);
 *   • otherwise      → the existing 2D DOM CosmosEngine, unchanged.
 *
 * Both satisfy OpinionEngine, so the caller is agnostic to which it holds.
 */
export async function createOpinionEngine(
  mount: HTMLElement,
  root: HTMLElement,
  cb: OpinionEngineCallbacks,
): Promise<EngineHandle> {
  if (hasWebGL()) {
    try {
      const { CosmosEngine3D } = await import("./cosmos-engine-3d");
      const profile = profileFor(detectTier());
      const engine = new CosmosEngine3D(mount, root, cb, profile) as unknown as OpinionEngine;
      return { engine, is3D: true };
    } catch (err) {
      // WebGL context creation can still fail (driver, blacklist) — fall back.
      console.warn("[cosmos] 3D engine unavailable, falling back to 2D", err);
    }
  }
  const engine = new CosmosEngine(mount, root, cb) as unknown as OpinionEngine;
  return { engine, is3D: false };
}
