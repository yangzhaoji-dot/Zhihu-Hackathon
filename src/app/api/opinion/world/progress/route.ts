import { type NextRequest, NextResponse } from "next/server";
import {
  getExplorationProgress,
  upsertExplorationProgress,
  type ExplorationProgressPatch,
} from "@/lib/db/queries/exploration-progress";
import type { ExplorationProgressRow } from "@/lib/db/schema/exploration-progress";
import { resolveViewerId } from "@/lib/opinion/viewer";
import type { ExplorationProgressDto } from "@/lib/opinion/types";
import {
  emptyProgress,
  mergeProgressPatch,
} from "@/lib/world/progress-merge";

// GET/POST /api/opinion/world/progress —— 探索进度与 WorldState 读写
// （world-design-v0.2 §4.4，自 M4 提前）。
// - 身份：viewer.ts 解析（登录或匿名 x-viewer-id），匿名可用；
// - POST 为增量合并语义（数组并集去重 + worldState 浅合并），复用 M0 的
//   upsertExplorationProgress；
// - 与 stance 相同的优雅降级：DATABASE_URL 未配置或 DB 抛错时回退进程内存
//   Map（console.warn），保证无库 demo 可玩；
// - GET 返回合并后的完整 progress；未有进度时返回空对象结构（ok:true，空数组字段）。

// ── 内存降级层（无库 demo；进程内有效，与 stance 的内存 Map 同级） ──────────
const memoryProgress = new Map<string, ExplorationProgressDto>();
const memKey = (userId: string, questionId: string) => `${userId}::${questionId}`;

function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function rowToDto(row: ExplorationProgressRow): ExplorationProgressDto {
  return {
    questionId: row.questionId,
    visitedNpcIds: row.visitedNpcIds,
    collectedOpinionIds: row.collectedOpinionIds,
    foundSourceIds: row.foundSourceIds,
    firedTriggerIds: row.firedTriggerIds,
    worldState: (row.worldState as Record<string, unknown>) ?? {},
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function readProgress(
  userId: string,
  questionId: string,
): Promise<ExplorationProgressDto> {
  if (isDbConfigured()) {
    try {
      const row = await getExplorationProgress(userId, questionId);
      return row ? rowToDto(row) : emptyProgress(questionId);
    } catch (err) {
      console.warn(
        "[world/progress] DB read failed; falling back to memory",
        err,
      );
    }
  }
  return memoryProgress.get(memKey(userId, questionId)) ?? emptyProgress(questionId);
}

async function writeProgress(
  userId: string,
  questionId: string,
  patch: ExplorationProgressPatch,
): Promise<ExplorationProgressDto> {
  if (isDbConfigured()) {
    try {
      return rowToDto(await upsertExplorationProgress(userId, questionId, patch));
    } catch (err) {
      console.warn(
        "[world/progress] DB write failed; falling back to memory",
        err,
      );
    }
  }
  const key = memKey(userId, questionId);
  const merged = mergeProgressPatch(
    memoryProgress.get(key) ?? emptyProgress(questionId),
    patch,
  );
  memoryProgress.set(key, merged);
  return merged;
}

// ── 输入校验 ────────────────────────────────────────────────────────────────
const MAX_IDS = 300;
const MAX_ID_LENGTH = 64;
const MAX_STATE_KEYS = 100;

function cleanIdArray(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_IDS) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !item || item.length > MAX_ID_LENGTH) return null;
    out.push(item);
  }
  return out;
}

function cleanWorldState(value: unknown): Record<string, unknown> | null {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length > MAX_STATE_KEYS) return null;
  try {
    JSON.stringify(value);
  } catch {
    return null;
  }
  return value as Record<string, unknown>;
}

function parsePatch(body: Record<string, unknown>): ExplorationProgressPatch | null {
  const addVisitedNpc = cleanIdArray(body.addVisitedNpc);
  const addCollectedOpinion = cleanIdArray(body.addCollectedOpinion);
  const addFoundSource = cleanIdArray(body.addFoundSource);
  const addFiredTrigger = cleanIdArray(body.addFiredTrigger);
  const setWorldState = cleanWorldState(body.setWorldState);
  if (
    addVisitedNpc === null ||
    addCollectedOpinion === null ||
    addFoundSource === null ||
    addFiredTrigger === null ||
    setWorldState === null
  ) {
    return null;
  }
  return { addVisitedNpc, addCollectedOpinion, addFoundSource, addFiredTrigger, setWorldState };
}

export async function GET(request: NextRequest) {
  const questionId = request.nextUrl.searchParams.get("questionId")?.trim() ?? "";
  if (!questionId || questionId.length > 64) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  const viewerId = resolveViewerId(request);
  const progress = await readProgress(viewerId, questionId);
  return NextResponse.json({ ok: true, progress });
}

export async function POST(request: NextRequest) {
  const viewerId = resolveViewerId(request);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const questionId = typeof body.questionId === "string" ? body.questionId.trim() : "";
  if (!questionId || questionId.length > 64) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  const patch = parsePatch(body);
  if (!patch) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  const progress = await writeProgress(viewerId, questionId, patch);
  return NextResponse.json({ ok: true, progress });
}
