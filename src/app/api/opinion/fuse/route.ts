import { type NextRequest, NextResponse } from "next/server";
import { addCandidateOpinion } from "@/lib/opinion/store";

// POST /api/opinion/fuse { parentA, parentB, title, summary, x, y }
// Materialize a fused AI candidate opinion node (kind: "ai") that links back to
// its two parent opinions. Called after the user taps "融合" on the collision panel.
export async function POST(request: NextRequest) {
  let body: {
    parentA?: unknown;
    parentB?: unknown;
    title?: unknown;
    summary?: unknown;
    x?: unknown;
    y?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parentA = typeof body.parentA === "string" ? body.parentA : "";
  const parentB = typeof body.parentB === "string" ? body.parentB : "";
  const title = typeof body.title === "string" ? body.title.slice(0, 60) : "";
  const summary = typeof body.summary === "string" ? body.summary.slice(0, 160) : "";
  if (!parentA || !parentB || !title) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  const x = typeof body.x === "number" ? Math.min(1, Math.max(0, body.x)) : 0.5;
  const y = typeof body.y === "number" ? Math.min(1, Math.max(0, body.y)) : 0.3;
  const opinion = addCandidateOpinion({ parentA, parentB, title, summary, x, y });
  return NextResponse.json({ ok: true, opinion });
}
