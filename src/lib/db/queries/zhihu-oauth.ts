import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../client";
import {
  zhihuOAuthLoginRequests,
  zhihuOAuthSessions,
  type ZhihuOAuthProfile,
  type ZhihuOAuthSession,
} from "../schema/zhihu-oauth";

export async function createZhihuLoginRequest(input: {
  id: string;
  browserIdHash: string;
  stateHash: string;
  expiresAt: Date;
}): Promise<void> {
  await db.insert(zhihuOAuthLoginRequests).values(input);
}

export async function consumeZhihuLoginRequest(input: {
  stateHash: string;
  browserIdHash: string;
  now: Date;
}): Promise<boolean> {
  const rows = await db
    .update(zhihuOAuthLoginRequests)
    .set({ consumedAt: input.now })
    .where(
      and(
        eq(zhihuOAuthLoginRequests.stateHash, input.stateHash),
        eq(zhihuOAuthLoginRequests.browserIdHash, input.browserIdHash),
        gt(zhihuOAuthLoginRequests.expiresAt, input.now),
        isNull(zhihuOAuthLoginRequests.consumedAt)
      )
    )
    .returning({ id: zhihuOAuthLoginRequests.id });
  return rows.length === 1;
}

export async function saveZhihuOAuthSession(input: {
  id: string;
  tokenCiphertext: string;
  tokenExpiresAt: Date;
  profile: ZhihuOAuthProfile;
}): Promise<void> {
  await db.insert(zhihuOAuthSessions).values(input);
}

export async function getZhihuOAuthSession(id: string): Promise<ZhihuOAuthSession | undefined> {
  const rows = await db.select().from(zhihuOAuthSessions).where(eq(zhihuOAuthSessions.id, id)).limit(1);
  return rows[0];
}

export async function deleteZhihuOAuthSession(id: string): Promise<void> {
  await db.delete(zhihuOAuthSessions).where(eq(zhihuOAuthSessions.id, id));
}
