// 世界运行时纯逻辑 —— 探索进度增量合并（world-design-v0.2 §4.4，M3 提前落地）。
//
// 语义与 src/lib/db/queries/exploration-progress.ts 的 upsert 完全一致：
// 数组字段并集去重，worldState 浅合并（后写覆盖同键）。本模块是纯函数，
// 供 progress 路由的内存降级路径与校验脚本使用；DB 路径仍走 queries 层。
//
// 本文件不依赖 React/DOM/server-only/db。

import type { ExplorationProgressDto } from "@/lib/opinion/types";

/** 增量合并输入（与 db queries 层 ExplorationProgressPatch 同形）。 */
export interface ProgressPatch {
  addVisitedNpc?: string[];
  addCollectedOpinion?: string[];
  addFoundSource?: string[];
  addFiredTrigger?: string[];
  setWorldState?: Record<string, unknown>;
}

export function emptyProgress(questionId: string): ExplorationProgressDto {
  return {
    questionId,
    visitedNpcIds: [],
    collectedOpinionIds: [],
    foundSourceIds: [],
    firedTriggerIds: [],
    worldState: {},
  };
}

function union(base: readonly string[], add?: readonly string[]): string[] {
  return [...new Set([...base, ...(add ?? [])])];
}

/** 纯合并：不修改入参，返回新对象。 */
export function mergeProgressPatch(
  base: ExplorationProgressDto,
  patch: ProgressPatch,
): ExplorationProgressDto {
  return {
    questionId: base.questionId,
    visitedNpcIds: union(base.visitedNpcIds, patch.addVisitedNpc),
    collectedOpinionIds: union(base.collectedOpinionIds, patch.addCollectedOpinion),
    foundSourceIds: union(base.foundSourceIds, patch.addFoundSource),
    firedTriggerIds: union(base.firedTriggerIds, patch.addFiredTrigger),
    worldState: { ...base.worldState, ...(patch.setWorldState ?? {}) },
    updatedAt: base.updatedAt,
  };
}
