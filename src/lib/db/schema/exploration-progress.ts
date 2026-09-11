import type { InferSelectModel } from "drizzle-orm";
import { jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

// exploration_progress —— 探索进度 + 世界动态状态（world-design-v0.2 §3.3 / §3.4）
export const explorationProgress = pgTable(
  "exploration_progress",
  {
    userId: text("user_id").notNull(),
    questionId: text("question_id").notNull(),
    visitedNpcIds: text("visited_npc_ids").array().notNull().default([]),
    collectedOpinionIds: text("collected_opinion_ids").array().notNull().default([]),
    foundSourceIds: text("found_source_ids").array().notNull().default([]),
    firedTriggerIds: text("fired_trigger_ids").array().notNull().default([]),
    // 见 §3.4：bridge:<a>:<b> / fog:<zoneId> / ruin:<zoneId> / observatory
    worldState: jsonb("world_state").$type<Record<string, unknown>>().notNull().default({}),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.questionId] })]
);

export type ExplorationProgressRow = InferSelectModel<typeof explorationProgress>;
