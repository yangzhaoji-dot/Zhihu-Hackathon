import { NextRequest, NextResponse } from "next/server";
import { getZhihuOAuthConfig, hasConfiguredSecret, ZHIHU_SESSION_COOKIE } from "@/lib/zhihu-oauth/config";
import { readActiveZhihuSession } from "@/lib/zhihu-oauth/session";

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
  const session = await readActiveZhihuSession(request.cookies.get(ZHIHU_SESSION_COOKIE)?.value);
  return NextResponse.json({
    ok: true,
    connected: Boolean(session),
    configured,
    profile: session?.profile ?? null,
    expiresAt: session?.tokenExpiresAt.toISOString() ?? null,
  });
}
