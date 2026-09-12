import { CosmosEngine } from "../engine";
import type { OpinionEngine, OpinionEngineCallbacks } from "./engine-contract";
import { detectTier, hasWebGL, profileFor } from "./webgl-support";

export interface EngineHandle {
  engine: OpinionEngine;
  is3D: boolean;
}

/**
 * Build the best available opinion-space engine for this device:
 *   • WebGL present → two-axis semantic planets + discoverable buried-opinion signals;
 *   • otherwise      → the existing 2D DOM CosmosEngine.
 */
export async function createOpinionEngine(
  mount: HTMLElement,
  root: HTMLElement,
  cb: OpinionEngineCallbacks,
): Promise<EngineHandle> {
  if (hasWebGL()) {
    try {
      const { DiscoverableCosmosEngine3D } = await import("./discoverable-cosmos-engine-3d");
      const profile = profileFor(detectTier());
      const engine = new DiscoverableCosmosEngine3D(mount, root, cb, profile) as unknown as OpinionEngine;
      return { engine, is3D: true };
    } catch (err) {
      console.warn("[cosmos] discoverable 3D engine unavailable, falling back to 2D", err);
    }
  }
  const engine = new CosmosEngine(mount, root, cb) as unknown as OpinionEngine;
  return { engine, is3D: false };
}
