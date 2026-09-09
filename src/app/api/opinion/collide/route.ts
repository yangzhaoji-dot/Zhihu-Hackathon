import { type NextRequest, NextResponse } from "next/server";
import { analyzeCollision } from "@/lib/opinion/ai";
import { AppAIUnavailableError } from "@/lib/eazo-ai-billing";
import type { OpinionGraph } from "@/lib/opinion/types";

// POST /api/opinion/collide { aId, bId }
// Analyze a collision between two opinions: consensus, core disagreement,
// each side's conditions, evidence comparison, missing information, and a
// candidate fused opinion. AI-driven with a graceful offline fallback.
export async function POST(request: NextRequest) {
  let body: { aId?: unknown; bId?: unknown; graph?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const aId = typeof body.aId === "string" ? body.aId : "";
  const bId = typeof body.bId === "string" ? body.bId : "";
  if (!aId || !bId || aId === bId) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  try {
    const graph = isOpinionGraph(body.graph) ? body.graph : undefined;
    const analysis = await analyzeCollision(aId, bId, graph);
    return NextResponse.json({ ok: true, analysis });
  } catch (error) {
    if (error instanceof AppAIUnavailableError) {
      // analyzeCollision already falls back internally, so this path is rare;
      // surface the standard code so the client can toast it if needed.
      return NextResponse.json(
        { ok: false, code: "app_ai_unavailable", detail: { code: "app_ai_unavailable" } },
        { status: 402 },
      );
    }
    return NextResponse.json({ ok: false, error: "collision_failed" }, { status: 500 });
  }
}

function isOpinionGraph(value: unknown): value is OpinionGraph {
  if (!value || typeof value !== "object") return false;
  const graph = value as Partial<OpinionGraph>;
  return typeof graph.questionId === "string" &&
    typeof graph.questionTitle === "string" &&
    Array.isArray(graph.opinions) && graph.opinions.length <= 12 &&
    Array.isArray(graph.sources) && graph.sources.length <= 20 &&
    Array.isArray(graph.authors) && graph.authors.length <= 20 &&
    Array.isArray(graph.relations) && graph.relations.length <= 30;
}
