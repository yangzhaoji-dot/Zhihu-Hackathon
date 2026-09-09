import { NextResponse } from "next/server";
import { mineGaps } from "@/lib/opinion/ai";

// GET /api/opinion/gaps
// Agent blind-spot mining: perspectives, evidence, and scenarios the current
// discussion has not yet covered. AI-driven with a fallback.
export async function GET() {
  const result = await mineGaps();
  return NextResponse.json({ ok: true, ...result });
}
