import { and, eq } from "drizzle-orm";
import { db } from "../client";
import {
  explorationProgress,
  type ExplorationProgressRow,
} from "../schema/exploration-progress";

/** 增量合并输入（world-design-v0.2 §4.4）：数组字段并集去重，worldState 浅合并。 */
export interface ExplorationProgressPatch {
  addVisitedNpc?: string[];
  addCollectedOpinion?: string[];
  addFoundSource?: string[];
  addFiredTrigger?: string[];
  setWorldState?: Record<string, unknown>;
}

export async function getExplorationProgress(
  userId: string,
  questionId: string
): Promise<ExplorationProgressRow | undefined> {
  const rows = await db
    .select()
    .from(explorationProgress)
    .where(
      and(
        eq(explorationProgress.userId, userId),
        eq(explorationProgress.questionId, questionId)
      )
    )
    .limit(1);
  return rows[0];
}

function union(base: string[], add?: string[]): string[] {
  return [...new Set([...base, ...(add ?? [])])];
}

export async function upsertExplorationProgress(
  userId: string,
  questionId: string,
  patch: ExplorationProgressPatch
): Promise<ExplorationProgressRow> {
  const existing = await getExplorationProgress(userId, questionId);
  const merged = {
    visitedNpcIds: union(existing?.visitedNpcIds ?? [], patch.addVisitedNpc),
    collectedOpinionIds: union(
      existing?.collectedOpinionIds ?? [],
      patch.addCollectedOpinion
    ),
    foundSourceIds: union(existing?.foundSourceIds ?? [], patch.addFoundSource),
    firedTriggerIds: union(existing?.firedTriggerIds ?? [], patch.addFiredTrigger),
    worldState: {
      ...((existing?.worldState as Record<string, unknown> | null) ?? {}),
      ...(patch.setWorldState ?? {}),
    },
  };
  const rows = await db
    .insert(explorationProgress)
    .values({ userId, questionId, ...merged })
    .onConflictDoUpdate({
      target: [explorationProgress.userId, explorationProgress.questionId],
      set: { ...merged, updatedAt: new Date() },
    })
    .returning();
  return rows[0];
}
