import { deleteZhihuOAuthSession, getZhihuOAuthSession } from "@/lib/db/queries/zhihu-oauth";
import { decryptOAuthToken } from "./crypto";
import { getZhihuOAuthSecrets } from "./config";

export async function readActiveZhihuSession(sessionId: string | undefined) {
  if (!sessionId) return null;
  const session = await getZhihuOAuthSession(sessionId);
  if (!session) return null;
  if (session.tokenExpiresAt.getTime() <= Date.now()) {
    await deleteZhihuOAuthSession(sessionId);
    return null;
  }
  return session;
}

export async function readZhihuOAuthToken(sessionId: string | undefined): Promise<string | null> {
  const session = await readActiveZhihuSession(sessionId);
  if (!session) return null;
  const { sessionSecret } = getZhihuOAuthSecrets();
  return decryptOAuthToken(session.tokenCiphertext, sessionSecret);
}
