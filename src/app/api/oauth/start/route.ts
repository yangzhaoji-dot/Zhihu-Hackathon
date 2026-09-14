import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getZhihuOAuthConfig,
  getZhihuOAuthSecrets,
  ZHIHU_BROWSER_COOKIE,
  ZHIHU_STATE_COOKIE,
} from "@/lib/zhihu-oauth/config";
import { sealZhihuState } from "@/lib/zhihu-oauth/cookies";
import { sha256 } from "@/lib/zhihu-oauth/crypto";

export async function GET(request: NextRequest) {
  try {
    const config = getZhihuOAuthConfig();
    getZhihuOAuthSecrets();
    const browserId = request.cookies.get(ZHIHU_BROWSER_COOKIE)?.value ?? randomUUID();
    const state = randomBytes(32).toString("base64url");
    const stateCookie = sealZhihuState({
      browserIdHash: sha256(browserId),
      stateHash: sha256(state),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    const authorizationUrl = new URL("https://openapi.zhihu.com/authorize");
    authorizationUrl.searchParams.set("redirect_uri", config.redirect_uri);
    authorizationUrl.searchParams.set("app_id", config.app_id);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("state", state);
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(ZHIHU_BROWSER_COOKIE, browserId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
    response.cookies.set(ZHIHU_STATE_COOKIE, stateCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/auth/callback",
      maxAge: 10 * 60,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/?zhihu=not_configured", request.url));
  }
}
