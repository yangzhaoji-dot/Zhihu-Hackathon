import { type NextRequest, NextResponse } from "next/server";
import { buildOpinionGraph } from "@/lib/opinion/build-opinion-graph";
import {
  canonicalQuestionUrl,
  fetchQuestionAnswers,
  questionCandidates,
  searchZhihu,
} from "@/lib/opinion/zhihu-search";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { query?: unknown; questionUrl?: unknown; questionTitle?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const query = typeof body.query === "string"
    ? body.query.trim().replace(/\s+/g, " ").slice(0, 200)
    : "";
  if (query.length < 2) {
    return NextResponse.json({ ok: false, error: "query_too_short" }, { status: 400 });
  }

  try {
    const requestedQuestionUrl = typeof body.questionUrl === "string"
      ? canonicalQuestionUrl(body.questionUrl)
      : canonicalQuestionUrl(query);
    if (!requestedQuestionUrl) {
      const search = await searchZhihu(query, 10);
      const questions = questionCandidates(search.items, query);
      if (questions.length === 0) {
        return NextResponse.json({ ok: false, error: "no_question_candidates" }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        selectionRequired: true,
        query,
        questions,
      });
    }

    const answers = await fetchQuestionAnswers(requestedQuestionUrl, 20);
    if (answers.items.length < 2) {
      return NextResponse.json({ ok: false, error: "zhihu_not_enough_answers" }, { status: 404 });
    }
    const questionTitle = typeof body.questionTitle === "string"
      ? body.questionTitle.trim().slice(0, 160)
      : query;
    const graph = await buildOpinionGraph(query, answers.items, questionTitle, requestedQuestionUrl);
    return NextResponse.json({
      ok: true,
      selectionRequired: false,
      graph,
      retrieval: {
        itemCount: graph.sources.length,
        hasMore: answers.hasMore,
        scope: "zhihu-question-answers",
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "build_failed";
    const status = code === "zhihu_auth_not_configured"
      ? 503
      : code === "zhihu_rate_limited"
        ? 429
        : code === "zhihu_not_enough_answers"
          ? 404
          : 502;
    return NextResponse.json({ ok: false, error: code }, { status });
  }
}
