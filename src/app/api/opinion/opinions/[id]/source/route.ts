import { type NextRequest, NextResponse } from "next/server";
import { getSourcesForOpinion } from "@/lib/opinion/store";

// GET /api/opinion/opinions/[id]/source
// Trace one opinion back to its real Zhihu answers, authors, evidence, and
// related opposing / supplementing opinions.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = getSourcesForOpinion(id);
  if (!result) {
    return NextResponse.json(
      { ok: false, error: "opinion_not_found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, ...result });
}
