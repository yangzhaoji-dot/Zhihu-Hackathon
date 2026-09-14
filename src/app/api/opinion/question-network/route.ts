import { type NextRequest, NextResponse } from "next/server";
import { buildQuestionNetwork } from "@/lib/opinion/build-question-network";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { query?: unknown; coreQuestionId?: unknown; coreTitle?: unknown; coreUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim().slice(0, 200) : "";
  const coreQuestionId = typeof body.coreQuestionId === "string" ? body.coreQuestionId.trim() : "";
  const coreTitle = typeof body.coreTitle === "string" ? body.coreTitle.trim().slice(0, 160) : "";
  const coreUrl = typeof body.coreUrl === "string" ? body.coreUrl.trim() : "";
  if (!query || !coreQuestionId || !coreTitle || !coreUrl) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  try {
    const network = await buildQuestionNetwork({ query, coreQuestionId, coreTitle, coreUrl });
    return NextResponse.json({ ok: true, network });
  } catch (error) {
    const code = error instanceof Error ? error.message : "question_network_failed";
    return NextResponse.json({ ok: false, error: code }, { status: 502 });
  }
}
