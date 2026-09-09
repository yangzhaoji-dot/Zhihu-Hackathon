import { NextResponse } from "next/server";
import { recommendPath } from "@/lib/opinion/ai";

// GET /api/opinion/navigate
// Agent navigation: a recommended exploration path through the opinion space
// that most quickly reveals the argument structure. AI-driven with a fallback.
export async function GET() {
  const result = await recommendPath();
  return NextResponse.json({ ok: true, ...result });
}
