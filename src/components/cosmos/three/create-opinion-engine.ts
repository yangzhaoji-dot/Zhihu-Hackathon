import { CosmosEngine } from "../engine";
import type { OpinionEngine, OpinionEngineCallbacks } from "./engine-contract";
import { detectTier, hasWebGL, profileFor } from "./webgl-support";

export interface EngineHandle {
  engine: OpinionEngine;
  is3D: boolean;
}

/**
 * Build the best available opinion-space engine for this device:
 *   • WebGL present → semantic 3D planets whose space appearance previews the
 *     scene grammar users will encounter after landing;
 *   • otherwise      → the existing 2D DOM CosmosEngine.
 */
export async function createOpinionEngine(
  mount: HTMLElement,
  root: HTMLElement,
  cb: OpinionEngineCallbacks,
): Promise<EngineHandle> {
  if (hasWebGL()) {
    try {
      const { ThemedCosmosEngine3D } = await import("./themed-cosmos-engine-3d");
      const profile = profileFor(detectTier());
      const engine = new ThemedCosmosEngine3D(mount, root, cb, profile) as unknown as OpinionEngine;
      return { engine, is3D: true };
    } catch (err) {
      console.warn("[cosmos] themed 3D engine unavailable, falling back to 2D", err);
    }
  }
  const engine = new CosmosEngine(mount, root, cb) as unknown as OpinionEngine;
  return { engine, is3D: false };
}
