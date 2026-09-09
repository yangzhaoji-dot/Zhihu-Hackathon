import "server-only";

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";

/**
 * Resolve a stable viewer id for personalization (stance marking, profile).
 *
 * OpinionSpace is explorable without signing in, so stance data must still work
 * for anonymous viewers. When a real Eazo session is present we use the
 * authenticated user id; otherwise we fall back to a per-device anonymous id
 * that the client sends in `x-viewer-id`. This keeps the exploration loop
 * frictionless while remaining ready to key data by a real account.
 */
export function resolveViewerId(request: NextRequest): string {
  const auth = requireAuth(request);
  if (auth.ok) return auth.user.id;
  const anon = request.headers.get("x-viewer-id");
  if (anon && /^[A-Za-z0-9_-]{6,64}$/.test(anon)) return `anon:${anon}`;
  return "anon:guest";
}
