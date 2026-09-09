import { type NextRequest, NextResponse } from "next/server";
import { semanticSearch } from "@/lib/opinion/ai";

// POST /api/opinion/search { query }
// Semantic opinion search: locate the most relevant opinion node for an idea,
// not a keyword match. AI-driven with a keyword-overlap fallback.
export async function POST(request: NextRequest) {
  let body: { query?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const query = typeof body.query === "string" ? body.query.trim().slice(0, 200) : "";
  if (!query) {
    return NextResponse.json({ ok: false, error: "empty_query" }, { status: 400 });
  }
  const result = await semanticSearch(query);
  return NextResponse.json({ ok: true, result });
}
