import { type NextRequest, NextResponse } from "next/server";
import { buildOpinionGraph } from "@/lib/opinion/build-opinion-graph";
import {
  canonicalQuestionUrl,
  fetchQuestionAnswers,
  questionCandidates,
  searchZhihu,
} from "@/lib/opinion/zhihu-search";
import type { OpinionGraph } from "@/lib/opinion/types";

export const runtime = "nodejs";

const GRAPH_CACHE_TTL_MS = 10 * 60 * 1000;
const graphCache = new Map<string, {
  expiresAt: number;
  result: Promise<{ graph: OpinionGraph; hasMore: boolean }>;
}>();

function cachedGraph(query: string, questionUrl: string, questionTitle: string) {
  const key = `${questionUrl}|${questionTitle}`;
  const cached = graphCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  const result = (async () => {
    const answers = await fetchQuestionAnswers(questionUrl, 20);
    if (answers.items.length < 2) throw new Error("zhihu_not_enough_answers");
    const graph = await buildOpinionGraph(query, answers.items, questionTitle, questionUrl);
    return { graph, hasMore: answers.hasMore };
  })().catch((error) => {
    graphCache.delete(key);
    throw error;
  });
  graphCache.set(key, { expiresAt: Date.now() + GRAPH_CACHE_TTL_MS, result });
  if (graphCache.size > 20) graphCache.delete(graphCache.keys().next().value as string);
  return result;
}

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

    const questionTitle = typeof body.questionTitle === "string"
      ? body.questionTitle.trim().slice(0, 160)
      : query;
    const { graph, hasMore } = await cachedGraph(query, requestedQuestionUrl, questionTitle);
    return NextResponse.json({
      ok: true,
      selectionRequired: false,
      graph,
      retrieval: {
        itemCount: graph.sources.length,
        hasMore,
        scope: "zhihu-question-answers",
        buildSource: graph.buildSource,
        buildModel: graph.buildModel,
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
