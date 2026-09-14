import { type NextRequest, NextResponse } from "next/server";
import { searchZhihu } from "@/lib/opinion/zhihu-search";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().replace(/\s+/g, " ").slice(0, 200) ?? "";
  const requestedCount = Number(request.nextUrl.searchParams.get("count") ?? 10);
  const count = Number.isFinite(requestedCount)
    ? Math.max(1, Math.min(10, Math.round(requestedCount)))
    : 10;

  if (query.length < 2) {
    return NextResponse.json({ ok: false, error: "query_too_short" }, { status: 400 });
  }

  try {
    const result = await searchZhihu(query, count);
    return NextResponse.json({
      ok: true,
      query,
      count: result.items.length,
      hasMore: result.hasMore,
      items: result.items,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "zhihu_search_failed";
    const status = code === "zhihu_auth_not_configured"
      ? 503
      : code === "zhihu_rate_limited"
        ? 429
        : 502;
    return NextResponse.json({ ok: false, error: code }, { status });
  }
}
