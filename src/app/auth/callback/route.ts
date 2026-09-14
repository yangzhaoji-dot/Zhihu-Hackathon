import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  consumeZhihuLoginRequest,
  saveZhihuOAuthSession,
} from "@/lib/db/queries/zhihu-oauth";
import {
  getZhihuOAuthSecrets,
  ZHIHU_BROWSER_COOKIE,
  ZHIHU_SESSION_COOKIE,
} from "@/lib/zhihu-oauth/config";
import { encryptOAuthToken, sha256 } from "@/lib/zhihu-oauth/crypto";
import { exchangeAuthorizationCode, fetchZhihuProfile } from "@/lib/zhihu-oauth/provider";

function redirectWithStatus(request: NextRequest, status: string) {
  return NextResponse.redirect(new URL(`/?zhihu=${encodeURIComponent(status)}`, request.url));
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("authorization_code")
    ?? request.nextUrl.searchParams.get("code");
  const browserId = request.cookies.get(ZHIHU_BROWSER_COOKIE)?.value;
  if (!state || !code || !browserId) return redirectWithStatus(request, "invalid_callback");

  try {
    const consumed = await consumeZhihuLoginRequest({
      stateHash: sha256(state),
      browserIdHash: sha256(browserId),
      now: new Date(),
    });
    if (!consumed) return redirectWithStatus(request, "invalid_state");

    const token = await exchangeAuthorizationCode(code);
    const profile = await fetchZhihuProfile(token.accessToken);
    const { sessionSecret } = getZhihuOAuthSecrets();
    const sessionId = randomUUID();
    await saveZhihuOAuthSession({
      id: sessionId,
      tokenCiphertext: encryptOAuthToken(token.accessToken, sessionSecret),
      tokenExpiresAt: new Date(Date.now() + token.expiresIn * 1000),
      profile,
    });
    const response = redirectWithStatus(request, "connected");
    response.cookies.set(ZHIHU_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: token.expiresIn,
    });
    return response;
  } catch {
    return redirectWithStatus(request, "authorization_failed");
  }
}
