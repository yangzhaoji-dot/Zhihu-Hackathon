import { type NextRequest, NextResponse } from "next/server";
import { matchExplorers } from "@/lib/opinion/matching";
import { resolveViewerId } from "@/lib/opinion/viewer";

// GET /api/opinion/match — match the viewer against the explorer pool based on
// their marked stance profile. Returns kindred spirits (resonate) and worthy
// opponents (spar). Falls back to deterministic scoring + templated blurbs when
// App AI is unavailable.
export async function GET(request: NextRequest) {
  const viewerId = resolveViewerId(request);
  const result = await matchExplorers(viewerId);
  return NextResponse.json({ ok: true, result });
}
