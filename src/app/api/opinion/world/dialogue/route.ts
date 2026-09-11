import { type NextRequest, NextResponse } from "next/server";
import { AppAIUnavailableError } from "@/lib/eazo-ai-billing";
import { composePlanetDialogue, type PlanetDialogueHistoryLine } from "@/lib/opinion/planet-dialogue";

const MAX_HISTORY = 8;
const MAX_HISTORY_TEXT = 500;

function sanitizeHistory(value: unknown): PlanetDialogueHistoryLine[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_HISTORY).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const line = item as Record<string, unknown>;
    if (typeof line.speaker !== "string" || typeof line.text !== "string") return [];
    if (line.speaker !== "npc" && line.speaker !== "guide" && line.speaker !== "player") return [];
    const text = line.text.slice(0, MAX_HISTORY_TEXT).trim();
    return text ? [{ speaker: line.speaker, text }] : [];
  });
}

export async function POST(request: NextRequest) {
  let body: {
    questionId?: unknown;
    opinionId?: unknown;
    trigger?: unknown;
    locale?: unknown;
    history?: unknown;
    worldState?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const questionId = typeof body.questionId === "string" ? body.questionId.trim() : "";
  const opinionId = typeof body.opinionId === "string" ? body.opinionId.trim() : "";
  const trigger = typeof body.trigger === "string" ? body.trigger.trim() : "";
  const locale = typeof body.locale === "string" ? body.locale : "zh-CN";

  if (
    !questionId ||
    !opinionId ||
    questionId.length > 160 ||
    opinionId.length > 160 ||
    trigger !== "inspect"
  ) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const worldState =
    body.worldState && typeof body.worldState === "object" && !Array.isArray(body.worldState)
      ? (body.worldState as Record<string, unknown>)
      : undefined;

  try {
    const reply = await composePlanetDialogue({
      questionId,
      opinionId,
      locale,
      history: sanitizeHistory(body.history),
      worldState,
    });
    if (!reply) {
      return NextResponse.json({ ok: false, error: "opinion_not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, reply });
  } catch (error) {
    if (error instanceof AppAIUnavailableError) {
      return NextResponse.json(
        { ok: false, code: "app_ai_unavailable", detail: { code: "app_ai_unavailable" } },
        { status: 402 },
      );
    }
    return NextResponse.json({ ok: false, error: "dialogue_failed" }, { status: 500 });
  }
}
