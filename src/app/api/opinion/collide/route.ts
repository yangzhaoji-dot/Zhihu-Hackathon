import { type NextRequest, NextResponse } from "next/server";
import { analyzeCollision } from "@/lib/opinion/ai";
import { analyzeDemoCollision } from "@/lib/cognitive-galaxy/demo-collision";
import { AppAIUnavailableError } from "@/lib/eazo-ai-billing";
import type { OpinionGraph } from "@/lib/opinion/types";

// POST /api/opinion/collide { aId, bId, graph? }
// Collision analysis is API-first for both live and demo graphs. Homepage demos
// retain an authored deterministic fallback so the showcase still works when
// external AI is unavailable (for example in CI or an offline preview).
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

    if (analysis.source === "ai" || graph?.sourceScope !== "demo") {
      return NextResponse.json({ ok: true, analysis });
    }

    // analyzeCollision already attempted the configured Zhihu/Eazo provider.
    // If neither provider is available, keep the curated demo deterministic
    // instead of exposing the generic AI-unavailable fallback to the showcase.
    const a = graph.opinions.find((item) => item.id === aId);
    const b = graph.opinions.find((item) => item.id === bId);
    if (!a || !b) return NextResponse.json({ ok: false, error: "opinion_not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, analysis: analyzeDemoCollision(a, b) });
  } catch (error) {
    if (error instanceof AppAIUnavailableError) {
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
    Array.isArray(graph.opinions) && graph.opinions.length <= 100 &&
    Array.isArray(graph.sources) && graph.sources.length <= 200 &&
    Array.isArray(graph.authors) && graph.authors.length <= 200 &&
    Array.isArray(graph.relations) && graph.relations.length <= 300;
}
