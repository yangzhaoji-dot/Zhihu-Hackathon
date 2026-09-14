import { NextRequest, NextResponse } from "next/server";
import { getZhihuOAuthConfig, hasConfiguredSecret, ZHIHU_SESSION_COOKIE } from "@/lib/zhihu-oauth/config";
import { readZhihuResult } from "@/lib/zhihu-oauth/cookies";

export async function GET(request: NextRequest) {
  const configured = {
    appId: false,
    redirectUri: false,
    appKey: hasConfiguredSecret("ZHIHU_OAUTH_APP_KEY"),
    accessSecret: hasConfiguredSecret("ZHIHU_ACCESS_SECRET"),
    sessionSecret: hasConfiguredSecret("ZHIHU_OAUTH_SESSION_SECRET"),
  };
  try {
    const config = getZhihuOAuthConfig();
    configured.appId = Boolean(config.app_id);
    configured.redirectUri = Boolean(config.redirect_uri);
  } catch {
    // Configuration flags remain false.
  }
  const result = readZhihuResult(request.cookies.get(ZHIHU_SESSION_COOKIE)?.value);
  return NextResponse.json({
    ok: true,
    connected: Boolean(result),
    configured,
    sessionMode: "callback-only-demo",
    profile: result?.profile ?? null,
    expiresAt: result ? new Date(result.expiresAt).toISOString() : null,
  });
}
