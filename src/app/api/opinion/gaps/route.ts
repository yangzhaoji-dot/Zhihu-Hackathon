import { type NextRequest, NextResponse } from "next/server";
import { mineGaps } from "@/lib/opinion/ai";
import type { OpinionGraph } from "@/lib/opinion/types";

// GET /api/opinion/gaps
// Agent blind-spot mining: perspectives, evidence, and scenarios the current
// discussion has not yet covered. AI-driven with a fallback.
export async function GET() {
  const result = await mineGaps();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { graph?: OpinionGraph } | null;
  const graph = body?.graph;
  if (!graph || !Array.isArray(graph.opinions) || graph.opinions.length > 12) {
    return NextResponse.json({ ok: false, error: "invalid_graph" }, { status: 400 });
  }
  const result = await mineGaps(graph);
  return NextResponse.json({ ok: true, ...result });
}
