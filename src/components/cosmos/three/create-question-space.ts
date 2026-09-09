import type { QuestionNetwork } from "@/lib/opinion/types";
import type { QuestionSpaceCallbacks } from "./question-space-3d";
import { detectTier, hasWebGL, profileFor } from "./webgl-support";

export interface QuestionEngineHandle {
  destroy: () => void;
}

/**
 * Mount the 3D question galaxy into `mount`. Returns null when WebGL is
 * unavailable so the caller can render the declarative 2D <QuestionLayer/>
 * instead. Three.js is dynamically imported to stay out of SSR + initial bundle.
 */
export async function createQuestionSpace(
  mount: HTMLElement,
  network: QuestionNetwork,
  cb: QuestionSpaceCallbacks,
): Promise<QuestionEngineHandle | null> {
  if (!hasWebGL()) return null;
  try {
    const { QuestionSpace3D } = await import("./question-space-3d");
    const profile = profileFor(detectTier());
    const space = new QuestionSpace3D(mount, network, cb, profile);
    return { destroy: () => space.destroy() };
  } catch (err) {
    console.warn("[cosmos] 3D question space unavailable, falling back to 2D", err);
    return null;
  }
}
