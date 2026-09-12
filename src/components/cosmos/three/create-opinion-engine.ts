import { CosmosEngine } from "../engine";
import type { OpinionEngine, OpinionEngineCallbacks, OpinionNodeLike } from "./engine-contract";
import { detectTier, hasWebGL, profileFor } from "./webgl-support";

export interface EngineHandle {
  engine: OpinionEngine;
  is3D: boolean;
}

function openStation(node: OpinionNodeLike) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("station:open", {
    detail: {
      id: node.id,
      title: node.title,
      summary: node.summary,
      reason: node.reason,
      conditions: node.conditions ?? [],
      derivedFrom: node.derivedFrom ?? [],
      derivedSource: node.derivedSource,
    },
  }));
}

function stationAwareCallbacks(cb: OpinionEngineCallbacks): OpinionEngineCallbacks {
  const isStation = (node: OpinionNodeLike) => node.nodeType === "station";
  return {
    onTap: (node) => {
      if (isStation(node)) {
        openStation(node);
        return;
      }
      cb.onTap(node);
    },
    onLongPress: (node) => {
      if (isStation(node)) {
        openStation(node);
        return;
      }
      cb.onLongPress(node);
    },
    onCollision: (left, right, mx, my) => {
      const station = isStation(left) ? left : isStation(right) ? right : null;
      if (station) {
        openStation(station);
        return;
      }
      cb.onCollision(left, right, mx, my);
    },
  };
}

/**
 * Build the best available opinion-space engine for this device:
 *   • WebGL present → narrative semantic planets + discoverable weak signals;
 *   • otherwise      → the existing 2D DOM CosmosEngine.
 *
 * AI stations are intercepted at this boundary so they can never leak into
 * the human-opinion planet launch callbacks, including in the 2D fallback.
 */
export async function createOpinionEngine(
  mount: HTMLElement,
  root: HTMLElement,
  cb: OpinionEngineCallbacks,
): Promise<EngineHandle> {
  const callbacks = stationAwareCallbacks(cb);
  if (hasWebGL()) {
    try {
      const { NarrativeCosmosEngine3D } = await import("./narrative-cosmos-engine-3d");
      const profile = profileFor(detectTier());
      const engine = new NarrativeCosmosEngine3D(mount, root, callbacks, profile) as unknown as OpinionEngine;
      return { engine, is3D: true };
    } catch (err) {
      console.warn("[cosmos] narrative 3D engine unavailable, falling back to 2D", err);
    }
  }
  const engine = new CosmosEngine(mount, root, callbacks) as unknown as OpinionEngine;
  return { engine, is3D: false };
}
