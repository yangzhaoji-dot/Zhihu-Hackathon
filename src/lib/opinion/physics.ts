import type { Opinion } from "@/lib/opinion/types";

// Node diameter in px, driven by support magnitude (visual weight).
export function nodeSize(support: number): number {
  return 58 + support * 0.48;
}

// A node's "mass" for drag inertia — higher support drags "heavier".
export function nodeWeight(support: number): number {
  return 1 + support / 140;
}

// Particle count for a collision, scaled by combined support.
export function sparkCount(a: number, b: number): number {
  return Math.round(22 + (a + b) / 8);
}

export interface Vec {
  x: number;
  y: number;
}

// Elastic-ish momentum bounce between two colliding nodes. Returns the push
// offsets to apply to each so neither disappears and both stay interactive.
export function bounce(a: Vec, b: Vec): { a: Vec; b: Vec } {
  const nx = a.x - b.x || 1;
  const ny = a.y - b.y || 1;
  const len = Math.hypot(nx, ny);
  return {
    a: { x: (nx / len) * 38, y: (ny / len) * 24 },
    b: { x: (-nx / len) * 38, y: (-ny / len) * 24 },
  };
}

// Collision test: overlap within ~43% of the summed radii.
export function isColliding(a: Opinion & Vec, b: Opinion & Vec): boolean {
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  return d < (nodeSize(a.support) + nodeSize(b.support)) * 0.43;
}
