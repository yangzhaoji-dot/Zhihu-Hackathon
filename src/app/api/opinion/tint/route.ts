import { type NextRequest, NextResponse } from "next/server";
import { tintZhihu } from "@/lib/opinion/tint";

// POST /api/opinion/tint { text, url? }
// Structurally analyzes pasted Zhihu content: extracts opinions and tints each
// with stance, type, relation, argument strength and evidence, plus stance
// clusters and blind spots. The URL is optional weak context only — the pasted
// text is the source of truth.
export async function POST(request: NextRequest) {
  let body: { text?: unknown; url?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : undefined;
  if (text.length < 10) {
    return NextResponse.json({ ok: false, error: "text_too_short" }, { status: 400 });
  }
  const result = await tintZhihu({ text, url });
  return NextResponse.json({ ok: true, result });
}
