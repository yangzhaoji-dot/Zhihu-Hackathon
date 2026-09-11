import type { InferSelectModel } from "drizzle-orm";
import { pgTable, real, text, timestamp } from "drizzle-orm/pg-core";

// judgements —— 判断记录 / 认知坐标（world-design-v0.2 §3.3，D6 观测站）
export const judgements = pgTable("judgements", {
  id: text("id").primaryKey(), // j_<crypto.randomUUID()>
  userId: text("user_id").notNull(),
  questionId: text("question_id").notNull(),
  statement: text("statement").notNull(), // 用户当前看法（≤140 字）
  leaning: text("leaning"), // 阵营倾向快照，如「止损派」
  agreeIds: text("agree_ids").array().notNull().default([]),
  disagreeIds: text("disagree_ids").array().notNull().default([]),
  x: real("x").notNull(),
  y: real("y").notNull(), // 认知坐标（世界内归一化 0–1）
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type JudgementRow = InferSelectModel<typeof judgements>;
