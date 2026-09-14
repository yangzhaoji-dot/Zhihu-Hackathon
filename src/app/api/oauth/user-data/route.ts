import { NextRequest, NextResponse } from "next/server";
import { hasConfiguredSecret, ZHIHU_SESSION_COOKIE } from "@/lib/zhihu-oauth/config";
import { readZhihuResult } from "@/lib/zhihu-oauth/cookies";

export async function GET(request: NextRequest) {
  if (!hasConfiguredSecret("ZHIHU_ACCESS_SECRET")) {
    return NextResponse.json({ ok: false, error: "access_secret_missing" }, { status: 503 });
  }
  const result = readZhihuResult(request.cookies.get(ZHIHU_SESSION_COOKIE)?.value);
  if (!result) return NextResponse.json({ ok: false, error: "oauth_required" }, { status: 401 });
  return NextResponse.json({ ok: true, results: result.results });
}
