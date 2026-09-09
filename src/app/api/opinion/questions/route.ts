import { NextResponse } from "next/server";
import { getQuestionNetwork } from "@/lib/opinion/store";

// GET /api/opinion/questions
// Layer 1: the global question network around the current focus question.
export async function GET() {
  return NextResponse.json({ ok: true, network: getQuestionNetwork() });
}
