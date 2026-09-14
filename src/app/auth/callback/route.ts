import { NextRequest, NextResponse } from "next/server";
import {
  ZHIHU_BROWSER_COOKIE,
  ZHIHU_SESSION_COOKIE,
  ZHIHU_STATE_COOKIE,
} from "@/lib/zhihu-oauth/config";
import {
  readZhihuState,
  sealZhihuResult,
  summarizeVerificationResults,
} from "@/lib/zhihu-oauth/cookies";
import { sha256 } from "@/lib/zhihu-oauth/crypto";
import {
  exchangeAuthorizationCode,
  fetchZhihuProfile,
  fetchZhihuUserDataSample,
} from "@/lib/zhihu-oauth/provider";

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
    const savedState = readZhihuState(request.cookies.get(ZHIHU_STATE_COOKIE)?.value);
    if (!savedState
      || savedState.stateHash !== sha256(state)
      || savedState.browserIdHash !== sha256(browserId)) {
      return redirectWithStatus(request, "invalid_state");
    }

    const token = await exchangeAuthorizationCode(code);
    const [profile, rawResults] = await Promise.all([
      fetchZhihuProfile(token.accessToken),
      fetchZhihuUserDataSample(token.accessToken),
    ]);
    const maxAge = Math.min(token.expiresIn, 30 * 60);
    const resultCookie = sealZhihuResult({
      profile,
      results: summarizeVerificationResults(rawResults),
      expiresAt: Date.now() + maxAge * 1000,
    });
    const response = redirectWithStatus(request, "connected");
    response.cookies.set(ZHIHU_STATE_COOKIE, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/auth/callback",
      maxAge: 0,
    });
    response.cookies.set(ZHIHU_SESSION_COOKIE, resultCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    return response;
  } catch {
    return redirectWithStatus(request, "authorization_failed");
  }
}
