import { type NextRequest, NextResponse } from "next/server";
import { AppAIUnavailableError } from "@/lib/eazo-ai-billing";
import { composeWorldDialogue } from "@/lib/opinion/ai";
import type { WorldDialogueHistoryLine } from "@/lib/opinion/ai";

// POST /api/opinion/world/dialogue { npcId, trigger, locale, history[] }
// NPC / 看山动态对话（world-design-v0.2 §4.2，M3）。
// 红线：AI 只改写表达、不新增事实；actions 的 sourceId/opinionId 在
// composeWorldDialogue 内做白名单校验，越界即整段回退静态模板。
// 响应 { ok:true, reply:{ lines, source:"ai"|"fallback" } }；
// 402 app_ai_unavailable 语义保留（额度耗尽时），但因有静态兜底正常不到前端。

const MAX_HISTORY = 8;
const MAX_HISTORY_TEXT = 500;

function sanitizeHistory(value: unknown): WorldDialogueHistoryLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-MAX_HISTORY)
    .flatMap((item) => {
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
    npcId?: unknown;
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

  const npcId = typeof body.npcId === "string" ? body.npcId.trim() : "";
  const trigger = typeof body.trigger === "string" ? body.trigger.trim() : "";
  const locale = typeof body.locale === "string" ? body.locale : "zh-CN";
  if (!npcId || npcId.length > 64 || !trigger || trigger.length > 64) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  if (trigger !== "talk" && !/^guide-[a-z0-9-]+$/i.test(trigger)) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const worldState =
    body.worldState && typeof body.worldState === "object" && !Array.isArray(body.worldState)
      ? (body.worldState as Record<string, unknown>)
      : undefined;

  try {
    const reply = await composeWorldDialogue({
      npcId,
      trigger,
      locale,
      history: sanitizeHistory(body.history),
      worldState,
    });
    if (!reply) {
      return NextResponse.json({ ok: false, error: "npc_not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, reply });
  } catch (error) {
    if (error instanceof AppAIUnavailableError) {
      // composeWorldDialogue 内部已有静态兜底，此路径罕见；保留标准语义。
      return NextResponse.json(
        { ok: false, code: "app_ai_unavailable", detail: { code: "app_ai_unavailable" } },
        { status: 402 },
      );
    }
    return NextResponse.json({ ok: false, error: "dialogue_failed" }, { status: 500 });
  }
}
