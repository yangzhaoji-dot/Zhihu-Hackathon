import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { judgements, type JudgementRow } from "../schema/judgements";

export async function insertJudgement(data: {
  userId: string;
  questionId: string;
  statement: string;
  leaning?: string | null;
  agreeIds?: string[];
  disagreeIds?: string[];
  x: number;
  y: number;
}): Promise<JudgementRow> {
  const rows = await db
    .insert(judgements)
    .values({
      id: `j_${crypto.randomUUID()}`,
      userId: data.userId,
      questionId: data.questionId,
      statement: data.statement,
      leaning: data.leaning ?? null,
      agreeIds: data.agreeIds ?? [],
      disagreeIds: data.disagreeIds ?? [],
      x: data.x,
      y: data.y,
    })
    .returning();
  return rows[0];
}

export async function getJudgementsByUserQuestion(
  userId: string,
  questionId: string
): Promise<JudgementRow[]> {
  return db
    .select()
    .from(judgements)
    .where(and(eq(judgements.userId, userId), eq(judgements.questionId, questionId)))
    .orderBy(desc(judgements.createdAt));
}
