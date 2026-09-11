import { eq } from "drizzle-orm";
import { db } from "../client";
import { stances, type StanceRow } from "../schema/stances";

type StanceValue = StanceRow["stance"]; // "agree" | "disagree" | "neutral"

export async function upsertStance(data: {
  userId: string;
  opinionId: string;
  stance: StanceValue;
}): Promise<StanceRow> {
  const rows = await db
    .insert(stances)
    .values(data)
    .onConflictDoUpdate({
      target: [stances.userId, stances.opinionId],
      set: { stance: data.stance, updatedAt: new Date() },
    })
    .returning();
  return rows[0];
}

export async function getStancesByUser(userId: string): Promise<StanceRow[]> {
  return db.select().from(stances).where(eq(stances.userId, userId));
}
