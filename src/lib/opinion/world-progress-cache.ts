// 世界进度的 localStorage 降级缓存（world-design-v0.2 §4.4，M3）。
// 降级链：POST/GET /world/progress（DB 或服务器内存）→ localStorage → 页面内存。
// 服务器不可用（网络失败 / 5xx）时，页面把每次增量合并后的完整进度写这里，
// 重进世界时优先读服务器，失败再读本缓存，保证无库/离线 demo 可玩。

import type { ExplorationProgressDto } from "./types";

const KEY_PREFIX = "opinionspace.world-progress";

function storageKey(viewerId: string, questionId: string): string {
  return `${KEY_PREFIX}.${viewerId}.${questionId}`;
}

export function loadLocalWorldProgress(
  viewerId: string,
  questionId: string,
): ExplorationProgressDto | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(viewerId, questionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ExplorationProgressDto>;
    return {
      questionId,
      visitedNpcIds: Array.isArray(parsed.visitedNpcIds) ? parsed.visitedNpcIds : [],
      collectedOpinionIds: Array.isArray(parsed.collectedOpinionIds)
        ? parsed.collectedOpinionIds
        : [],
      foundSourceIds: Array.isArray(parsed.foundSourceIds) ? parsed.foundSourceIds : [],
      firedTriggerIds: Array.isArray(parsed.firedTriggerIds) ? parsed.firedTriggerIds : [],
      worldState:
        parsed.worldState && typeof parsed.worldState === "object" ? parsed.worldState : {},
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
    };
  } catch {
    return null;
  }
}

export function saveLocalWorldProgress(
  viewerId: string,
  progress: ExplorationProgressDto,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(viewerId, progress.questionId),
      JSON.stringify(progress),
    );
  } catch {
    // 隐私模式 / 配额满：静默失败，页面内存态仍可用。
  }
}
