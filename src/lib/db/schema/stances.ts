import type { InferSelectModel } from "drizzle-orm";
import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

// stances —— 替换 store.ts 内存 Map（world-design-v0.2 §3.3 / D7）
export const stances = pgTable(
  "stances",
  {
    userId: text("user_id").notNull(),
    opinionId: text("opinion_id").notNull(), // 含 o_live_* 动态观点
    stance: text("stance", { enum: ["agree", "disagree", "neutral"] }).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.opinionId] })]
);

export type StanceRow = InferSelectModel<typeof stances>;
