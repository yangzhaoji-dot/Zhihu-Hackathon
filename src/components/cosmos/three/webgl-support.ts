/**
 * WebGL capability detection + performance tiering. Drives the "middle-ground"
 * strategy: detect the device class up front to pick particle budgets and
 * whether post-processing bloom is affordable, then downgrade further at
 * runtime if frames drop. When WebGL is unavailable the caller falls back to
 * the existing 2D DOM engine.
 */

export type PerfTier = "high" | "mid" | "low";

export interface PerfProfile {
  tier: PerfTier;
  /** Ambient starfield point count. */
  starCount: number;
  /** Max collision spark particles per burst. */
  sparkBudget: number;
  /** Whether UnrealBloom post-processing is enabled. */
  bloom: boolean;
  /** Device pixel ratio cap for the renderer. */
  dpr: number;
  /** Whether to render the soft nebula backdrop sprites. */
  nebula: boolean;
}

/** True when a WebGL2 (or WebGL) context can actually be created. */
export function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

/** Coarse device classification from screen size, cores, memory, and touch. */
export function detectTier(): PerfTier {
  if (typeof window === "undefined") return "mid";
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 520;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const dpr = window.devicePixelRatio || 1;

  // Low: weak mobile — few cores / little memory, or a small coarse-pointer screen.
  if (cores <= 4 || mem <= 3 || (narrow && coarse)) return "low";
  // High: desktop-class — many cores, ample memory, not a phone-sized screen.
  if (cores >= 8 && mem >= 8 && !coarse && dpr <= 2) return "high";
  return "mid";
}

export function profileFor(tier: PerfTier): PerfProfile {
  switch (tier) {
    case "high":
      return { tier, starCount: 2600, sparkBudget: 60, bloom: true, dpr: 2, nebula: true };
    case "low":
      return { tier, starCount: 700, sparkBudget: 18, bloom: false, dpr: 1, nebula: false };
    default:
      return { tier, starCount: 1500, sparkBudget: 34, bloom: true, dpr: 1.5, nebula: true };
  }
}

/** Respect the OS "reduce motion" accessibility preference. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * Rolling FPS sampler. Feed it timestamps; when the average over a window drops
 * below the floor it signals a one-way downgrade so heavy effects can be shed.
 */
export class FpsGovernor {
  private frames: number[] = [];
  private last = 0;
  private downgraded = false;
  private readonly floor: number;
  private readonly window: number;

  constructor(floor = 32, window = 45) {
    this.floor = floor;
    this.window = window;
  }

  /** Returns true exactly once, when a sustained low-FPS spell is detected. */
  sample(now: number): boolean {
    if (this.downgraded) return false;
    if (this.last > 0) {
      const dt = now - this.last;
      if (dt > 0) {
        this.frames.push(1000 / dt);
        if (this.frames.length > this.window) this.frames.shift();
      }
    }
    this.last = now;
    if (this.frames.length >= this.window) {
      const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
      if (avg < this.floor) {
        this.downgraded = true;
        return true;
      }
    }
    return false;
  }
}
