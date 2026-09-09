import { type NextRequest, NextResponse } from "next/server";
import { getOpinionGraph } from "@/lib/opinion/store";

// GET /api/opinion/graph?questionId=q_luoci
// Layer 2: the opinion-space graph (opinions + relations) for one question.
export async function GET(request: NextRequest) {
  const questionId =
    request.nextUrl.searchParams.get("questionId") ?? "q_luoci";
  const graph = getOpinionGraph(questionId);
  if (!graph) {
    return NextResponse.json(
      { ok: false, error: "opinion_space_not_found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, graph });
}
