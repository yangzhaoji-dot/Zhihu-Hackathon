import { NextResponse } from "next/server";
import { getZhihuOAuthConfig, hasConfiguredSecret } from "@/lib/zhihu-oauth/config";

export function GET() {
  let oauthConfigValid = false;
  try {
    getZhihuOAuthConfig();
    oauthConfigValid = true;
  } catch {
    oauthConfigValid = false;
  }
  return NextResponse.json({
    ok: true,
    oauth: {
      configValid: oauthConfigValid,
      appKeyConfigured: hasConfiguredSecret("ZHIHU_OAUTH_APP_KEY"),
      accessSecretConfigured: hasConfiguredSecret("ZHIHU_ACCESS_SECRET"),
      sessionSecretConfigured: hasConfiguredSecret("ZHIHU_OAUTH_SESSION_SECRET"),
      sessionMode: "callback-only-demo",
    },
  });
}
