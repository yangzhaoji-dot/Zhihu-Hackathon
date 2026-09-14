import { NextRequest, NextResponse } from "next/server";
import { hasConfiguredSecret, ZHIHU_SESSION_COOKIE } from "@/lib/zhihu-oauth/config";
import { fetchZhihuUserDataSample } from "@/lib/zhihu-oauth/provider";
import { readZhihuOAuthToken } from "@/lib/zhihu-oauth/session";

export async function GET(request: NextRequest) {
  if (!hasConfiguredSecret("ZHIHU_ACCESS_SECRET")) {
    return NextResponse.json({ ok: false, error: "access_secret_missing" }, { status: 503 });
  }
  const token = await readZhihuOAuthToken(request.cookies.get(ZHIHU_SESSION_COOKIE)?.value);
  if (!token) return NextResponse.json({ ok: false, error: "oauth_required" }, { status: 401 });
  const results = await fetchZhihuUserDataSample(token);
  return NextResponse.json({ ok: true, results });
}
