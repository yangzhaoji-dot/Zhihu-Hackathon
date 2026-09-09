import { type NextRequest, NextResponse } from "next/server";
import { buildOpinionGraph } from "@/lib/opinion/build-opinion-graph";
import { searchZhihu } from "@/lib/opinion/zhihu-search";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { query?: unknown };
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
    const search = await searchZhihu(query, 10);
    if (search.items.length === 0) {
      return NextResponse.json({ ok: false, error: "no_zhihu_results" }, { status: 404 });
    }
    const graph = await buildOpinionGraph(query, search.items);
    return NextResponse.json({
      ok: true,
      graph,
      retrieval: {
        itemCount: graph.sources.length,
        hasMore: search.hasMore,
        searchHashId: search.searchHashId,
        scope: "zhihu_search_results",
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "build_failed";
    const status = code === "zhihu_auth_not_configured" ? 503 : code === "zhihu_rate_limited" ? 429 : 502;
    return NextResponse.json({ ok: false, error: code }, { status });
  }
}
